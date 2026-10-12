const mongoose = require('mongoose');
const { env } = require('./env');

let isConnected = false;
let retryTimer = null;

const connectDB = async (retryCount = 0) => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  // Clear any pending retry timer to prevent duplicate loops
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    const isIpOrNetworkError = 
      error.name === 'MongooseServerSelectionError' ||
      (error.message && (
        error.message.includes('SSL routines') ||
        error.message.includes('whitelist') ||
        error.message.includes('ReplicaSetNoPrimary')
      ));

    console.error(`\n[Database Connection Error]`);
    console.error(`- Error: ${error.name} - ${error.message}`);
    if (isIpOrNetworkError) {
      console.error(`- Action Required: Your current IP address is not whitelisted in MongoDB Atlas Network Access.`);
      console.error(`  Please visit https://cloud.mongodb.com/ -> Network Access -> Add Current IP Address (or 0.0.0.0/0).`);
    }

    // Schedule a background reconnection attempt with a 10s cooldown
    retryTimer = setTimeout(() => {
      console.log(`[Database] Retrying connection to MongoDB Atlas...`);
      connectDB(retryCount + 1);
    }, 10000);
  }
};

// Listen to Mongoose connection lifecycle events
mongoose.connection.on('connected', () => {
  isConnected = true;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] MongoDB disconnected. Will attempt reconnection...');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB connection error event:', err.message);
});

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, isDbConnected };
