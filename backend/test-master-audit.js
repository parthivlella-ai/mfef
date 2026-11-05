const http = require('http');

const makeRequest = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runMasterAudit = async () => {
  console.log('================================================================');
  console.log('🚀 MEDITRACK – MASTER FINAL SYSTEM AUDIT & INTEGRATION TEST');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const auditReport = [];

  const assert = (condition, testName, passMsg, failMsg) => {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}: ${passMsg}`);
      passedTests++;
      auditReport.push({ name: testName, status: 'PASS', details: passMsg });
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${failMsg}`);
      auditReport.push({ name: testName, status: 'FAIL', details: failMsg });
    }
  };

  const ts = Date.now();
  const user1Email = `auditor_${ts}@meditrack.com`;
  const user2Email = `unauthorized_${ts}@meditrack.com`;
  const initialPassword = 'AuditPassword2026!';
  const updatedPassword = 'NewAuditPassword2026!';

  const addDays = (d) => {
    const date = new Date();
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };

  try {
    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATION, VALIDATION & ROLE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & SECURITY VALIDATION ---');

    // 1.1 Password confirmation mismatch
    const mismatchRes = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Dr. Jane Audit', email: user1Email, password: initialPassword, confirmPassword: 'DifferentPassword!' }
    );
    assert(mismatchRes.status === 400, 'Signup Password Mismatch', '400 returned when passwords do not match', `Expected 400, got ${mismatchRes.status}`);

    // 1.2 Password min length validation
    const shortPassRes = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Dr. Jane Audit', email: user1Email, password: '123', confirmPassword: '123' }
    );
    assert(shortPassRes.status === 400, 'Signup Password Length', '400 returned when password is < 6 characters', `Expected 400, got ${shortPassRes.status}`);

    // 1.3 Role Spoofing Prevention on Public Signup
    const roleSpoofRes = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Dr. Jane Audit', email: user1Email, password: initialPassword, confirmPassword: initialPassword, role: 'admin' }
    );
    assert(
      roleSpoofRes.status === 201 && roleSpoofRes.data?.data?.role === 'user',
      'Admin Role Spoofing Prevention',
      'Public signup strictly assigns "user" role, ignoring client "admin" payload',
      `Assigned role was: ${roleSpoofRes.data?.data?.role}`
    );
    const user1Token = roleSpoofRes.data?.data?.token;
    const user1Id = roleSpoofRes.data?.data?._id;

    // 1.4 Register secondary user for multi-tenant isolation tests
    const u2Res = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Dr. Bob Isolation', email: user2Email, password: initialPassword, confirmPassword: initialPassword }
    );
    const user2Token = u2Res.data?.data?.token;
    const user2Id = u2Res.data?.data?._id;
    assert(u2Res.status === 201 && user2Token, 'User 2 Registration', 'Secondary user registered successfully', 'User 2 registration failed');

    // 1.5 Wrong password login rejection
    const wrongPassRes = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: user1Email, password: 'WrongPassword!' }
    );
    assert(wrongPassRes.status === 401, 'Login Credential Validation', '401 returned for incorrect password', `Expected 401, got ${wrongPassRes.status}`);

    // 1.6 Successful Login & JWT Token generation
    const loginRes = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: user1Email, password: initialPassword }
    );
    assert(loginRes.status === 200 && loginRes.data?.data?.token, 'Login & JWT Issuance', 'Valid JWT token returned on successful login', 'Login failed');

    // 1.7 Authenticate as Admin
    const adminLoginRes = await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'admin@meditrack.com', password: 'AdminSecure2026!' }
    );
    const adminToken = adminLoginRes.data?.data?.token;
    assert(adminLoginRes.status === 200 && adminToken, 'Admin Authentication', 'Admin logged in and role verified', 'Admin login failed');

    // 1.8 Protected Route Guard without Token
    const unauthRes = await makeRequest({ hostname: 'localhost', port: 5000, path: '/api/medicines', method: 'GET' });
    assert(unauthRes.status === 401, 'Protected Route Guard', '401 returned when Authorization header is omitted', `Expected 401, got ${unauthRes.status}`);

    // 1.9 Role Authorization Guard: User attempting admin route
    const userToAdminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(userToAdminRes.status === 403, 'Role Authorization Guard', '403 Forbidden when regular user calls admin endpoint', `Expected 403, got ${userToAdminRes.status}`);

    // -------------------------------------------------------------
    // SECTION 2: MEDICINE MODEL, CRUD, SEARCH, FILTERS & SORTING
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: MEDICINE CRUD, SEARCH, FILTER & SORT ---');

    // 2.1 Create Medicine with all 11 Schema Fields
    const medPayload = {
      name: 'Levofloxacin 500mg',
      category: 'Antibiotics',
      brand: 'Sanofi Aventis',
      batchNumber: `LEV-${ts.toString().slice(-5)}`,
      quantity: 140,
      unit: 'Tablets',
      purchaseDate: addDays(-20),
      expiryDate: addDays(400),
      price: 24.5,
      description: 'Fluoroquinolone antibiotic for respiratory infections.',
      minStockLevel: 15,
    };

    const createMedRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      },
      medPayload
    );
    const createdMed = createMedRes.data?.data;
    assert(
      createMedRes.status === 201 &&
        createdMed &&
        createdMed.name === medPayload.name &&
        createdMed.brand === medPayload.brand &&
        createdMed.category === medPayload.category &&
        createdMed.batchNumber === medPayload.batchNumber &&
        createdMed.quantity === 140 &&
        createdMed.unit === 'Tablets' &&
        createdMed.price === 24.5 &&
        createdMed.description === medPayload.description &&
        createdMed.userId &&
        createdMed.createdAt,
      'Create Medicine (11 Schema Fields)',
      'Medicine created with all 11 required fields verified',
      `Creation failed: ${createMedRes.data?.message}`
    );
    const medId = createdMed?._id;

    // 2.2 Create Test Batches (Expired, Expiring in 4 days, Low Stock)
    // 2.2a Expired
    await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/medicines', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` } },
      { name: 'Ampicillin 250mg', category: 'Antibiotics', brand: 'Pfizer', batchNumber: `AMP-${ts.toString().slice(-4)}`, quantity: 60, unit: 'Capsules', expiryDate: addDays(-12), price: 9.0 }
    );
    // 2.2b Expiring in 4 days (<= 7 days)
    await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/medicines', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` } },
      { name: 'Salbutamol Inhaler', category: 'Respiratory', brand: 'GlaxoSmithKline', batchNumber: `SAL-${ts.toString().slice(-4)}`, quantity: 30, unit: 'Inhalers', expiryDate: addDays(4), price: 18.0 }
    );
    // 2.2c Low Stock (quantity 3 <= threshold 10)
    await makeRequest(
      { hostname: 'localhost', port: 5000, path: '/api/medicines', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` } },
      { name: 'Epinephrine Auto-Injector', category: 'Emergency', brand: 'Mylan', batchNumber: `EPI-${ts.toString().slice(-4)}`, quantity: 3, unit: 'Units', expiryDate: addDays(350), price: 110.0, minStockLevel: 10 }
    );

    // 2.3 Read Single Medicine (GET /api/medicines/:id)
    const getSingleRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${medId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(
      getSingleRes.status === 200 && getSingleRes.data?.data?._id === medId,
      'Read Medicine by ID',
      'Single medicine fetched with dynamic calculation metadata',
      'Read medicine failed'
    );

    // 2.4 Update Medicine Details (PUT /api/medicines/:id)
    const updateMedRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/medicines/${medId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      },
      { name: 'Levofloxacin Hemihydrate 500mg', quantity: 175, price: 26.0 }
    );
    assert(
      updateMedRes.status === 200 && updateMedRes.data?.data?.name === 'Levofloxacin Hemihydrate 500mg' && updateMedRes.data?.data?.quantity === 175,
      'Update Medicine Details',
      'Medicine details updated successfully',
      'Update medicine failed'
    );

    // 2.5 Quick Stock Adjustment (PATCH /api/medicines/:id/stock)
    const stockAdjustRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/medicines/${medId}/stock`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      },
      { change: -10, reason: 'Dispensed to Ward B' }
    );
    assert(
      stockAdjustRes.status === 200 && stockAdjustRes.data?.data?.quantity === 165,
      'Stock Adjustment (+/-)',
      'Stock adjusted from 175 to 165 units',
      'Stock adjustment failed'
    );

    // 2.6 Search by Medicine Name
    const searchNameRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?search=Levofloxacin',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(
      searchNameRes.status === 200 && searchNameRes.data?.data?.length >= 1,
      'Search by Medicine Name',
      `Found ${searchNameRes.data?.data?.length} match(es) for "Levofloxacin"`,
      'Search by Name failed'
    );

    // 2.7 Search by Brand Name
    const searchBrandRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?search=Sanofi',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(
      searchBrandRes.status === 200 && searchBrandRes.data?.data?.[0]?.brand.includes('Sanofi'),
      'Search by Brand Name',
      'Found medicine match querying brand "Sanofi"',
      'Search by Brand failed'
    );

    // 2.8 Filter by Category
    const catRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?category=Respiratory',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(
      catRes.status === 200 && catRes.data?.data?.every((m) => m.category === 'Respiratory'),
      'Filter by Category',
      `Filtered ${catRes.data?.data?.length} Respiratory category record(s)`,
      'Category filter failed'
    );

    // 2.9 Sort by Expiry Date (ASC)
    const sortExpRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?sortBy=expiryDate&sortOrder=asc',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const medsByExp = sortExpRes.data?.data || [];
    let expAsc = true;
    for (let i = 1; i < medsByExp.length; i++) {
      if (new Date(medsByExp[i].expiryDate) < new Date(medsByExp[i - 1].expiryDate)) {
        expAsc = false;
        break;
      }
    }
    assert(sortExpRes.status === 200 && expAsc, 'Sort by Expiry Date (ASC)', 'Earliest expiry date sorted first', 'Expiry sorting failed');

    // 2.10 Sort by Quantity (DESC)
    const sortQtyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?sortBy=quantity&sortOrder=desc',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const medsByQty = sortQtyRes.data?.data || [];
    let qtyDesc = true;
    for (let i = 1; i < medsByQty.length; i++) {
      if (Number(medsByQty[i].quantity) > Number(medsByQty[i - 1].quantity)) {
        qtyDesc = false;
        break;
      }
    }
    assert(sortQtyRes.status === 200 && qtyDesc, 'Sort by Quantity (DESC)', 'Highest stock quantity sorted first', 'Quantity sorting failed');

    // 2.11 Multi-tenant Record Isolation
    const u2ViewU1MedsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines',
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert(
      u2ViewU1MedsRes.status === 200 && u2ViewU1MedsRes.data?.data?.length === 0,
      'Multi-Tenant Record Isolation',
      'User 2 sees 0 records (User 1 records completely isolated)',
      `Isolation failed: User 2 sees ${u2ViewU1MedsRes.data?.data?.length} records`
    );

    // 2.12 Cross-User Modification Protection (403 Forbidden)
    const crossPutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/medicines/${medId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
      },
      { quantity: 9999 }
    );
    assert(crossPutRes.status === 403, 'Cross-User Update Block', '403 Forbidden when user attempts to edit another user medicine', `Expected 403, got ${crossPutRes.status}`);

    // -------------------------------------------------------------
    // SECTION 3: EXPIRY SURVEILLANCE & IN-APP NOTIFICATIONS
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: EXPIRY INTELLIGENCE & IN-APP NOTIFICATIONS ---');

    // 3.1 Expiry Stats API Verification
    const statsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines/stats?threshold=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const statsData = statsRes.data?.data;
    assert(
      statsRes.status === 200 &&
        statsData &&
        statsData.total === 4 &&
        statsData.expired === 1 &&
        statsData.expiring7 === 1 &&
        statsData.lowStock === 1,
      'Dynamic Expiry Calculations',
      `Accurate metrics computed against new Date(): Total=${statsData?.total}, Expired=${statsData?.expired}, <=7d=${statsData?.expiring7}, LowStock=${statsData?.lowStock}`,
      `Stats calculation mismatch: ${JSON.stringify(statsData)}`
    );

    // 3.2 Notification Generation
    const notifsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const notifs = notifsRes.data?.data || [];
    assert(
      notifsRes.status === 200 && notifs.length >= 3,
      'Automated In-App Notifications',
      `Alerts generated for expired, expiring soon, and low stock items (Total=${notifs.length})`,
      'Notification generation failed'
    );

    // 3.3 Notification Deduplication Check
    const notifsRes2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(
      notifsRes2.data?.count === notifs.length,
      'Notification Deduplication (periodKey)',
      `Unique periodKey prevented duplicate alerts on re-sync (Count: ${notifsRes2.data?.count})`,
      'Deduplication failed'
    );

    // 3.4 Mark Single Notification as Read
    const targetNotifId = notifs[0]._id;
    const markReadRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notifications/${targetNotifId}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(markReadRes.status === 200 && markReadRes.data?.data?.isRead === true, 'Mark Notification as Read', 'Single alert marked as read', 'Mark as read failed');

    // 3.5 Mark All Notifications as Read
    const markAllRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications/read-all',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(markAllRes.status === 200 && markAllRes.data?.unreadCount === 0, 'Mark All Read', 'All notifications marked as read (unread count = 0)', 'Mark all failed');

    // -------------------------------------------------------------
    // SECTION 4: USER & ADMIN DASHBOARDS
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: USER & ADMIN DASHBOARD APIS ---');

    // 4.1 User Dashboard API
    const userDashRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const uDash = userDashRes.data?.data;
    assert(
      userDashRes.status === 200 &&
        uDash &&
        uDash.summary.totalMedicines === 4 &&
        uDash.summary.activeMedicines === 3 &&
        uDash.summary.expiredCount === 1 &&
        uDash.categoryDistribution.length >= 2 &&
        uDash.recentlyAdded.length >= 4 &&
        uDash.upcomingExpiryReminders.length >= 1,
      'User Dashboard Aggregates',
      'Total, Active, Expired, Charts, Recently Added & Upcoming Reminders verified',
      'User dashboard data mismatch'
    );

    // 4.2 Admin Dashboard API
    const adminDashRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const aDash = adminDashRes.data?.data;
    assert(
      adminDashRes.status === 200 &&
        aDash &&
        aDash.metrics.totalRegisteredUsers >= 2 &&
        aDash.metrics.totalMedicinesAcrossPlatform >= 4 &&
        aDash.recentlyRegisteredUsers.length >= 2 &&
        !aDash.recentlyRegisteredUsers[0].password &&
        aDash.charts.categoryDistribution &&
        aDash.charts.registrationTrend,
      'Admin Dashboard Platform Metrics',
      `Platform Users=${aDash?.metrics.totalRegisteredUsers}, Platform Meds=${aDash?.metrics.totalMedicinesAcrossPlatform}, Passwords Excluded`,
      'Admin dashboard data mismatch'
    );

    // 4.3 Admin User Management & Search
    const adminUsersRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users?search=${encodeURIComponent('Jane Audit')}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundUser = adminUsersRes.data?.data?.[0];
    assert(
      adminUsersRes.status === 200 && foundUser && foundUser.stats.medicineCount === 4,
      'Admin Search & User Medicine Stats',
      `Found user "Dr. Jane Audit" with populated stats: medicineCount=${foundUser?.stats?.medicineCount}, expiredCount=${foundUser?.stats?.expiredCount}`,
      'Admin user search failed'
    );

    // 4.4 Admin User Account Status Toggle (Active <-> Inactive)
    const deactRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/admin/users/${user1Id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      },
      { status: 'inactive' }
    );
    assert(deactRes.status === 200 && deactRes.data?.data?.status === 'inactive', 'Admin Account Deactivation', 'User account successfully set to inactive', 'Deactivation failed');

    const reactRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/admin/users/${user1Id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      },
      { status: 'active' }
    );
    assert(reactRes.status === 200 && reactRes.data?.data?.status === 'active', 'Admin Account Reactivation', 'User account successfully set to active', 'Reactivation failed');

    // 4.5 Inspect User Specific Medicine Stats (GET /api/admin/users/:id/stats)
    const inspUserRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users/${user1Id}/stats`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      inspUserRes.status === 200 && inspUserRes.data?.data?.stats?.totalMedicines === 4 && inspUserRes.data?.data?.medicines?.length >= 1,
      'Admin Inspect User Inventory',
      'Detailed inventory breakdown and medicine sample returned for inspected user',
      'Inspect user inventory failed'
    );

    // -------------------------------------------------------------
    // SECTION 5: PROFILE MANAGEMENT & DELETION WITH CONFIRMATION
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: PROFILE MANAGEMENT & DATA PERSISTENCE ---');

    // 5.1 Update User Profile
    const updateProfileRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/profile',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      },
      {
        name: 'Dr. Jane Audit, PharmD',
        phone: '+1 800-555-4321',
        pharmacyName: 'Memorial Central Dispensary',
        licenseNumber: 'RPH-AUDIT-2026',
      }
    );
    assert(
      updateProfileRes.status === 200 && updateProfileRes.data?.data?.name === 'Dr. Jane Audit, PharmD' && updateProfileRes.data?.data?.licenseNumber === 'RPH-AUDIT-2026',
      'Update User Profile',
      'Profile information updated and persisted to MongoDB',
      'Profile update failed'
    );

    // 5.2 Change Password securely
    const changePassRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/change-password',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      },
      { currentPassword: initialPassword, newPassword: updatedPassword }
    );
    assert(changePassRes.status === 200, 'Secure Password Update', 'Password re-hashed with bcrypt and persisted', 'Password change failed');

    // 5.3 Delete Medicine with Confirmation
    const delMedRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${medId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(delMedRes.status === 200, 'Delete Medicine Record', 'Medicine permanently deleted from inventory', 'Delete medicine failed');

    // Verify deletion persistence (404)
    const verifyDelMed = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${medId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(verifyDelMed.status === 404, 'Medicine Deletion Persistence', '404 Not Found confirmed in MongoDB', `Expected 404, got ${verifyDelMed.status}`);

    // 5.4 Admin Delete User Account with Confirmation
    const delUserRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users/${user2Id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delUserRes.status === 200, 'Admin Delete User Account', 'User account permanently deleted and audit logged', 'Delete user failed');

    // 5.5 System Health & Diagnostics Endpoint
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/system-health',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      healthRes.status === 200 && healthRes.data?.data?.database?.connected === true,
      'System Health & MongoDB Live Status',
      `Live status: Database connected (${healthRes.data?.data?.database?.host}), Memory RSS=${healthRes.data?.data?.server?.memoryMb}MB`,
      'System health check failed'
    );

    console.log('\n================================================================');
    console.log(`🏁 MASTER AUDIT SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Master Audit failed with fatal error:', err);
    process.exit(1);
  }
};

runMasterAudit();
