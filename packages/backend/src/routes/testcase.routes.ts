import { Router, Response } from 'express';
import { prisma } from '@codeduel/database';
import { authGuard, roleCheck, AuthRequest } from '../middleware/authGuard';

const router = Router();

// --- CREATE TEST CASE (Admin Only) ---
router.post('/', authGuard, roleCheck('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { problem_id, input_data, expected_output, is_sample, order_index } = req.body;

    if (!problem_id || input_data === undefined || expected_output === undefined) {
      res.status(400).json({ error: 'problem_id, input_data, and expected_output are required.' });
      return;
    }

    const testCase = await prisma.testCase.create({
      data: {
        problem_id,
        input_data,
        expected_output,
        is_sample: is_sample || false,
        order_index: order_index || 0,
      },
    });

    res.status(201).json({ message: 'Test case created successfully', testCase });
  } catch (error) {
    console.error('Create Test Case Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- GET TEST CASES FOR A PROBLEM ---
// Participants see only samples; Admins see all.
router.get('/problem/:problemId', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { problemId } = req.params;
    if (!problemId || problemId === 'undefined') {
      res.status(400).json({ error: 'Invalid or missing problemId parameter.' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    console.log("problemId =", problemId);
    const testCases = await prisma.testCase.findMany({
      where: {
        problem_id: problemId,
        ...(isAdmin ? {} : { is_sample: true }), // Filter for participants
      },
      orderBy: { order_index: 'asc' },
    });

    res.status(200).json(testCases);
  } catch (error) {
    console.error('Get Test Cases Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- UPDATE TEST CASE (Admin Only) ---
router.put('/:id', authGuard, roleCheck('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const testCase = await prisma.testCase.update({
      where: { id },
      data: updates,
    });

    res.status(200).json({ message: 'Test case updated successfully', testCase });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Test case not found.' });
      return;
    }
    console.error('Update Test Case Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- DELETE TEST CASE (Admin Only) ---
router.delete('/:id', authGuard, roleCheck('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.testCase.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Test case deleted successfully.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Test case not found.' });
      return;
    }
    console.error('Delete Test Case Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
