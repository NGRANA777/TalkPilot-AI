const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  // If already connected, reuse existing connection (crucial for serverless execution)
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI;

  if (uri) {
    try {
      console.log('[MongoDB] Connecting to provided MONGO_URI...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('[MongoDB] Connected Successfully to standard database.');
      return mongoose.connection;
    } catch (err) {
      console.error(`[MongoDB] Connection to MONGO_URI failed: ${err.message}`);
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        console.warn('[MongoDB] Running in production/serverless environment without memory-server fallback.');
        return null;
      }
    }
  }

  // If in local development and no MONGO_URI, try local default or MongoMemoryServer fallback
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    try {
      const localUri = 'mongodb://127.0.0.1:27017/talkpilot';
      console.log(`[MongoDB] Attempting local MongoDB connection at: ${localUri}`);
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
      console.log('[MongoDB] Connected to local MongoDB.');
      return mongoose.connection;
    } catch (localErr) {
      console.warn(`[MongoDB] Local MongoDB connection failed (${localErr.message}). Starting MongoMemoryServer fallback...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!mongoMemoryServer) {
          mongoMemoryServer = await MongoMemoryServer.create();
        }
        const memUri = mongoMemoryServer.getUri();
        console.log(`[MongoDB] MongoMemoryServer started at: ${memUri}`);
        await mongoose.connect(memUri);
        console.log('[MongoDB] Connected Successfully (In-Memory DB Fallback)');
        return mongoose.connection;
      } catch (memErr) {
        console.error('[MongoDB] Failed to start MongoMemoryServer:', memErr.message);
      }
    }
  } else {
    console.warn('[MongoDB] Notice: MONGO_URI environment variable is not defined in production.');
  }

  return null;
};

module.exports = connectDB;
