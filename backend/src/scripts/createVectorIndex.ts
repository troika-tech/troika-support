import mongoose from 'mongoose';
import logger from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to create MongoDB Atlas Vector Search Index
 *
 * This script provides instructions and code to create the vector search index
 * required for RAG functionality.
 *
 * IMPORTANT: Vector indexes must be created through MongoDB Atlas UI or mongosh
 * They cannot be created through the Node.js driver.
 *
 * Usage:
 * 1. Run this script to get the connection info: npm run create-vector-index
 * 2. Follow the instructions printed to create the index in Atlas UI
 */

const VECTOR_INDEX_DEFINITION = {
  name: 'vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 1536,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'metadata.source',
      },
      {
        type: 'filter',
        path: 'metadata.category',
      },
      {
        type: 'filter',
        path: 'metadata.companyId',
      },
      {
        type: 'filter',
        path: 'metadata.tags',
      },
      {
        type: 'filter',
        path: 'isActive',
      },
    ],
  },
};

async function createVectorIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB successfully');

    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    const dbName = mongoose.connection.db.databaseName;
    const collectionName = 'knowledgedocuments';

    logger.info('\n========================================');
    logger.info('VECTOR SEARCH INDEX SETUP INSTRUCTIONS');
    logger.info('========================================\n');

    logger.info('Since vector search indexes cannot be created programmatically,');
    logger.info('please follow these steps to create the index manually:\n');

    logger.info('OPTION 1: Using MongoDB Atlas UI');
    logger.info('==================================');
    logger.info('1. Go to https://cloud.mongodb.com/');
    logger.info('2. Navigate to your cluster');
    logger.info('3. Click on "Atlas Search" tab');
    logger.info('4. Click "Create Search Index"');
    logger.info('5. Select "JSON Editor"');
    logger.info('6. Select your database:', dbName);
    logger.info('7. Select collection:', collectionName);
    logger.info('8. Paste the following JSON configuration:\n');

    console.log(JSON.stringify(VECTOR_INDEX_DEFINITION, null, 2));

    logger.info('\n9. Click "Create Search Index"');
    logger.info('10. Wait for index to be built (may take a few minutes)\n');

    logger.info('OPTION 2: Using mongosh (MongoDB Shell)');
    logger.info('=========================================');
    logger.info('1. Connect to your MongoDB Atlas cluster using mongosh');
    logger.info('2. Switch to your database:');
    logger.info(`   use ${dbName}`);
    logger.info('3. Run the following command:\n');

    const mongoshCommand = `db.${collectionName}.createSearchIndex(${JSON.stringify(VECTOR_INDEX_DEFINITION, null, 2)})`;
    console.log(mongoshCommand);

    logger.info('\n========================================');
    logger.info('VERIFICATION');
    logger.info('========================================\n');
    logger.info('After creating the index, verify it exists by running:');
    logger.info(`db.${collectionName}.getSearchIndexes()\n`);

    logger.info('The index should appear with name: "vector_index"');
    logger.info('Status should be: "READY" (may take a few minutes)\n');

    logger.info('========================================');
    logger.info('IMPORTANT NOTES');
    logger.info('========================================\n');
    logger.info('- Vector indexes require MongoDB Atlas (not available in local MongoDB)');
    logger.info('- Your cluster must be M10 or higher for Atlas Search');
    logger.info('- Index creation is free, but search queries count towards cluster usage');
    logger.info('- The index will automatically update when documents are added/modified');
    logger.info('- Embedding dimension: 1536 (text-embedding-3-small)');
    logger.info('- Similarity metric: cosine (recommended for text embeddings)\n');

    logger.info('========================================');
    logger.info('NEXT STEPS');
    logger.info('========================================\n');
    logger.info('1. Create the vector index using one of the methods above');
    logger.info('2. Run the knowledge base migration script:');
    logger.info('   npm run embed-knowledge-base');
    logger.info('3. Test the RAG system with sample queries\n');

    // Disconnect
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');

  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
createVectorIndex();
