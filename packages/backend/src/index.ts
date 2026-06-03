import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { prisma } from '@codeduel/database';

import authRoutes from './routes/auth.routes';
import problemRoutes from './routes/problem.routes';
import submissionRoutes from './routes/submission.routes';
import testcaseRoutes from './routes/testcase.routes';
import userRoutes from './routes/user.routes';
import duelRoutes from './routes/duel.routes';
import tagRoutes from './routes/tag.routes';

dotenv.config();

const app = express();

// Create HTTP Server for Socket.io
const httpServer = http.createServer(app);

// Initialize Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000', // Next.js frontend
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup Redis Adapter for Socket.io
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new IORedis(redisUrl);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Client requests to listen to a specific submission
  socket.on('subscribe_submission', (submissionId: string) => {
    socket.join(submissionId);
    console.log(`   └─ Client ${socket.id} joined room: ${submissionId}`);
  });

  // Client unsubscribes
  socket.on('unsubscribe_submission', (submissionId: string) => {
    socket.leave(submissionId);
    console.log(`   └─ Client ${socket.id} left room: ${submissionId}`);
  });

  socket.on('join_lobby_room', (roomCode: string) => {
    socket.join(`room_${roomCode.toUpperCase()}`);
    console.log(`🔌 Socket linked to tracking channel room_${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/testcases', testcaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/duels', duelRoutes);
app.use('/api/tags', tagRoutes);

const PORT = process.env.PORT || 4000;
// Note: Use httpServer.listen instead of app.listen!
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend API & WebSockets running on http://localhost:${PORT}`);
});