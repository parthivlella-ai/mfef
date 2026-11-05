// In-memory persistent fallback store if MongoDB is not reachable locally
const bcrypt = require('bcryptjs');

let mockUsers = [
  {
    _id: '67c9f1a10000000000000001',
    name: 'Dr. Sarah Jenkins',
    email: 'admin@meditrack.com',
    password: '$2a$10$wO9wK7.0Y34H56fGHiJkLuWk9Xy/1/2/3/4/5/6/7/8/9/012345678', // Password123!
    plainPassword: 'Password123!',
    role: 'admin',
    phone: '+1 (555) 982-1245',
    pharmacyName: 'MediTrack Central Hospital Pharmacy',
    licenseNumber: 'ADMIN-LIC-2024-001',
    status: 'active',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2026-01-10T12:00:00Z'),
  },
  {
    _id: '67c9f1a10000000000000002',
    name: 'Alex Rivera, PharmD',
    email: 'pharmacist@meditrack.com',
    password: '$2a$10$wO9wK7.0Y34H56fGHiJkLuWk9Xy/1/2/3/4/5/6/7/8/9/012345678',
    plainPassword: 'Password123!',
    role: 'pharmacist',
    phone: '+1 (555) 438-9921',
    pharmacyName: 'MediTrack Central Hospital Pharmacy',
    licenseNumber: 'RPH-99283-NY',
    status: 'active',
    createdAt: new Date('2024-03-20T09:30:00Z'),
    updatedAt: new Date('2026-02-14T10:15:00Z'),
  },
  {
    _id: '67c9f1a10000000000000003',
    name: 'Jordan Lee',
    email: 'staff@meditrack.com',
    password: '$2a$10$wO9wK7.0Y34H56fGHiJkLuWk9Xy/1/2/3/4/5/6/7/8/9/012345678',
    plainPassword: 'Password123!',
    role: 'staff',
    phone: '+1 (555) 312-7744',
    pharmacyName: 'MediTrack Central Hospital Pharmacy',
    licenseNumber: 'STF-5481',
    status: 'active',
    createdAt: new Date('2024-06-11T14:20:00Z'),
    updatedAt: new Date('2026-03-01T11:00:00Z'),
  },
];

// Helper to calculate days from today
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

const subDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

