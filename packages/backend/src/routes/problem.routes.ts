import { Router, Request, Response } from 'express';
import { prisma } from '@codeduel/database';
import { authGuard, roleCheck, AuthRequest } from '../middleware/authGuard';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/', authGuard, roleCheck('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, slug, description, input_format, output_format, constraints, difficulty, time_limit_ms, memory_limit_mb, is_published, tagIds } = req.body;

    if (!title || !slug || !description || !difficulty) {
      res.status(400).json({ error: 'Title, slug, description, and difficulty are required.' });
      return;
    }

    const problem = await prisma.problem.create({
      data: {
        title, slug, description, input_format, output_format, constraints, difficulty,
        time_limit_ms: time_limit_ms || 2000,
        memory_limit_mb: memory_limit_mb || 256,
        is_published: is_published || true,
        created_by: req.user?.id,
        tags: tagIds && tagIds.length > 0 ? {
          connect: tagIds.map((id: string) => ({ id }))
        } : undefined
      },
    });

    res.status(201).json({ message: 'Problem created successfully', problem });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A problem with this slug already exists.' });
      return;
    }
    console.error('Create Problem Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, difficulty, status, tags } = req.query;

    let uid: string | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        uid = decoded.id;
      } catch (e) {}
    }

    const w: any = { is_published: true };

    if (search) {
      w.title = { contains: String(search), mode: 'insensitive' };
    }

    if (difficulty && difficulty !== 'all') {
      w.difficulty = String(difficulty);
    }

    if (tags) {
      const ta = String(tags).split(',');
      w.tags = { some: { name: { in: ta } } };
    }

    if (status && status !== 'all' && uid) {
      if (status === 'solved') {
        w.submissions = { some: { user_id: uid, status: 'accepted' } };
      } else if (status === 'attempted') {
        w.submissions = {
          some: { user_id: uid },
          none: { user_id: uid, status: 'accepted' }
        };
      } else if (status === 'unsolved') {
        w.submissions = { none: { user_id: uid } };
      }
    }

    const problems = await prisma.problem.findMany({
      where: w,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        tags: { select: { id: true, name: true } }
      }
    });

    if (uid && problems.length > 0) {
      const problemIds = problems.map((p) => p.id);
      const userSubs = await prisma.submission.findMany({
        where: { user_id: uid, problem_id: { in: problemIds } },
        select: { problem_id: true, status: true },
      });

      const statusMap = new Map<string, 'solved' | 'attempted'>();
      for (const sub of userSubs) {
        if (sub.status === 'accepted') {
          statusMap.set(sub.problem_id, 'solved');
        } else if (statusMap.get(sub.problem_id) !== 'solved') {
          statusMap.set(sub.problem_id, 'attempted');
        }
      }

      const enriched = problems.map((p) => ({
        ...p,
        userStatus: statusMap.get(p.id) || 'unsolved',
      }));

      res.status(200).json(enriched);
      return;
    }

    res.status(200).json(problems);
  } catch (error) {
    console.error('Get Problems Error:', error);
    res.status(500).json({ error: 'Failed to fetch problems.' });
  }
});

router.get('/:slug', authGuard, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const isAdmin = req.user?.role === 'admin';

    const problem = await prisma.problem.findUnique({ where: { slug } });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found.' });
      return;
    }

    if (!problem.is_published && !isAdmin) {
      res.status(403).json({ error: 'This problem is not published yet.' });
      return;
    }

    res.status(200).json(problem);
  } catch (error) {
    console.error('Get Single Problem Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authGuard, roleCheck('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const problem = await prisma.problem.update({ where: { id }, data: updates });

    res.status(200).json({ message: 'Problem updated successfully', problem });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Problem not found.' });
      return;
    }
    console.error('Update Problem Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authGuard, roleCheck('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.problem.delete({ where: { id } });
    res.status(200).json({ message: 'Problem deleted successfully.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Problem not found.' });
      return;
    }
    console.error('Delete Problem Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;