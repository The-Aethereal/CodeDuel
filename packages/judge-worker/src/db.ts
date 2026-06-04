export { prisma } from '@codeduel/database';

prisma.$connect()
  .then(() => console.log('💾 Database: Worker securely connected to PostgreSQL'))
  .catch((err) => console.error('❌ Database: Worker connection failed', err));