let mockMedicines = [
  {
    _id: '67c9f2b10000000000000001',
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin Trihydrate',
    category: 'Antibiotics',
    batchNumber: 'AMX-2025-089',
    quantity: 65,
    minStockLevel: 25,
    unit: 'Capsules',
    unitPrice: 18.5,
    purchasePrice: 12.0,
    mfgDate: subDays(320),
    expiryDate: addDays(18), // CRITICAL: 18 days left
    supplier: 'Sun Pharma Ltd.',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack A-2, Shelf 3',
    prescriptionRequired: true,
    status: 'available',
    createdAt: subDays(150),
    updatedAt: subDays(2),
  },
  {
    _id: '67c9f2b10000000000000002',
    name: 'Paracetamol 650mg',
    genericName: 'Acetaminophen',
    category: 'Analgesics',
    batchNumber: 'PCM-2026-102',
    quantity: 480,
    minStockLevel: 50,
    unit: 'Tablets',
    unitPrice: 4.5,
    purchasePrice: 2.2,
    mfgDate: subDays(45),
    expiryDate: addDays(480), // SAFE: >1 year
    supplier: 'GlaxoSmithKline (GSK)',
    storageCondition: 'Cool & Dry Place',
    rackLocation: 'Rack B-1, Shelf 1',
    prescriptionRequired: false,
    status: 'available',
    createdAt: subDays(45),
    updatedAt: subDays(5),
  },
  {
    _id: '67c9f2b10000000000000003',
    name: 'Azithromycin 250mg',
    genericName: 'Azithromycin Dihydrate',
    category: 'Antibiotics',
    batchNumber: 'AZT-2025-412',
    quantity: 7, // LOW STOCK
    minStockLevel: 20,
    unit: 'Tablets',
    unitPrice: 32.0,
    purchasePrice: 22.5,
    mfgDate: subDays(210),
    expiryDate: addDays(58), // WARNING: 58 days left
    supplier: 'Pfizer Inc.',
    storageCondition: 'Protect from Light',
    rackLocation: 'Rack A-3, Shelf 2',
    prescriptionRequired: true,
    status: 'low_stock',
    createdAt: subDays(120),
    updatedAt: subDays(1),
  },
  {
    _id: '67c9f2b10000000000000004',
    name: 'Metformin 500mg ER',
    genericName: 'Metformin Hydrochloride',
    category: 'Antidiabetic',
    batchNumber: 'MET-2026-004',
    quantity: 260,
    minStockLevel: 40,
    unit: 'Tablets',
    unitPrice: 12.0,
    purchasePrice: 7.8,
    mfgDate: subDays(90),
    expiryDate: addDays(360),
    supplier: 'Novartis Healthcare',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack D-2, Shelf 4',
    prescriptionRequired: true,
    status: 'available',
    createdAt: subDays(80),
    updatedAt: subDays(10),
  },
  {
    _id: '67c9f2b10000000000000005',
    name: 'Atorvastatin 20mg',
    genericName: 'Atorvastatin Calcium',
    category: 'Cardiovascular',
    batchNumber: 'ATV-2026-781',
    quantity: 140,
    minStockLevel: 30,
    unit: 'Tablets',
    unitPrice: 24.5,
    purchasePrice: 16.0,
    mfgDate: subDays(75),
    expiryDate: addDays(400),
    supplier: 'Cipla Therapeutics',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack C-1, Shelf 2',
    prescriptionRequired: true,
    status: 'available',
    createdAt: subDays(70),
    updatedAt: subDays(3),
  },
  {
    _id: '67c9f2b10000000000000006',
    name: 'Cetirizine 10mg',
    genericName: 'Cetirizine Hydrochloride',
    category: 'Antihistamines',
    batchNumber: 'CET-2026-302',
    quantity: 350,
    minStockLevel: 35,
    unit: 'Tablets',
    unitPrice: 6.0,
    purchasePrice: 3.5,
    mfgDate: subDays(60),
    expiryDate: addDays(510),
    supplier: 'Dr. Reddy\'s Labs',
    storageCondition: 'Cool & Dry Place',
    rackLocation: 'Rack B-4, Shelf 1',
    prescriptionRequired: false,
    status: 'available',
    createdAt: subDays(50),
    updatedAt: subDays(6),
  },
  {
    _id: '67c9f2b10000000000000007',
    name: 'Ibuprofen 400mg',
    genericName: 'Ibuprofen',
    category: 'Analgesics',
    batchNumber: 'IBU-2024-910',
    quantity: 45,
    minStockLevel: 30,
    unit: 'Tablets',
    unitPrice: 8.5,
    purchasePrice: 5.0,
    mfgDate: subDays(500),
    expiryDate: subDays(14), // EXPIRED: 14 days ago!
    supplier: 'Abbott Healthcare',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack B-2, Shelf 3',
    prescriptionRequired: false,
    status: 'expired',
    createdAt: subDays(280),
    updatedAt: subDays(14),
  },
  {
    _id: '67c9f2b10000000000000008',
    name: 'Salbutamol Inhaler 100mcg',
    genericName: 'Albuterol Sulfate',
    category: 'Respiratory',
    batchNumber: 'SLB-2025-115',
    quantity: 4, // CRITICAL LOW STOCK
    minStockLevel: 15,
    unit: 'Inhaler',
    unitPrice: 42.0,
    purchasePrice: 30.0,
    mfgDate: subDays(180),
    expiryDate: addDays(240),
    supplier: 'GlaxoSmithKline (GSK)',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack R-1, Shelf 1',
    prescriptionRequired: true,
    status: 'low_stock',
    createdAt: subDays(120),
    updatedAt: subDays(2),
  },
  {
    _id: '67c9f2b10000000000000009',
    name: 'Pantoprazole 40mg',
    genericName: 'Pantoprazole Sodium',
    category: 'Gastrointestinal',
    batchNumber: 'PAN-2026-664',
    quantity: 190,
    minStockLevel: 25,
    unit: 'Tablets',
    unitPrice: 15.0,
    purchasePrice: 9.5,
    mfgDate: subDays(100),
    expiryDate: addDays(290),
    supplier: 'Sun Pharma Ltd.',
    storageCondition: 'Cool & Dry Place',
    rackLocation: 'Rack G-2, Shelf 2',
    prescriptionRequired: true,
    status: 'available',
    createdAt: subDays(90),
    updatedAt: subDays(4),
  },
  {
    _id: '67c9f2b10000000000000010',
    name: 'Vitamin D3 60,000 IU',
    genericName: 'Cholecalciferol',
    category: 'Vitamins & Supplements',
    batchNumber: 'VIT-2026-809',
    quantity: 110,
    minStockLevel: 20,
    unit: 'Capsules',
    unitPrice: 28.0,
    purchasePrice: 17.5,
    mfgDate: subDays(80),
    expiryDate: addDays(380),
    supplier: 'Cadila Pharma',
    storageCondition: 'Protect from Light',
    rackLocation: 'Rack V-1, Shelf 3',
    prescriptionRequired: false,
    status: 'available',
    createdAt: subDays(70),
    updatedAt: subDays(5),
  },
  {
    _id: '67c9f2b10000000000000011',
    name: 'Dextromethorphan Cough Syrup 100ml',
    genericName: 'Dextromethorphan HBr',
    category: 'Respiratory',
    batchNumber: 'DXM-2025-303',
    quantity: 22,
    minStockLevel: 15,
    unit: 'Syrup Bottle',
    unitPrice: 16.0,
    purchasePrice: 10.5,
    mfgDate: subDays(290),
    expiryDate: addDays(24), // CRITICAL: 24 days left
    supplier: 'Sanofi Healthcare',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack S-3, Shelf 1',
    prescriptionRequired: false,
    status: 'available',
    createdAt: subDays(140),
    updatedAt: subDays(3),
  },
  {
    _id: '67c9f2b10000000000000012',
    name: 'Insulin Glargine 100 IU/mL',
    genericName: 'Insulin Glargine rDNA',
    category: 'Antidiabetic',
    batchNumber: 'INS-2026-442',
    quantity: 28,
    minStockLevel: 12,
    unit: 'Injection Vial',
    unitPrice: 95.0,
    purchasePrice: 72.0,
    mfgDate: subDays(40),
    expiryDate: addDays(310),
    supplier: 'Sanofi-Aventis',
    storageCondition: 'Refrigerated (2-8°C)',
    rackLocation: 'Cold Vault Fridge-02',
    prescriptionRequired: true,
    status: 'available',
    createdAt: subDays(35),
    updatedAt: subDays(1),
  },
  {
    _id: '67c9f2b10000000000000013',
    name: 'Hydrocortisone 1% Cream 30g',
    genericName: 'Hydrocortisone',
    category: 'Dermatological',
    batchNumber: 'HYD-2026-512',
    quantity: 9, // LOW STOCK
    minStockLevel: 15,
    unit: 'Ointment Tube',
    unitPrice: 19.5,
    purchasePrice: 13.0,
    mfgDate: subDays(130),
    expiryDate: addDays(210),
    supplier: 'Galderma Labs',
    storageCondition: 'Cool & Dry Place',
    rackLocation: 'Rack D-1, Shelf 2',
    prescriptionRequired: true,
    status: 'low_stock',
    createdAt: subDays(100),
    updatedAt: subDays(8),
  },
  {
    _id: '67c9f2b10000000000000014',
    name: 'Ciprofloxacin 0.3% Eye/Ear Drops',
    genericName: 'Ciprofloxacin Hydrochloride',
    category: 'Antibiotics',
    batchNumber: 'CIP-2025-998',
    quantity: 0, // OUT OF STOCK
    minStockLevel: 15,
    unit: 'Drops Bottle',
    unitPrice: 14.0,
    purchasePrice: 9.0,
    mfgDate: subDays(240),
    expiryDate: addDays(110),
    supplier: 'Alcon Laboratories',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Rack E-1, Shelf 4',
    prescriptionRequired: true,
    status: 'out_of_stock',
    createdAt: subDays(150),
    updatedAt: subDays(2),
  },
  {
    _id: '67c9f2b10000000000000015',
    name: 'Doxycycline 100mg Capsules',
    genericName: 'Doxycycline Hyclate',
    category: 'Antibiotics',
    batchNumber: 'DOX-2024-500',
    quantity: 0,
    minStockLevel: 20,
    unit: 'Capsules',
    unitPrice: 22.0,
    purchasePrice: 14.5,
    mfgDate: subDays(400),
    expiryDate: subDays(30),
    supplier: 'Lupin Pharma',
    storageCondition: 'Room Temperature (15-25°C)',
    rackLocation: 'Disposal Bin Dis-01',
    prescriptionRequired: true,
    status: 'disposed',
    disposalDetails: {
      disposedAt: subDays(10),
      reason: 'Expired Stock',
      disposedBy: 'Alex Rivera, PharmD',
      notes: 'Safe biohazard pharmaceutical incineration per EPA protocol.',
    },
    createdAt: subDays(300),
    updatedAt: subDays(10),
  },
];

