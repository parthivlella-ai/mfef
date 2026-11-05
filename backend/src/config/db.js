const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditrack';
    
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.error(`[MongoDB] Connection Notice: ${error.message}`);
    console.warn(`[MongoDB] Tip: Ensure MongoDB service is running or provide a cloud MONGO_URI in backend/.env`);
    console.warn(`[MongoDB] In-memory fallback mode is enabled so all features remain functional for preview & testing.`);
  }
};

const getDbStatus = () => ({
  connected: isConnected && mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  host: isConnected ? mongoose.connection.host : 'Offline (In-Memory Fallback Active)',
  name: isConnected ? mongoose.connection.name : 'meditrack_preview',
});

module.exports = { connectDB, getDbStatus };

