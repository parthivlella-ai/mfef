const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers for MongoDB Atlas SRV lookup resilience
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignored if custom DNS servers cannot be set in sandbox
}

let isConnected = false;

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditrack';

    // Auto-sanitize accidental angle brackets around passwords if pasted from Atlas snippets: :<password>@ -> :password@
    if (mongoUri.includes(':<') && mongoUri.includes('>@')) {
      mongoUri = mongoUri.replace(/:<([^>]+)>@/, ':$1@');
    }

    mongoose.set('strictQuery', false);

    // Set up MongoDB connection lifecycle event listeners
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[MongoDB] Database connection disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('[MongoDB] Database connection reconnected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Runtime Error]: ${err.message}`);
    });

    // Connect with Atlas-recommended connection options
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10s timeout for cloud handshake
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`[MongoDB Atlas] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.error(`[MongoDB Connection Notice]: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error(`[MongoDB Atlas Deployment Alert]:`);
      console.error(`  - Could not establish connection to MongoDB Atlas.`);
      console.error(`  - Ensure MONGO_URI in Render dashboard is set with correct username and password.`);
      console.error(`  - Ensure MongoDB Atlas > Network Access has '0.0.0.0/0' whitelisted.`);
    } else {
      console.warn(`[MongoDB] Tip: Ensure MongoDB service is running or provide a cloud MONGO_URI in .env`);
      console.warn(`[MongoDB] In-memory fallback mode is enabled so all features remain functional for preview & testing.`);
    }
  }
};

const getDbStatus = () => ({
  connected: isConnected && mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  host: isConnected ? mongoose.connection.host : 'Offline (In-Memory Fallback Active)',
  name: isConnected ? mongoose.connection.name : 'meditrack_preview',
});

module.exports = { connectDB, getDbStatus };
