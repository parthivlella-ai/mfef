const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers for SRV resolution (MongoDB Atlas)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

// Production cloud database fallback for instant Render/Vercel cloud deployments
const CLOUD_ATLAS_URI = 'mongodb+srv://parthivlella_db_user:XZqqGYmGeqTfGUrF@cluster1.wxjdhbc.mongodb.net/meditrack?retryWrites=true&w=majority';

let isConnected = false;

const connectDB = async () => {
  // If already connected, reuse existing connection (vital for serverless/containers)
  if (mongoose.connection.readyState >= 1) {
    isConnected = true;
    return mongoose.connection;
  }

  try {
    let mongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';

    // If running in production and no URI is specified or localhost was mistakenly supplied in cloud
    if (!mongoUri || (process.env.NODE_ENV === 'production' && (mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost')))) {
      mongoUri = process.env.NODE_ENV === 'production' ? CLOUD_ATLAS_URI : 'mongodb://127.0.0.1:27017/meditrack';
    }

    // Clean any accidental brackets like <password> in connection string
    mongoUri = mongoUri.replace(/<([^>]+)>/g, '$1');

    mongoose.set('strictQuery', false);

    // Set up MongoDB connection lifecycle event listeners
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[MongoDB] Database disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('[MongoDB] Database reconnected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Runtime Error]: ${err.message}`);
    });

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to database: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.warn(`[MongoDB] Tip: Ensure MongoDB service is running on 127.0.0.1:27017 or check MONGO_URI in backend/.env`);
  }
};

const getDbStatus = () => ({
  connected: isConnected && mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  host: isConnected ? `${mongoose.connection.host}:${mongoose.connection.port}` : 'Offline',
  name: isConnected ? mongoose.connection.name : 'meditrack',
});

module.exports = { connectDB, getDbStatus };
