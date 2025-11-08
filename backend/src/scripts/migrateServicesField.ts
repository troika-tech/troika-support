/**
 * Migration script to add 'services' field to existing KnowledgeBase and KnowledgeChunk documents
 * This script sets all existing documents to have both 'whatsapp' and 'ai_agent' services for backward compatibility
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import KnowledgeBase from '../models/KnowledgeBase.model';
import KnowledgeChunk from '../models/KnowledgeDocument.model';
import logger from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-captain';

async function migrateServicesField() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB successfully');

    // Migrate KnowledgeBase documents
    logger.info('Starting KnowledgeBase migration...');
    const kbResult = await KnowledgeBase.updateMany(
      { services: { $exists: false } }, // Only update documents that don't have services field
      { $set: { services: ['whatsapp', 'ai_agent'] } } // Set both services by default
    );
    logger.info(`KnowledgeBase migration completed: ${kbResult.modifiedCount} documents updated`);

    // Migrate KnowledgeChunk documents
    logger.info('Starting KnowledgeChunk migration...');
    const chunkResult = await KnowledgeChunk.updateMany(
      { services: { $exists: false } }, // Only update documents that don't have services field
      { $set: { services: ['whatsapp', 'ai_agent'] } } // Set both services by default
    );
    logger.info(`KnowledgeChunk migration completed: ${chunkResult.modifiedCount} documents updated`);

    // Summary
    logger.info('=== Migration Summary ===');
    logger.info(`Total KnowledgeBase documents updated: ${kbResult.modifiedCount}`);
    logger.info(`Total KnowledgeChunk documents updated: ${chunkResult.modifiedCount}`);
    logger.info('=========================');
    logger.info('Migration completed successfully!');

    // Disconnect
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateServicesField();
