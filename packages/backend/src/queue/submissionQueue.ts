import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Required setting by BullMQ to prevent memory leaks on dropped connections
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, 
});

export const submissionQueue = new Queue('submission-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true, // Keep Redis memory footprint low
    removeOnFail: 100,      // Keep the last 100 failed jobs for debugging
    attempts: 3,            // Retry temporary worker failures up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000,
    }
  }
});

console.log('📦 BullMQ: Submission Queue Producer initialized');