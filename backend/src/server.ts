console.log('[STEP 1] Starting server.ts...');

// Load environment variables FIRST before any other imports
console.log('[STEP 2] Importing dotenv...');
import dotenv from 'dotenv';
console.log('[STEP 3] Configuring dotenv...');
dotenv.config();

// Debug: Check if API key is loaded
console.log(
  '[STEP 4] DEBUG - OPENAI_API_KEY loaded:',
  process.env.OPENAI_API_KEY
    ? `YES (starts with: ${process.env.OPENAI_API_KEY.substring(0, 10)}...)`
    : 'NO'
);

console.log('[STEP 5] Importing app...');
import app from './app';
console.log('[STEP 6] Importing database...');
import { connectDatabase } from './config/database';
console.log('[STEP 7] Importing redis...');
import { connectRedis } from './config/redis';
console.log('[STEP 8] Importing logger...');
import logger from './utils/logger';
console.log('[STEP 9] All imports complete!');

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  process.exit(0);
};

// Start server
const startServer = async () => {
  try {
    logger.info('Starting server initialization...');

    // Connect to MongoDB
    try {
      await connectDatabase();
      logger.info('✓ MongoDB connected successfully');
    } catch (error) {
      logger.error('✗ MongoDB connection failed:', error);
      logger.warn('Server will continue without MongoDB. Some features may not work.');
      // Continue anyway - you might want to throw here in production
    }

    // Connect to Redis
    try {
      await connectRedis();
      logger.info('✓ Redis connected successfully');
    } catch (error) {
      logger.error('✗ Redis connection failed:', error);
      logger.warn('Server will continue without Redis. Caching features may not work.');
      // Continue anyway - you might want to throw here in production
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.info('='.repeat(50));
      logger.info('Server initialization complete!');
      logger.info('='.repeat(50));
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
};

startServer();
