const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const User = require('./models/User');
const Medicine = require('./models/Medicine');
const ActivityLog = require('./models/ActivityLog');
const mockStore = require('./utils/mockStore');

const seedData = async () => {
  try {
    let mongoUri = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditrack').trim();
    mongoUri = mongoUri.replace(/<([^>]+)>/g, '$1');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('[Seeder] Connected to MongoDB database successfully.');

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
      pharmacyName: 'MediTrack Central Pharmacy',
      licenseNumber: 'PHA-ADMIN-2026',
      phone: '+1 (555) 019-2831',
      status: 'active',
    });
    console.log(`[Seeder] Created Admin User: ${adminUser.email}`);

    // Create Standard Pharmacist User
    const standardUser = await User.create({
      name: 'Dr. Sarah Jenkins',
      email: 'user@meditrack.com',
      password: 'UserSecure2026!',
      role: 'user',
      pharmacyName: 'St. Jude Community Dispensary',
      licenseNumber: 'PHA-USER-8842',
      phone: '+1 (555) 302-8192',
      status: 'active',
    });
    console.log(`[Seeder] Created Pharmacist User: ${standardUser.email}`);

    // Create 15 Realistic Clinical Medicine Batches for the Standard Pharmacist
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const medicinesToSeed = [
      // 1. Expired Medicine (< 0 days)
      {
        name: 'Amoxicillin Trihydrate 500mg',
        category: 'Antibiotics',
        brand: 'Augmentin (GSK)',
        batchNumber: 'AMX-2023-089',
        quantity: 120,
        unit: 'capsules',
        purchaseDate: new Date(now.getTime() - 400 * dayMs),
        expiryDate: new Date(now.getTime() - 25 * dayMs), // Expired 25 days ago
        price: 18.5,
        description: 'Broad spectrum beta-lactam antibacterial for respiratory tract infections.',
        userId: standardUser._id,
      },
      // 2. Critical Expiry Soon (<= 7 days)
      {
        name: 'Insulin Glargine 100 units/mL',
        category: 'Endocrinology',
        brand: 'Lantus (Sanofi)',
        batchNumber: 'INS-2024-412',
        quantity: 24,
        unit: 'vials',
        purchaseDate: new Date(now.getTime() - 180 * dayMs),
        expiryDate: new Date(now.getTime() + 4 * dayMs), // Expiring in 4 days
        price: 74.0,
        description: 'Long-acting basal human insulin analogue pen cartridge. Refrigerate 2-8°C.',
        userId: standardUser._id,
      },
      // 3. Urgent Expiry Soon (<= 7 days)
      {
        name: 'Azithromycin 250mg',
        category: 'Antibiotics',
        brand: 'Zithromax (Pfizer)',
        batchNumber: 'AZT-2024-101',
        quantity: 45,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 200 * dayMs),
        expiryDate: new Date(now.getTime() + 6 * dayMs), // Expiring in 6 days
        price: 24.0,
        description: 'Macrolide antibiotic for community-acquired pneumonia and ENT infections.',
        userId: standardUser._id,
      },
      // 4. Expiring in <= 30 days
      {
        name: 'Ciprofloxacin 500mg',
        category: 'Antibiotics',
        brand: 'Cipro (Bayer)',
        batchNumber: 'CIP-2024-002',
        quantity: 80,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 320 * dayMs),
        expiryDate: new Date(now.getTime() + 19 * dayMs), // Expiring in 19 days
        price: 16.75,
        description: 'Fluoroquinolone antibiotic for urinary tract infections and skin structure infections.',
        userId: standardUser._id,
      },
      // 5. Expiring in <= 30 days
      {
        name: 'Metformin HCl 850mg',
        category: 'Endocrinology',
        brand: 'Glucophage (Merck)',
        batchNumber: 'MET-2024-814',
        quantity: 210,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 300 * dayMs),
        expiryDate: new Date(now.getTime() + 27 * dayMs), // Expiring in 27 days
        price: 9.25,
        description: 'Biguanide antihyperglycemic agent for managing type 2 diabetes mellitus.',
        userId: standardUser._id,
      },
      // 6. Low Stock Batch (below default threshold of 10)
      {
        name: 'EpiPen Auto-Injector 0.3mg',
        category: 'Emergency Care',
        brand: 'Mylan Specialty',
        batchNumber: 'EPI-2025-991',
        quantity: 4, // LOW STOCK (<= 10)
        unit: 'ampoules',
        purchaseDate: new Date(now.getTime() - 60 * dayMs),
        expiryDate: new Date(now.getTime() + 380 * dayMs), // Safe expiry
        price: 145.0,
        description: 'Emergency epinephrine injection for acute anaphylaxis and severe allergic shock.',
        userId: standardUser._id,
      },
      // 7. Low Stock Batch
      {
        name: 'Atropine Sulfate 1mg/mL',
        category: 'Emergency Care',
        brand: 'Baxter Healthcare',
        batchNumber: 'ATR-2025-015',
        quantity: 6, // LOW STOCK
        unit: 'ampoules',
        purchaseDate: new Date(now.getTime() - 45 * dayMs),
        expiryDate: new Date(now.getTime() + 240 * dayMs),
        price: 32.5,
        description: 'Anticholinergic agent for symptomatic bradycardia and organophosphate poisoning.',
        userId: standardUser._id,
      },
      // 8. Safe Batch
      {
        name: 'Paracetamol / Acetaminophen 500mg',
        category: 'Analgesics',
        brand: 'Tylenol (Kenvue)',
        batchNumber: 'PCM-2025-667',
        quantity: 500,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 30 * dayMs),
        expiryDate: new Date(now.getTime() + 450 * dayMs),
        price: 5.5,
        description: 'Analgesic and antipyretic for mild-to-moderate pain and pyrexia.',
        userId: standardUser._id,
      },
      // 9. Safe Batch
      {
        name: 'Ibuprofen 400mg',
        category: 'Analgesics',
        brand: 'Advil (Haleon)',
        batchNumber: 'IBU-2025-119',
        quantity: 340,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 20 * dayMs),
        expiryDate: new Date(now.getTime() + 380 * dayMs),
        price: 8.9,
        description: 'Non-steroidal anti-inflammatory drug (NSAID) for inflammatory pain and fever.',
        userId: standardUser._id,
      },
      // 10. Safe Batch
      {
        name: 'Omeprazole 20mg Delayed-Release',
        category: 'Gastroenterology',
        brand: 'Prilosec (AstraZeneca)',
        batchNumber: 'OMP-2025-334',
        quantity: 180,
        unit: 'capsules',
        purchaseDate: new Date(now.getTime() - 90 * dayMs),
        expiryDate: new Date(now.getTime() + 290 * dayMs),
        price: 21.0,
        description: 'Proton-pump inhibitor for gastroesophageal reflux disease (GERD) and peptic ulcers.',
        userId: standardUser._id,
      },
      // 11. Safe Batch
      {
        name: 'Atorvastatin Calcium 20mg',
        category: 'Cardiovascular',
        brand: 'Lipitor (Viatris)',
        batchNumber: 'ATV-2025-552',
        quantity: 260,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 75 * dayMs),
        expiryDate: new Date(now.getTime() + 420 * dayMs),
        price: 29.5,
        description: 'HMG-CoA reductase inhibitor (statin) for hypercholesterolemia prevention.',
        userId: standardUser._id,
      },
      // 12. Safe Batch
      {
        name: 'Amlodipine Besylate 5mg',
        category: 'Cardiovascular',
        brand: 'Norvasc (Pfizer)',
        batchNumber: 'AML-2025-781',
        quantity: 195,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 50 * dayMs),
        expiryDate: new Date(now.getTime() + 350 * dayMs),
        price: 14.2,
        description: 'Dihydropyridine calcium channel blocker for systemic arterial hypertension.',
        userId: standardUser._id,
      },
      // 13. Safe Batch
      {
        name: 'Salbutamol / Albuterol 100mcg Inhaler',
        category: 'Respiratory',
        brand: 'Ventolin HFA (GSK)',
        batchNumber: 'SLB-2025-901',
        quantity: 65,
        unit: 'bottles',
        purchaseDate: new Date(now.getTime() - 40 * dayMs),
        expiryDate: new Date(now.getTime() + 310 * dayMs),
        price: 27.5,
        description: 'Selective short-acting beta2-adrenergic agonist for acute bronchospasm relief.',
        userId: standardUser._id,
      },
      // 14. Safe Batch
      {
        name: 'Cetirizine HCl 10mg',
        category: 'Dermatology & Allergy',
        brand: 'Zyrtec (J&J)',
        batchNumber: 'CTZ-2025-228',
        quantity: 150,
        unit: 'tablets',
        purchaseDate: new Date(now.getTime() - 15 * dayMs),
        expiryDate: new Date(now.getTime() + 500 * dayMs),
        price: 11.0,
        description: 'Second-generation histamine H1 antagonist for allergic rhinitis and chronic urticaria.',
        userId: standardUser._id,
      },
      // 15. Expired Batch (< 0 days)
      {
        name: 'Ceftriaxone Sodium 1g Injection',
        category: 'Antibiotics',
        brand: 'Rocephin (Roche)',
        batchNumber: 'CTX-2023-740',
        quantity: 15,
        unit: 'vials',
        purchaseDate: new Date(now.getTime() - 365 * dayMs),
        expiryDate: new Date(now.getTime() - 14 * dayMs), // Expired 14 days ago
        price: 42.0,
        description: 'Third-generation cephalosporin for severe nosocomial bacterial infections.',
        userId: standardUser._id,
      },
    ];

    const createdMedicines = await Medicine.insertMany(medicinesToSeed);
    console.log(`[Seeder] Seeded ${createdMedicines.length} medicine records into MongoDB.`);

    // Log Activity for Seeding
    await ActivityLog.create({
      action: 'MEDICINE_CREATED',
      title: 'Dispensary Inventory Initialized',
      description: `Initial dispensary seed completed with ${createdMedicines.length} clinical inventory records.`,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        role: adminUser.role,
        email: adminUser.email,
      },
      severity: 'success',
    });

    console.log('[Seeder] Database seeding completed successfully!');
    console.log('\n======================================================');
    console.log('✅ SEED CREDENTIALS:');
    console.log(`   Admin Login:      ${adminEmail} / ${adminPassword}`);
    console.log(`   Pharmacist Login: user@meditrack.com / UserSecure2026!`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error]: ${error.message}`);
    process.exit(1);
  }
};

seedData();
