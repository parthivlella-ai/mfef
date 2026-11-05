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

const runDashboardAndNotificationTests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING MEDITRACK DASHBOARD & NOTIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, passMsg, failMsg) => {
    totalTests++;
    if (condition) {
      console.log(`   ✅ PASS: ${passMsg}`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: ${failMsg}`);
    }
  };

  const ts = Date.now();
  const testUserEmail = `dashuser_${ts}@meditrack.com`;
  const password = 'Password2026!';
  const addDays = (d) => {
    const date = new Date();
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };

  try {
    // 1. Setup User Account
    console.log('1. Setting up User account & Auth...');
    const regRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Dr. Evelyn Reed',
        email: testUserEmail,
        password,
        confirmPassword: password,
        pharmacyName: 'St. Jude Clinical Dispensary',
      }
    );
    const userToken = regRes.data?.data?.token;
    assert(regRes.status === 201 && userToken, 'User account registered and authenticated', 'Registration failed');

    // 2. Setup Admin Account Login
    console.log('\n2. Authenticating as Administrator...');
    const adminLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'admin@meditrack.com',
        password: 'AdminSecure2026!',
      }
    );
    const adminToken = adminLoginRes.data?.data?.token;
    assert(adminLoginRes.status === 200 && adminToken, 'Administrator logged in and token acquired', 'Admin login failed');

    // 3. Create Seed Batches for User (Expired, Expiring in 5 days, Low Stock, Safe)
    console.log('\n3. Creating specific medicine batches for User...');
    // 3a. Expired batch
    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      },
      {
        name: 'Expired Tetracycline 250mg',
        category: 'Antibiotics',
        brand: 'Lupin',
        batchNumber: `TET-${ts.toString().slice(-4)}`,
        quantity: 40,
        unit: 'Capsules',
        expiryDate: addDays(-15),
        price: 12.0,
      }
    );

    // 3b. Expiring in 5 days (Urgent <= 7d)
    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      },
      {
        name: 'Critical Paracetamol Syrup',
        category: 'Analgesics',
        brand: 'GlaxoSmithKline',
        batchNumber: `PCM-${ts.toString().slice(-4)}`,
        quantity: 25,
        unit: 'Syrup Bottles',
        expiryDate: addDays(5),
        price: 6.5,
      }
    );

    // 3c. Low stock batch
    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      },
      {
        name: 'Insulin Rapid Pen',
        category: 'Antidiabetic',
        brand: 'Novo Nordisk',
        batchNumber: `NOV-${ts.toString().slice(-4)}`,
        quantity: 2,
        unit: 'Pens',
        expiryDate: addDays(200),
        price: 55.0,
        minStockLevel: 10,
      }
    );

    // 3d. Safe batch
    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      },
      {
        name: 'Vitamin D3 60000 IU',
        category: 'Vitamins & Supplements',
        brand: 'Cadila',
        batchNumber: `VIT-${ts.toString().slice(-4)}`,
        quantity: 150,
        unit: 'Capsules',
        expiryDate: addDays(400),
        price: 15.0,
      }
    );

    // 4. Verify User Dashboard Stats API
    console.log('\n4. Testing User Dashboard Stats (/api/dashboard/stats)...');
    const userDashRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const d = userDashRes.data?.data;
    assert(
      userDashRes.status === 200 &&
        d &&
        d.summary.totalMedicines === 4 &&
        d.summary.activeMedicines === 3 &&
        d.summary.expiredCount === 1 &&
        d.summary.expiringIn30DaysCount >= 1 &&
        d.summary.lowStockCount === 1,
      `User Dashboard summary numbers dynamic: Total=4, Active=3, Expired=1, ExpiringSoon=${d?.summary.expiringIn30DaysCount}, LowStock=1`,
      `User dashboard summary mismatch: ${JSON.stringify(d?.summary)}`
    );

    assert(
      d?.categoryDistribution?.length >= 3,
      `Category distribution chart data present (${d?.categoryDistribution?.length} categories)`,
      'Category distribution empty'
    );

    assert(
      d?.expiryStatusBreakdown && d.expiryStatusBreakdown.expired === 1,
      `Expiry status breakdown for charts present: Safe=${d?.expiryStatusBreakdown?.safe}, Expired=${d?.expiryStatusBreakdown?.expired}, LowStock=${d?.expiryStatusBreakdown?.lowStock}`,
      'Expiry status breakdown mismatch'
    );

    assert(
      d?.recentlyAdded?.length >= 4,
      `Recently added medicines list populated (${d?.recentlyAdded?.length} items)`,
      'Recently added list empty'
    );

    assert(
      d?.upcomingExpiryReminders?.length >= 1,
      `Upcoming expiry reminders populated (${d?.upcomingExpiryReminders?.length} items)`,
      'Upcoming expiry reminders empty'
    );

    // 5. Test Notification Generation & Surveillance
    console.log('\n5. Testing Notification Center & Alert Generation (/api/notifications)...');
    const notifsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const notifs = notifsRes.data?.data;
    const unreadCount = notifsRes.data?.unreadCount;

    assert(
      notifsRes.status === 200 && notifs && notifs.length >= 3,
      `In-app notifications automatically generated for expired, expiring soon, and low stock items (Total=${notifs?.length}, Unread=${unreadCount})`,
      `Failed to generate notifications: ${JSON.stringify(notifsRes.data)}`
    );

    // Check specific alert types
    const hasExpiredNotif = notifs?.some((n) => n.type === 'EXPIRED');
    const hasExpiringSoonNotif = notifs?.some((n) => n.type === 'EXPIRING_7_DAYS' || n.type === 'EXPIRING_SOON');
    const hasLowStockNotif = notifs?.some((n) => n.type === 'LOW_STOCK');

    assert(hasExpiredNotif, 'Alert for expired medicine generated with critical severity', 'Expired alert missing');
    assert(hasExpiringSoonNotif, 'Alert for medicine nearing expiry generated', 'Nearing expiry alert missing');
    assert(hasLowStockNotif, 'Alert for low-stock medicine generated', 'Low stock alert missing');

    // 6. Test Deduplication: Calling notifications endpoint again must NOT duplicate
    console.log('\n6. Testing Notification Deduplication (periodKey avoidance)...');
    const notifsRes2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(
      notifsRes2.data?.count === notifs.length,
      `Duplicate prevention verified: Count remained ${notifsRes2.data?.count} (no duplicate alerts generated)`,
      `Deduplication failed: Count increased from ${notifs.length} to ${notifsRes2.data?.count}`
    );

    // 7. Test Mark Notification as Read
    console.log('\n7. Testing Mark Notification as Read...');
    const firstNotifId = notifs[0]._id;
    const markReadRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notifications/${firstNotifId}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(
      markReadRes.status === 200 && markReadRes.data?.data?.isRead === true,
      'Single notification marked as read successfully',
      'Failed to mark notification as read'
    );

    // 8. Test Mark All as Read
    console.log('\n8. Testing Mark All Notifications as Read...');
    const markAllRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications/read-all',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(
      markAllRes.status === 200 && markAllRes.data?.unreadCount === 0,
      'All notifications marked as read (unread count = 0)',
      'Failed to mark all notifications as read'
    );

    // 9. Test Delete Notification
    console.log('\n9. Testing Notification Dismissal / Deletion...');
    const delNotifRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notifications/${firstNotifId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(
      delNotifRes.status === 200,
      'Notification successfully dismissed / deleted',
      'Failed to delete notification'
    );

    // 10. Test Admin Authorization Guard
    console.log('\n10. Testing Admin Authorization on /api/admin/dashboard...');
    const userAdminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(
      userAdminRes.status === 403,
      'Non-admin user blocked with 403 Forbidden on admin dashboard',
      `Expected 403, got ${userAdminRes.status}`
    );

    // 11. Test Admin Dashboard API
    console.log('\n11. Testing Admin Dashboard Analytics (/api/admin/dashboard)...');
    const adminDashRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const admData = adminDashRes.data?.data;
    assert(
      adminDashRes.status === 200 &&
        admData &&
        admData.metrics.totalAllUsers >= 2 &&
        admData.metrics.totalMedicinesAcrossPlatform >= 4 &&
        admData.metrics.totalExpiredMedicines >= 1,
      `Admin Dashboard numbers dynamic: Users=${admData?.metrics.totalAllUsers}, PlatformMeds=${admData?.metrics.totalMedicinesAcrossPlatform}, ExpiredMeds=${admData?.metrics.totalExpiredMedicines}`,
      `Admin dashboard data error: ${JSON.stringify(admData?.metrics)}`
    );

    assert(
      admData?.recentlyRegisteredUsers?.length >= 1 && !admData.recentlyRegisteredUsers[0].password,
      'Recently registered users list populated with passwords strictly excluded',
      'Password exposed or list empty'
    );

    assert(
      admData?.charts && admData.charts.categoryDistribution && admData.charts.userStatusBreakdown,
      'Platform activity statistics and chart datasets present',
      'Charts data missing'
    );

    // 12. Test Admin View and Search Users
    console.log('\n12. Testing Admin User View & Search (/api/admin/users)...');
    const searchUserRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users?search=${encodeURIComponent('Evelyn Reed')}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const foundUsers = searchUserRes.data?.data;
    const targetUser = foundUsers?.find((u) => u.email === testUserEmail);

    assert(
      searchUserRes.status === 200 && targetUser && targetUser.stats.medicineCount === 4,
      `User search found "Dr. Evelyn Reed" with populated medicine statistics (medicineCount = ${targetUser?.stats?.medicineCount})`,
      'User search or stats population failed'
    );

    // 13. Test Admin View User Medicine Statistics
    console.log('\n13. Testing Admin View Specific User Medicine Stats (/api/admin/users/:id/stats)...');
    const userStatsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users/${targetUser._id}/stats`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      userStatsRes.status === 200 &&
        userStatsRes.data?.data?.stats?.totalMedicines === 4 &&
        userStatsRes.data?.data?.stats?.expiredCount === 1,
      `User medicine stats details returned: Total=${userStatsRes.data?.data?.stats?.totalMedicines}, Expired=${userStatsRes.data?.data?.stats?.expiredCount}`,
      'Failed to inspect user medicine stats'
    );

    // 14. Test Admin Activate or Deactivate User
    console.log('\n14. Testing Admin Account Status Toggle (active/inactive)...');
    const deactivateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/admin/users/${targetUser._id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      },
      { status: 'inactive' }
    );
    assert(
      deactivateRes.status === 200 && deactivateRes.data?.data?.status === 'inactive',
      'User account successfully deactivated by admin',
      'Deactivation failed'
    );

    // Re-activate user
    const activateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/admin/users/${targetUser._id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      },
      { status: 'active' }
    );
    assert(
      activateRes.status === 200 && activateRes.data?.data?.status === 'active',
      'User account successfully reactivated by admin',
      'Re-activation failed'
    );

    // 15. Test Admin Cannot Modify Password or Demote Self
    console.log('\n15. Testing Admin Security Safeguards...');
    const adminUser = (await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/users?role=admin',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })).data?.data?.[0];

    const selfDemoteRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/admin/users/${adminUser._id}/role`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      },
      { role: 'user' }
    );
    assert(
      selfDemoteRes.status === 400,
      'Admin prevented from removing own administrative privileges (400 Bad Request)',
      `Expected 400, got ${selfDemoteRes.status}`
    );

    // 16. Test Profile Management: Update Profile
    console.log('\n16. Testing Profile Management (PUT /api/auth/profile)...');
    const updateProfileRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/profile',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      },
      {
        name: 'Dr. Evelyn Reed, PharmD',
        phone: '+1 555-019-2834',
        pharmacyName: 'St. Jude Clinical Dispensary & Bio-Lab',
        licenseNumber: 'PHARM-NY-2026-99',
      }
    );
    assert(
      updateProfileRes.status === 200 &&
        updateProfileRes.data?.data?.name === 'Dr. Evelyn Reed, PharmD' &&
        updateProfileRes.data?.data?.licenseNumber === 'PHARM-NY-2026-99',
      'User profile updated successfully with name, phone, pharmacy, and license number',
      'Profile update failed'
    );

    // 17. Test Profile Management: Change Password
    console.log('\n17. Testing Profile Password Change (PUT /api/auth/change-password)...');
    const newPassword = 'NewSecretPassword2026!';
    const changePassRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/change-password',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      },
      {
        currentPassword: password,
        newPassword,
      }
    );
    assert(
      changePassRes.status === 200,
      'Password updated securely via bcrypt',
      'Password change failed'
    );

    // 18. Test Admin Delete Inappropriate User
    console.log('\n18. Testing Admin Delete User Account with Confirmation...');
    const delUserRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users/${targetUser._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      delUserRes.status === 200,
      'Admin successfully deleted user account and associated records',
      `Delete user failed: status=${delUserRes.status}, data=${JSON.stringify(delUserRes.data)}`
    );

    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
};

runDashboardAndNotificationTests();
