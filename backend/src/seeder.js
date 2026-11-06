const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure reliable DNS servers for MongoDB Atlas SRV lookup resilience
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignored if custom DNS servers cannot be set
}

dotenv.config();

const User = require('./models/User');
const Medicine = require('./models/Medicine');
const ActivityLog = require('./models/ActivityLog');
const mockStore = require('./utils/mockStore');

const seedData = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditrack';

    // Auto-sanitize accidental angle brackets around passwords: :<password>@ -> :password@
    if (mongoUri.includes(':<') && mongoUri.includes('>@')) {
      mongoUri = mongoUri.replace(/:<([^>]+)>@/, ':$1@');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('[Seeder] Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany();
    await Medicine.deleteMany();
    await ActivityLog.deleteMany();
    console.log('[Seeder] Cleared existing data.');

    // Admin Credentials from Environment Variables
    const adminName = process.env.ADMIN_NAME || 'MediTrack Administrator';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@meditrack.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecure2026!';

    // Create Admin User
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      phone: '+1 (555) 019-9000',
      pharmacyName: 'MediTrack Central Hospital Pharmacy',
      licenseNumber: 'ADMIN-LIC-2026-001',
      status: 'active',
    });

    // Create Standard User
    const standardUser = await User.create({
      name: 'Dr. Alex Rivera',
      email: 'user@meditrack.com',
      password: 'UserSecure2026!',
      role: 'user',
      phone: '+1 (555) 438-9921',
      pharmacyName: 'Community Clinic Pharmacy',
      licenseNumber: 'RPH-99283-NY',
      status: 'active',
    });

    console.log(`[Seeder] Seeded users: Admin (${adminUser.email}) and Standard User (${standardUser.email}).`);

    // Helper date functions
    const addDays = (d) => new Date(Date.now() + d * 86400000);
    const subDays = (d) => new Date(Date.now() - d * 86400000);

    // Realistic medicines with specific expiry windows:
    // Expired (< 0), Expiring within 7 days, Expiring within 30 days, Low Stock (< threshold), Safe (> 30 days)
    const seedMedicinesList = [
      {
        name: 'Amoxicillin 500mg',
        category: 'Antibiotics',
        brand: 'Amoxil (GSK)',
        batchNumber: 'AMX-2026-001',
        quantity: 85,
        unit: 'Capsules',
        purchaseDate: subDays(120),
        expiryDate: addDays(4), // Expiring in 4 days! (< 7 days)
        price: 18.5,
        description: 'Broad-spectrum antibiotic for bacterial infections.',
        minStockLevel: 15,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack A-1, Shelf 2',
      },
      {
        name: 'Azithromycin 250mg',
        category: 'Antibiotics',
        brand: 'Zithromax (Pfizer)',
        batchNumber: 'AZT-2026-002',
        quantity: 6, // Low Stock (< 10 threshold)!
        unit: 'Tablets',
        purchaseDate: subDays(90),
        expiryDate: addDays(22), // Expiring in 22 days (< 30 days)
        price: 32.0,
        description: 'Macrolide antibiotic for respiratory tract infections.',
        minStockLevel: 15,
        storageCondition: 'Protect from Light',
        rackLocation: 'Rack A-2, Shelf 1',
      },
      {
        name: 'Paracetamol 650mg',
        category: 'Analgesics',
        brand: 'Panadol (Haleon)',
        batchNumber: 'PCM-2026-003',
        quantity: 420,
        unit: 'Tablets',
        purchaseDate: subDays(45),
        expiryDate: addDays(380), // Safe (> 1 year)
        price: 4.5,
        description: 'Analgesic and antipyretic for mild to moderate pain.',
        minStockLevel: 25,
        storageCondition: 'Cool & Dry Place',
        rackLocation: 'Rack B-1, Shelf 3',
      },
      {
        name: 'Ibuprofen 400mg',
        category: 'Analgesics',
        brand: 'Advil (Pfizer)',
        batchNumber: 'IBU-2025-004',
        quantity: 30,
        unit: 'Tablets',
        purchaseDate: subDays(400),
        expiryDate: subDays(12), // EXPIRED (12 days ago)!
        price: 8.0,
        description: 'NSAID anti-inflammatory analgesic.',
        minStockLevel: 10,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Quarantine Bin Q-1',
      },
      {
        name: 'Metformin 500mg ER',
        category: 'Antidiabetic',
        brand: 'Glucophage (Merck)',
        batchNumber: 'MET-2026-005',
        quantity: 190,
        unit: 'Tablets',
        purchaseDate: subDays(80),
        expiryDate: addDays(410), // Safe
        price: 12.0,
        description: 'First-line medication for type 2 diabetes.',
        minStockLevel: 20,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack C-1, Shelf 4',
      },
      {
        name: 'Salbutamol Inhaler 100mcg',
        category: 'Respiratory',
        brand: 'Ventolin (GSK)',
        batchNumber: 'SLB-2026-006',
        quantity: 4, // Critical Low stock!
        unit: 'Inhaler',
        purchaseDate: subDays(60),
        expiryDate: addDays(260), // Safe expiry, but low stock
        price: 42.0,
        description: 'Fast-acting bronchodilator for asthma relief.',
        minStockLevel: 12,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack R-1, Shelf 1',
      },
      {
        name: 'Dextromethorphan Syrup 100ml',
        category: 'Respiratory',
        brand: 'Benylin (J&J)',
        batchNumber: 'DXM-2026-007',
        quantity: 18,
        unit: 'Syrup Bottle',
        purchaseDate: subDays(200),
        expiryDate: addDays(6), // Expiring in 6 days! (< 7 days)
        price: 16.5,
        description: 'Cough suppressant syrup for dry non-productive cough.',
        minStockLevel: 10,
        storageCondition: 'Room Temperature (15-25°C)',
        rackLocation: 'Rack S-2, Shelf 2',
      },
      {
        name: 'Insulin Glargine 100 IU/mL',
        category: 'Antidiabetic',
        brand: 'Lantus (Sanofi)',
        batchNumber: 'INS-2026-008',
        quantity: 24,
        unit: 'Injection Vial',
        purchaseDate: subDays(30),
        expiryDate: addDays(180), // Safe
        price: 95.0,
        description: 'Long-acting insulin analogue for glycemic control.',
        minStockLevel: 8,
        storageCondition: 'Refrigerated (2-8°C)',
        rackLocation: 'Cold Vault Fridge 02',
      },
    ];

    // Seed medicines partitioned between standard user and admin
    // User gets first 6 medicines, admin gets medicines as well
    const medicinesToSeed = [];

    seedMedicinesList.forEach((m, idx) => {
      // First 5 belong to standardUser
      const owner = idx < 5 ? standardUser._id : adminUser._id;
      medicinesToSeed.push({
        ...m,
        userId: owner,
        createdBy: owner,
      });
    });

    // Also add a couple more specifically for standard user
    medicinesToSeed.push({
      name: 'Cetirizine 10mg',
      category: 'Antihistamines',
      brand: 'Zyrtec (J&J)',
      batchNumber: 'CET-2026-009',
      quantity: 120,
      unit: 'Tablets',
      purchaseDate: subDays(40),
      expiryDate: addDays(500),
      price: 9.0,
      description: 'Second-generation antihistamine for seasonal allergy relief.',
      minStockLevel: 20,
      storageCondition: 'Cool & Dry Place',
      rackLocation: 'Rack B-4, Shelf 1',
      userId: standardUser._id,
      createdBy: standardUser._id,
    });

    medicinesToSeed.push({
      name: 'Ciprofloxacin Eye Drops 0.3%',
      category: 'Antibiotics',
      brand: 'Ciloxan (Novartis)',
      batchNumber: 'CIP-2025-010',
      quantity: 15,
      unit: 'Drops Bottle',
      purchaseDate: subDays(350),
      expiryDate: subDays(5), // EXPIRED (5 days ago)!
      price: 14.0,
      description: 'Antibacterial ophthalmic solution.',
      minStockLevel: 10,
      storageCondition: 'Room Temperature (15-25°C)',
      rackLocation: 'Quarantine Bin Q-2',
      userId: standardUser._id,
      createdBy: standardUser._id,
    });

    const createdMedicines = await Medicine.insertMany(medicinesToSeed);
    console.log(`[Seeder] Seeded ${createdMedicines.length} medicines.`);

    // Seed Activity Logs
    const logsToSeed = [
      {
        action: 'MEDICINE_CREATED',
        title: 'Initial Dispensary Stock Initialized',
        description: 'Sample medicine batches configured with expiry timestamps.',
        user: {
          id: adminUser._id,
          name: adminUser.name,
          role: adminUser.role,
          email: adminUser.email,
        },
        severity: 'success',
        createdAt: new Date(),
      },
    ];

    await ActivityLog.insertMany(logsToSeed);
    console.log('[Seeder] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error]: ${error.message}`);
    process.exit(1);
  }
};

seedData();
