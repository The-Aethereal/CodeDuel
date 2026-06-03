import { Router } from 'express';
import { prisma } from '@codeduel/database';
import { authGuard, roleCheck } from '../middleware/authGuard';

const router = Router();

// GET /api/tags - Fetch all tags (Public/Authenticated)
router.get('/', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// POST /api/tags - Create a new tag (Admin Only)
router.post('/', authGuard, roleCheck('admin'), async (req: any, res: any) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name is required' });

    // Store tags in lowercase to maintain consistency (e.g. "dynamic programming")
    const tag = await prisma.tag.create({
      data: { name: name.toLowerCase() }
    });
    res.status(201).json(tag);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Tag already exists' });
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

export default router;