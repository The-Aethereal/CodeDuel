import { Job } from 'bullmq';
import { prisma } from '../db';
import { SandboxRunner, TestCaseResult } from '../sandbox/SandboxRunner';
import { socketEmitter } from '../emitter';
import { resolveDuel } from '../services/duel.service';


interface SubmissionJobData {
  submissionId: string;
  problemId: string;
  language: string;
  sourceCode: string;
  duelCode?: string;
  userId?: string;
}

export const processSubmission = async (job: Job<SubmissionJobData>) => {
  const { submissionId, problemId, language, sourceCode, duelCode, userId } = job.data;

  try {
    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'running' } });
    socketEmitter.to(submissionId).emit('submission_update', { submissionId, status: 'running' });

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { test_cases: { orderBy: { order_index: 'asc' } } },
    });

    if (!problem || problem.test_cases.length === 0) throw new Error('Invalid problem state');

    let passedCases = 0;

    const result = await SandboxRunner.run(
      language,
      sourceCode,
      problem.test_cases,
      problem.time_limit_ms,
      problem.memory_limit_mb,
      async (testResult: TestCaseResult) => {
        await prisma.submissionTestResult.create({
          data: {
            submission_id: submissionId,
            test_case_id: testResult.testCaseId,
            status: testResult.verdict,
            exec_time_ms: testResult.execTimeMs,
            memory_used_mb: testResult.memoryUsedMb,
            actual_output: testResult.actualOutput,
            order_index: testResult.orderIndex,
          }
        });

        if (testResult.verdict === 'accepted') passedCases++;

        socketEmitter.to(submissionId).emit('test_case_update', {
          submissionId,
          testIndex: testResult.orderIndex + 1,
          totalTests: problem.test_cases.length,
          verdict: testResult.verdict,
          execTimeMs: testResult.execTimeMs,
        });

        if (duelCode && userId) {
          socketEmitter.to(`room_${duelCode.toUpperCase()}`).emit('opponent_progress', {
            userId,
            passedTests: passedCases,
            totalTests: problem.test_cases.length,
          });
        }
      }
    );

    const finalScore = Math.floor((passedCases / problem.test_cases.length) * 100);

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: result.verdict,
        exec_time_ms: result.execTimeMs,
        memory_used_mb: result.memoryUsedMb,
        score: finalScore,
      },
    });

    socketEmitter.to(submissionId).emit('submission_update', {
      submissionId,
      status: result.verdict,
      exec_time_ms: result.execTimeMs,
      memory_used_mb: result.memoryUsedMb,
      score: finalScore,
      passedCases,
      totalCases: problem.test_cases.length
    });

    if (result.verdict === 'accepted' && duelCode && userId) {
      const room = await prisma.duelRoom.findUnique({
        where: { code: duelCode },
      });
      if (room && room.status === 'ONGOING') {
        await resolveDuel(room.id, userId);
      }
    }

    return { success: true, verdict: result.verdict };

  } catch (error: any) {
    console.error(`   ❌ Critical crash in processing pipeline for job ${job.id}:`, error);
    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'internal_error' },
      });
      socketEmitter.to(submissionId).emit('submission_update', {
        submissionId,
        status: 'internal_error',
      });
    } catch (e) {}
    throw error;
  }
};