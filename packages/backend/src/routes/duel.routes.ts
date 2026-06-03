import { Router } from 'express';
import { prisma } from '@codeduel/database';
import { authGuard } from '../middleware/authGuard'; // Ensure this points to your auth middleware
import { io } from '../index'; // We will export 'io' from your index file to handle socket messages

const router = Router();

// Helper to generate a unique, clean 6-digit alphanumeric room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 1. CREATE DUEL ROOM
router.post('/create', authGuard, async (req: any, res: any) => {
  try {
    const { difficulty, duration_mins } = req.body;
    const userId = req.user.id;

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty tier' });
    }

    const code = generateRoomCode();

    const room = await prisma.duelRoom.create({
      data: {
        code,
        difficulty,
        duration_mins: parseInt(duration_mins, 10) || 30,
        creator_id: userId,
        status: 'WAITING',
        participants: {
          create: { user_id: userId }
        }
      },
      include: {
        participants: { include: { user: { select: { username: true } } } }
      }
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize duel room' });
  }
});

// 2. JOIN DUEL ROOM
router.post('/join', authGuard, async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const room = await prisma.duelRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { participants: true }
    });

    if (!room) return res.status(404).json({ error: 'Duel room not found' });
    if (room.status !== 'WAITING') return res.status(400).json({ error: 'Duel has already started or finished' });

    // Prevent duplicate entries
    const existingParticipant = room.participants.find(p => p.user_id === userId);
    
    if (!existingParticipant) {
      await prisma.duelParticipant.create({
        data: { room_id: room.id, user_id: userId }
      });
    }

    // Fetch refreshed participant layout to broadcast
    const updatedRoom = await prisma.duelRoom.findUnique({
      where: { id: room.id },
      include: { participants: { include: { user: { select: { username: true } } } } }
    });

    // Alert other users in this socket channel room
    io.to(`room_${room.code}`).emit('lobby_update', updatedRoom?.participants);

    res.json({ success: true, code: room.code });
  } 
    catch (error: any) {
  console.error('========== JOIN ERROR ==========');
  console.error(error);
  console.error('message:', error?.message);
  console.error('code:', error?.code);
  console.error('meta:', error?.meta);
  console.error('stack:', error?.stack);

  res.status(500).json({
    error: 'Failed to join duel room',
    details: error?.message
  });
}
});

// 3. GET ROOM LOBBY DETAILS
router.get('/room/:code', authGuard, async (req: any, res: any) => {
  try {
    const room = await prisma.duelRoom.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: { 
        participants: { include: { user: { select: { id: true, username: true } } } },
        problem: { select: { slug: true } }
      }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Internal system failure fetching room metadata' });
  }
});

// 4. START DUEL & AUTOMATED PROBLEM SELECTION ALGORITHM
router.post('/room/:code/start', authGuard, async (req: any, res: any) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    const room = await prisma.duelRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { participants: true }
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creator_id !== userId) return res.status(403).json({ error: 'Only the room master can start the match' });
    if (room.status !== 'WAITING') return res.status(400).json({ error: 'Duel has already initiated' });

    const participantUserIds = room.participants.map(p => p.user_id);

    // Rule A: Fetch candidate pool matching selected difficulty tier
    const candidateProblems = await prisma.problem.findMany({
      where: { difficulty: room.difficulty, is_published: true },
      select: { id: true, slug: true }
    });

    // Rule B & C: Track all problem sets solved by AT LEAST ONE player in the room
    const solvedSubmissions = await prisma.submission.findMany({
      where: {
        user_id: { in: participantUserIds },
        status: 'accepted'
      },
      select: { problem_id: true }
    });

    const solvedProblemIds = new Set(solvedSubmissions.map(s => s.problem_id));

    // Filter candidate pool to find fully untouched algorithms
    const eligibleProblems = candidateProblems.filter(p => !solvedProblemIds.has(p.id));

    // Rule E: Short circuit if no matching problems match criteria
    if (eligibleProblems.length === 0) {
      return res.status(400).json({
        error: 'Algorithmic Standstill: No unique problems remain that all players haven\'t solved. Adjust room difficulty!'
      });
    }

    // Rule D: Uniformly random selection
    const selectedProblem = eligibleProblems[Math.floor(Math.random() * eligibleProblems.length)];

    // Advance room state to Active
    await prisma.duelRoom.update({
      where: { id: room.id },
      data: {
        status: 'ONGOING',
        problem_id: selectedProblem.id,
        started_at: new Date()
      }
    });

    // Command room socket connection to perform an automated client redirect
    io.to(`room_${room.code}`).emit('duel_started', { problemSlug: selectedProblem.slug });

    res.json({ success: true, problemSlug: selectedProblem.slug });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute challenge allocation matrix' });
  }
});

// GET /api/duels/room/:code/summary - Fetch Post-Game Statistics
router.get('/room/:code/summary', authGuard, async (req: any, res: any) => {
  try {
    const { code } = req.params;

    const room = await prisma.duelRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, duel_elo: true } } }
        },
        submissions: {
          orderBy: { submitted_at: 'desc' } // Gets their latest code submissions first
        },
        problem: true
      }
    });

    if (!room) return res.status(404).json({ error: 'Duel room tracking log expired' });
    if (room.status !== 'FINISHED') return res.status(400).json({ error: 'This match is still active' });

    // Fetch the rating shifts that were generated during resolution
    const ratingShifts = await prisma.matchHistory.findMany({
      where: { room_id: room.id }
    });

    // Format metrics per player
    const playerSummaries = room.participants.map(p => {
      const userSubmissions = room.submissions.filter(s => s.user_id === p.user_id);
      
      // Find their successful run, fallback to their highest-scoring run
      const bestSubmission = userSubmissions.find(s => s.status === 'accepted') || userSubmissions[0];
      const shiftDoc = ratingShifts.find(s => s.user_id === p.user_id);

      return {
        id: p.user.id,
        username: p.user.username,
        isWinner: room.winner_id === p.user.id,
        eloShift: shiftDoc ? shiftDoc.elo_change : 0,
        newElo: shiftDoc ? shiftDoc.new_elo : p.user.duel_elo,
        hasSubmitted: !!bestSubmission,
        code: bestSubmission?.source_code || '// No code submitted during this duel',
        language: bestSubmission?.language || 'javascript',
        runtime: bestSubmission?.exec_time_ms ?? 'N/A',
        memory: bestSubmission?.memory_used_mb ?? 'N/A',
        status: bestSubmission?.status || 'no_submission'
      };
    });

    res.json({
      problemTitle: room.problem?.title,
      duration: room.duration_mins,
      players: playerSummaries
    });
  } catch (error: any) {
    console.error('Duel summary aggregation error:', error);
    res.status(500).json({ error: error?.message || 'Failed to aggregate post-game reporting sheets' });
  }
});

export default router;