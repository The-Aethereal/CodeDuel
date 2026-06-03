import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@codeduel/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key';
const JWT_EXPIRES_IN = '15m'; // Short-lived access token
const REFRESH_EXPIRES_IN_DAYS = 7;

// --- SIGNUP ---
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Email, username, and password are required.' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email or username already in use.' });
      return;
    }

    // Hash password & create user
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password_hash,
      },
    });

    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: user.id, username: user.username, role: user.role } 
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// --- LOGIN ---
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // Generate Access Token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate & Store Refresh Token (as per architecture spec)
    const refreshTokenId = uuidv4();
    const refreshTokenString = uuidv4(); // In practice, use a secure random string
    const hashedRefreshToken = await bcrypt.hash(refreshTokenString, 10);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_IN_DAYS);

    await prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        user_id: user.id,
        token_hash: hashedRefreshToken,
        expires_at: expiresAt,
      },
    });

    res.status(200).json({
      accessToken,
      refreshToken: refreshTokenString, // Send raw token to client once
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

export default router;
