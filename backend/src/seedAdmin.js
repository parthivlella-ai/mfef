const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditrack';

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Admin Seeder] Connected to MongoDB database successfully.');

    const adminName = process.env.ADMIN_NAME || 'MediTrack Administrator';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@meditrack.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecure2026!';

    if (!adminPassword || adminPassword.length < 6) {
      console.error('[Admin Seeder Error] ADMIN_PASSWORD must be at least 6 characters long.');
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.password = adminPassword; // Pre-save hook hashes this
      existingAdmin.role = 'admin';
      existingAdmin.status = 'active';
      await existingAdmin.save();
      console.log(`[Admin Seeder] Existing admin account (${adminEmail}) updated successfully with role "admin".`);
    } else {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        pharmacyName: 'MediTrack Central Hospital Pharmacy',
        licenseNumber: 'ADMIN-LIC-2026-001',
        status: 'active',
      });
      console.log(`[Admin Seeder] New secure admin account (${adminEmail}) created successfully.`);
    }

    console.log('[Admin Seeder] Done. Secure admin initialization complete.');
    process.exit(0);
  } catch (error) {
    console.error(`[Admin Seeder Error]: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
