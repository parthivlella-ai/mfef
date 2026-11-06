const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditrack';

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
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to database: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
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