let mockActivityLogs = [
  {
    _id: '67c9f3c10000000000000001',
    action: 'MEDICINE_DISPOSED',
    title: 'Medicine Batch Disposed',
    description: 'Doxycycline 100mg (Batch DOX-2024-500) marked as disposed due to expiration.',
    user: { name: 'Alex Rivera, PharmD', role: 'pharmacist', email: 'pharmacist@meditrack.com' },
    metadata: { batchNumber: 'DOX-2024-500', medicineName: 'Doxycycline 100mg' },
    severity: 'warning',
    createdAt: subDays(10),
  },
  {
    _id: '67c9f3c10000000000000002',
    action: 'MEDICINE_CREATED',
    title: 'New Medicine Stock Received',
    description: 'Insulin Glargine 100 IU/mL added to cold vault storage.',
    user: { name: 'Dr. Sarah Jenkins', role: 'admin', email: 'admin@meditrack.com' },
    metadata: { batchNumber: 'INS-2026-442', medicineName: 'Insulin Glargine 100 IU/mL' },
    severity: 'success',
    createdAt: subDays(35),
  },
  {
    _id: '67c9f3c10000000000000003',
    action: 'STOCK_ADJUSTED',
    title: 'Stock Depleted - Reorder Alert',
    description: 'Salbutamol Inhaler 100mcg stock dropped to 4 units (threshold: 15).',
    user: { name: 'Jordan Lee', role: 'staff', email: 'staff@meditrack.com' },
    metadata: { batchNumber: 'SLB-2025-115', quantityLeft: 4 },
    severity: 'critical',
    createdAt: subDays(2),
  },
  {
    _id: '67c9f3c10000000000000004',
    action: 'STOCK_ADJUSTED',
    title: 'Dispensed Prescription Stock',
    description: 'Amoxicillin 500mg batch AMX-2025-089 updated during morning dispensary run.',
    user: { name: 'Alex Rivera, PharmD', role: 'pharmacist', email: 'pharmacist@meditrack.com' },
    metadata: { batchNumber: 'AMX-2025-089', quantityLeft: 65 },
    severity: 'info',
    createdAt: subDays(1),
  },
];

