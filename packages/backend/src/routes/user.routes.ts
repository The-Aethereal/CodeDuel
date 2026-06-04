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

    // 5. Compute submission streak (consecutive days with accepted submissions)
    const acceptedSubmissionDates = await prisma.submission.findMany({
      where: { user_id: user.id, status: 'accepted' },
      select: { submitted_at: true },
      orderBy: { submitted_at: 'desc' },
    });

    const uniqueAcceptedDays = new Set<string>();
    acceptedSubmissionDates.forEach((s) => {
      uniqueAcceptedDays.add(s.submitted_at.toISOString().split('T')[0]);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let streak = 0;
    if (uniqueAcceptedDays.has(todayStr) || uniqueAcceptedDays.has(yesterdayStr)) {
      const cursor = uniqueAcceptedDays.has(todayStr) ? new Date(today) : new Date(yesterday);
      while (uniqueAcceptedDays.has(cursor.toISOString().split('T')[0])) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    res.status(200).json({
      user,
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        accuracy,
        streak,
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
