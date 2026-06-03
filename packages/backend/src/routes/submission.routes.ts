import { Router, Response } from 'express';
import { prisma } from '@codeduel/database';
import { authGuard, AuthRequest } from '../middleware/authGuard';
import { submissionQueue } from '../queue/submissionQueue'; // <-- Import Queue

const router = Router();

// --- CREATE SUBMISSION & ENQUEUE ---
router.post('/', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { problem_id, language, source_code , duel_code} = req.body;

    if (!problem_id || !language || !source_code) {
      res.status(400).json({ error: 'problem_id, language, and source_code are required.' });
      return;
    }

    const problem = await prisma.problem.findUnique({ where: { id: problem_id } });
    if (!problem) {
      res.status(404).json({ error: 'Problem not found.' });
      return;
    }

    // 1. Save to DB with 'queued' status
    const submission = await prisma.submission.create({
      data: {
        user_id: req.user?.id,
        problem_id,
        language,
        source_code,
        status: 'queued', // Updated from 'pending'
      },
    });

    // 2. Push job to the Redis queue for the Worker to pick up
    await submissionQueue.add('evaluate-code', {
      submissionId: submission.id,
      problemId: problem_id,
      language,
      sourceCode: source_code,
      duelCode: duel_code,
      userId: req.user?.id,
    });

    // 3. Log activity for the Heatmap (from Phase 2)
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          user_id: req.user.id,
          problem_id,
          event_type: 'submission',
          event_date: new Date(),
        }
      });
    }

    res.status(201).json({
      message: 'Submission received and queued successfully.',
      submission_id: submission.id,
      status: submission.status
    });
  } catch (error) {
    console.error('Create Submission Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ... (Rest of the file remains exactly the same: /my-submissions, /problem/:problemId, /:id) ...

// --- GET ALL SUBMISSIONS FOR CURRENT USER ---
router.get('/my-submissions', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { user_id: req.user?.id },
      select: {
        id: true,
        language: true,
        status: true,
        score: true,
        exec_time_ms: true,
        memory_used_mb: true,
        submitted_at: true,
        problem: { select: { title: true, slug: true } }
      },
      orderBy: { submitted_at: 'desc' },
      take: 50, // Pagination can be added later
    });

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get My Submissions Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- GET SUBMISSIONS FOR A SPECIFIC PROBLEM ---
router.get('/problem/:problemId', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { problemId } = req.params;

    const submissions = await prisma.submission.findMany({
      where: { 
        user_id: req.user?.id,
        problem_id: problemId
      },
      select: {
        id: true,
        language: true,
        status: true,
        exec_time_ms: true,
        memory_used_mb: true,
        submitted_at: true,
      },
      orderBy: { submitted_at: 'desc' },
    });

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get Problem Submissions Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- GET SINGLE SUBMISSION DETAILS ---
router.get('/:id', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        problem: {
          select: { title: true, slug: true }
        }
      }
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }

    // Security check: Only the author or an admin can view the source code
    if (submission.user_id !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view this submission.' });
      return;
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error('Get Single Submission Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;