const mockStore = {
  getUsers: () => mockUsers,
  getUserById: (id) => mockUsers.find((u) => u._id === id || String(u._id) === String(id)),
  getUserByEmail: (email) => mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  addUser: (user) => {
    const newUser = {
      ...user,
      _id: `mock_usr_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
  },
  updateUser: (id, updates) => {
    const idx = mockUsers.findIndex((u) => u._id === id || String(u._id) === String(id));
    if (idx !== -1) {
      mockUsers[idx] = { ...mockUsers[idx], ...updates, updatedAt: new Date() };
      return mockUsers[idx];
    }
    return null;
  },
  deleteUser: (id) => {
    mockUsers = mockUsers.filter((u) => u._id !== id && String(u._id) !== String(id));
  },

  getMedicines: () => {
    // Enrich with virtual calculations
    const now = new Date();
    return mockMedicines.map((m) => {
      const exp = new Date(m.expiryDate);
      const diffTime = exp.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let expiryStatus = 'safe';
      if (m.status === 'disposed') expiryStatus = 'disposed';
      else if (daysUntilExpiry <= 0) expiryStatus = 'expired';
      else if (daysUntilExpiry <= 30) expiryStatus = 'critical';
      else if (daysUntilExpiry <= 90) expiryStatus = 'warning';

      let status = m.status;
      if (m.status !== 'disposed') {
        if (daysUntilExpiry <= 0) status = 'expired';
        else if (m.quantity === 0) status = 'out_of_stock';
        else if (m.quantity <= m.minStockLevel) status = 'low_stock';
        else status = 'available';
      }

      return {
        ...m,
        daysUntilExpiry,
        expiryStatus,
        status,
      };
    });
  },
  getMedicineById: (id) => {
    const all = mockStore.getMedicines();
    return all.find((m) => m._id === id || String(m._id) === String(id));
  },
  addMedicine: (medicine) => {
    const newMed = {
      ...medicine,
      _id: `mock_med_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMedicines.unshift(newMed);
    return newMed;
  },
  updateMedicine: (id, updates) => {
    const idx = mockMedicines.findIndex((m) => m._id === id || String(m._id) === String(id));
    if (idx !== -1) {
      mockMedicines[idx] = { ...mockMedicines[idx], ...updates, updatedAt: new Date() };
      return mockMedicines[idx];
    }
    return null;
  },
  deleteMedicine: (id) => {
    mockMedicines = mockMedicines.filter((m) => m._id !== id && String(m._id) !== String(id));
  },

  getActivityLogs: () => mockActivityLogs,
  addActivityLog: (log) => {
    const newLog = {
      ...log,
      _id: `mock_log_${Date.now()}`,
      createdAt: new Date(),
    };
    mockActivityLogs.unshift(newLog);
    return newLog;
  },
};

module.exports = mockStore;

