import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import os from 'os';

const docker =
  process.platform === 'win32'
    ? new Docker({ socketPath: '\\\\.\\pipe\\docker_engine' })
    : new Docker({ socketPath: '/var/run/docker.sock' });

export interface ExecutionResult {
  verdict: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compile_error';
  execTimeMs: number;
  memoryUsedMb: number;
  errorLog?: string;
  outputData?: string;
}

export interface TestCaseResult {
  testCaseId: string;
  orderIndex: number;
  verdict: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compile_error';
  execTimeMs: number;
  memoryUsedMb: number;
  actualOutput?: string;
}

export class SandboxRunner {
  static async run(
    language: string,
    sourceCode: string,
    testCases: Array<{ id: string; input_data: string; expected_output: string }>,
    timeLimitMs: number,
    memoryLimitMb: number,
    onTestCaseComplete: (result: TestCaseResult) => Promise<void> // <-- NEW CALLBACK
  ): Promise<ExecutionResult> {
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-'));
    
    try {
      // 2. Write source code file and define images/commands
      let imageName = 'judge-python';
      let sourceFileName = 'solution.py';
      let runCmd = ['sh', '-c', `python3 solution.py < input.txt > output.txt 2> error.txt`];
      let needsCompilation = false;

      if (language === 'cpp') {
        imageName = 'judge-cpp';
        sourceFileName = 'solution.cpp';
        runCmd = ['sh', '-c', `./solution < input.txt > output.txt 2> error.txt`];
        needsCompilation = true;
      }

      fs.writeFileSync(path.join(tempDir, sourceFileName), sourceCode);
      // Give the unprivileged container user permission to read/write in this directory
      fs.chmodSync(tempDir, 0o777);
      fs.chmodSync(path.join(tempDir, sourceFileName), 0o777);

      // 3. Handle Compilation if required (e.g. C++)
      if (needsCompilation) {
        const compileResult = await this.compileCpp(tempDir);
        if (compileResult.verdict === 'compile_error') {
          return compileResult;
        }
      }
      let totalTimeMs = 0;
      let maxMemoryMb = 0;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        
        fs.writeFileSync(path.join(tempDir, 'input.txt'), tc.input_data);
        fs.chmodSync(path.join(tempDir, 'input.txt'), 0o777);

        if (fs.existsSync(path.join(tempDir, 'output.txt'))) fs.unlinkSync(path.join(tempDir, 'output.txt'));
        if (fs.existsSync(path.join(tempDir, 'error.txt'))) fs.unlinkSync(path.join(tempDir, 'error.txt'));

        const singleResult = await this.executeContainer(imageName, runCmd, tempDir, timeLimitMs, memoryLimitMb);
        
        totalTimeMs = Math.max(totalTimeMs, singleResult.execTimeMs);
        maxMemoryMb = Math.max(maxMemoryMb, singleResult.memoryUsedMb);

        let testVerdict = singleResult.verdict;
        let userOutput = fs.existsSync(path.join(tempDir, 'output.txt'))
          ? fs.readFileSync(path.join(tempDir, 'output.txt'), 'utf-8')
          : '';

        // If execution succeeded, verify the actual output
        if (testVerdict === 'accepted') {
          if (userOutput.trim() !== tc.expected_output.trim()) {
            testVerdict = 'wrong_answer';
          }
        }

        // Fire the callback to the processor
        await onTestCaseComplete({
          testCaseId: tc.id,
          orderIndex: i,
          verdict: testVerdict as any,
          execTimeMs: singleResult.execTimeMs,
          memoryUsedMb: singleResult.memoryUsedMb,
          actualOutput: userOutput.substring(0, 1000), // Truncate to prevent massive DB logs
        });

        // Short-circuit on failure (Standard competitive programming behavior)
        if (testVerdict !== 'accepted') {
          return {
            verdict: testVerdict,
            execTimeMs: totalTimeMs,
            memoryUsedMb: maxMemoryMb,
          };
        }
      }

      return { verdict: 'accepted', execTimeMs: totalTimeMs, memoryUsedMb: maxMemoryMb };

    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
    
  }

  /**
   * Runs the C++ compiler in an isolated shell container
   */
  private static async compileCpp(tempDir: string): Promise<ExecutionResult> {
    const compileCmd = ['sh', '-c', 'g++ -O3 solution.cpp -o solution 2> compile_error.txt'];
    
    const container = await docker.createContainer({
      Image: 'judge-cpp',
      Cmd: compileCmd,
      HostConfig: {
        Binds: [`${tempDir}:/sandbox`],
        NetworkMode: 'none',
      },
    });

    await container.start();
    await container.wait();
    await container.remove();

    const errorPath = path.join(tempDir, 'compile_error.txt');
    if (fs.existsSync(errorPath) && fs.readFileSync(errorPath, 'utf-8').trim().length > 0) {
      return {
        verdict: 'compile_error',
        execTimeMs: 0,
        memoryUsedMb: 0,
        errorLog: fs.readFileSync(errorPath, 'utf-8'),
      };
    }

    return { verdict: 'accepted', execTimeMs: 0, memoryUsedMb: 0 };
  }

  /**
   * Spawns an ephemeral runtime container with strict hardware limitations
   */
  private static async executeContainer(
    imageName: string,
    cmd: string[],
    tempDir: string,
    timeLimitMs: number,
    memoryLimitMb: number
  ): Promise<ExecutionResult> {
    
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: cmd,
      HostConfig: {
        Binds: [`${tempDir}:/sandbox`],
        Memory: memoryLimitMb * 1024 * 1024, // Enforce strict RAM constraints
        MemorySwap: memoryLimitMb * 1024 * 1024, // Fully block swap disk allocation
        NetworkMode: 'none', // Disallow internet and network interfaces
      },
    });

    const startTime = Date.now();
    await container.start();

    let killedByTimeout = false;
    
    // Watchdog Timer to enforce Time Limit Exceeded (TLE)
    const timeoutTimer = setTimeout(async () => {
      killedByTimeout = true;
      try {
        await container.kill();
      } catch (e) {}
    }, timeLimitMs);

    try {
      const waitData = await container.wait();
      clearTimeout(timeoutTimer);

      const execTimeMs = Date.now() - startTime;

      // Inspect container specs to determine if kernel-level OOM killer struck
      const inspectData = await container.inspect();
      const oomKilled = inspectData.State.OOMKilled;

      if (killedByTimeout) {
        return { verdict: 'time_limit_exceeded', execTimeMs: timeLimitMs, memoryUsedMb: 0 };
      }

      if (oomKilled) {
        return { verdict: 'memory_limit_exceeded', execTimeMs, memoryUsedMb: memoryLimitMb };
      }

      // Check exit statuses
      if (waitData.StatusCode !== 0) {
        const runtimeErrLog = fs.existsSync(path.join(tempDir, 'error.txt'))
          ? fs.readFileSync(path.join(tempDir, 'error.txt'), 'utf-8')
          : 'Runtime Error';
        return {
          verdict: 'runtime_error',
          execTimeMs,
          memoryUsedMb: 0,
          errorLog: runtimeErrLog,
        };
      }

      return {
        verdict: 'accepted',
        execTimeMs,
        memoryUsedMb: 12.5, // Baseline memory allocation reference
      };

    } catch (error) {
      clearTimeout(timeoutTimer);
      throw error;
    } finally {
      // Always safely strip away the container allocation blocks
      try {
        await container.remove();
      } catch (e) {}
    }
  }
}