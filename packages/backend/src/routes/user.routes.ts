import { Router, Response } from 'express';
import { prisma } from '@codeduel/database';
import { authGuard, AuthRequest } from '../middleware/authGuard';

const router = Router();

// --- GET USER PROFILE, STATS & ACTIVITY ---
router.get('/:username/profile', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    // 1. Get Basic User Info
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        avatar_url: true,
        created_at: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // 2. Get Submission Stats
    const totalSubmissions = await prisma.submission.count({
      where: { user_id: user.id }
    });

    const acceptedSubmissions = await prisma.submission.count({
      where: { user_id: user.id, status: 'accepted' }
    });

    const accuracy = totalSubmissions > 0 
      ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1) 
      : 0;

    // 3. Aggregate Activity Log for Heatmap
    // We group by event_date (which was truncated to Date in DB)
    const activities = await prisma.activityLog.findMany({
      where: { user_id: user.id },
      select: { event_date: true }
    });

    const activityMap: Record<string, number> = {};
    activities.forEach(log => {
      // Format as YYYY-MM-DD
      const dateStr = log.event_date.toISOString().split('T')[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    // 4. Get Recent Submissions
    const recentSubmissions = await prisma.submission.findMany({
      where: { user_id: user.id },
      include: {
        problem: { select: { title: true, slug: true } }
      },
      orderBy: { submitted_at: 'desc' },
      take: 10,
    });

    res.status(200).json({
      user,
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        accuracy,
      },
      activityMap,
      recentSubmissions
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
