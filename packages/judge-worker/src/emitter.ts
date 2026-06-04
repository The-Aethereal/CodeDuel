import { Emitter } from '@socket.io/redis-emitter';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// This emitter allows us to broadcast events to the backend's Socket.io rooms
export const socketEmitter = new Emitter(redisClient);