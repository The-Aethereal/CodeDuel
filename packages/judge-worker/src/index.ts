import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processSubmission } from './processors/submissionProcessor';

dotenv.config();

// Match connection variables exactly with our Express producer setup
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker('submission-queue', processSubmission, {
  connection: redisConnection,
  concurrency: 2, // Controls how many submissions this single process can run simultaneously
});

worker.on('ready', () => {
  console.log('🤖 Platform Code Evaluation Worker is live and actively listening for jobs...');
});

worker.on('active', (job) => {
  console.log(`[Worker] Job ${job.id} picked up from queue.`);
});

worker.on('completed', (job, returnvalue) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, error.message);
});