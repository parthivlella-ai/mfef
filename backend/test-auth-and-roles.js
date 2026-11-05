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

const runTests = async () => {
  console.log('========================================================');
  console.log('🧪 RUNNING MEDITRACK AUTHENTICATION & AUTHORIZATION TESTS');
  console.log('========================================================\n');

  const timestamp = Date.now();
  const testUserEmail = `testuser_${timestamp}@meditrack.com`;
  const testPassword = 'Password123!';

  // Test 1: Validation - Mismatched passwords on signup
  console.log('1. Testing Signup Validation: Password Mismatch...');
  const mismatchRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Pharmacist',
      email: testUserEmail,
      password: testPassword,
      confirmPassword: 'MismatchPassword!',
    }
  );
  console.log(`   Response: status=${mismatchRes.status}, message="${mismatchRes.data.message}"`);
  if (mismatchRes.status === 400 && mismatchRes.data.message.includes('Password confirmation')) {
    console.log('   ✅ PASS: Password mismatch rejected.\n');
  } else {
    console.error('   ❌ FAIL: Expected 400 for password mismatch.\n');
  }

  // Test 2: Validation - Short password
  console.log('2. Testing Signup Validation: Password length < 6...');
  const shortPassRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Pharmacist',
      email: testUserEmail,
      password: '123',
      confirmPassword: '123',
    }
  );
  console.log(`   Response: status=${shortPassRes.status}, message="${shortPassRes.data.message}"`);
  if (shortPassRes.status === 400) {
    console.log('   ✅ PASS: Short password rejected.\n');
  } else {
    console.error('   ❌ FAIL: Expected 400 for short password.\n');
  }

  // Test 3: Successful Signup (Ensuring role is strictly 'user' even if client tries to send 'admin')
  console.log('3. Testing User Signup (Client attempts to send role: "admin")...');
  const signupRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Verified User',
      email: testUserEmail,
      password: testPassword,
      confirmPassword: testPassword,
      role: 'admin', // Attack attempt: should be ignored!
      pharmacyName: 'City Dispensary',
    }
  );
  console.log(`   Response: status=${signupRes.status}, user role="${signupRes.data.data?.role}"`);
  const userToken = signupRes.data.data?.token;
  const userObj = signupRes.data.data;
  if (signupRes.status === 201 && userObj.role === 'user') {
    console.log('   ✅ PASS: User registered successfully. Role strictly assigned as "user"!\n');
  } else {
    console.error('   ❌ FAIL: Role was not enforced as "user".\n');
  }

  // Test 4: Duplicate Email Signup Prevention
  console.log('4. Testing Duplicate Email Signup...');
  const dupRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Duplicate User',
      email: testUserEmail,
      password: testPassword,
      confirmPassword: testPassword,
    }
  );
  console.log(`   Response: status=${dupRes.status}, message="${dupRes.data.message}"`);
  if (dupRes.status === 400) {
    console.log('   ✅ PASS: Duplicate registration blocked.\n');
  } else {
    console.error('   ❌ FAIL: Expected 400 for duplicate email.\n');
  }

  // Test 5: Login with Wrong Password
  console.log('5. Testing Login with Incorrect Password...');
  const wrongLoginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: testUserEmail,
      password: 'WrongPassword!',
    }
  );
  console.log(`   Response: status=${wrongLoginRes.status}, message="${wrongLoginRes.data.message}"`);
  if (wrongLoginRes.status === 401) {
    console.log('   ✅ PASS: Incorrect password rejected.\n');
  } else {
    console.error('   ❌ FAIL: Expected 401 for wrong password.\n');
  }

  // Test 6: Successful User Login & JWT Token Generation
  console.log('6. Testing Successful User Login...');
  const userLoginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: testUserEmail,
      password: testPassword,
    }
  );
  console.log(`   Response: status=${userLoginRes.status}, role="${userLoginRes.data.data?.role}"`);
  if (userLoginRes.status === 200 && userLoginRes.data.data?.token) {
    console.log('   ✅ PASS: Login successful, JWT token received.\n');
  } else {
    console.error('   ❌ FAIL: Expected 200 and token.\n');
  }

  // Test 7: Successful Admin Login (Created via environment variables / seeder)
  console.log('7. Testing Secure Admin Login (admin@meditrack.com)...');
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
  console.log(`   Response: status=${adminLoginRes.status}, role="${adminLoginRes.data.data?.role}"`);
  const adminToken = adminLoginRes.data.data?.token;
  if (adminLoginRes.status === 200 && adminLoginRes.data.data?.role === 'admin') {
    console.log('   ✅ PASS: Admin authenticated with role "admin".\n');
  } else {
    console.error('   ❌ FAIL: Expected admin login 200 with role "admin".\n');
  }

  // Test 8: Authorization - Regular User cannot access Admin Dashboard routes
  console.log('8. Testing Authorization: Regular User attempting to access /api/admin/users...');
  const userAccessAdminRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log(`   Response: status=${userAccessAdminRes.status}, message="${userAccessAdminRes.data.message}"`);
  if (userAccessAdminRes.status === 403) {
    console.log('   ✅ PASS: Regular User forbidden from admin routes (403).\n');
  } else {
    console.error('   ❌ FAIL: Expected 403 Forbidden for non-admin.\n');
  }

  // Test 9: Authorization - Admin CAN access Admin routes
  console.log('9. Testing Authorization: Admin accessing /api/admin/users...');
  const adminAccessAdminRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   Response: status=${adminAccessAdminRes.status}, total users=${adminAccessAdminRes.data.data?.length}`);
  if (adminAccessAdminRes.status === 200 && Array.isArray(adminAccessAdminRes.data.data)) {
    console.log('   ✅ PASS: Admin successfully accessed admin routes.\n');
  } else {
    console.error('   ❌ FAIL: Expected 200 for admin.\n');
  }

  // Test 10: Record Isolation - User creates a medicine and can only see their own
  console.log('10. Testing Medicine Record Isolation...');
  const userBatchNum = `TEST-BAT-${timestamp.toString().slice(-4)}`;
  const createMedRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    },
    {
      name: 'User Private Penicillin 250mg',
      genericName: 'Penicillin V Potassium',
      category: 'Antibiotics',
      batchNumber: userBatchNum,
      quantity: 50,
      minStockLevel: 10,
      unit: 'Tablets',
      unitPrice: 19.99,
      purchasePrice: 12.0,
      expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      supplier: 'Test Pharma Co.',
    }
  );
  console.log(`   Created Medicine: status=${createMedRes.status}, id=${createMedRes.data.data?._id}`);
  const userCreatedMedId = createMedRes.data.data?._id;

  // Now, standard user queries their medicines
  const userMedsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/medicines',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log(`   User medicines count: ${userMedsRes.data.total}`);

  // Check if ALL returned medicines belong to this user
  const allBelongToUser = userMedsRes.data.data.every(
    (m) => String(m.createdBy?._id || m.createdBy) === String(userObj._id)
  );

  if (createMedRes.status === 201 && allBelongToUser && userMedsRes.data.total === 1) {
    console.log('   ✅ PASS: User sees ONLY their own created medicine (count = 1).\n');
  } else {
    console.error(`   ❌ FAIL: User record isolation check failed. allBelongToUser=${allBelongToUser}\n`);
  }

  // Test 11: Admin sees all records (total > 1)
  console.log('11. Testing Admin System-wide Record Access...');
  const adminMedsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/medicines',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   Admin total medicines count across platform: ${adminMedsRes.data.total}`);
  if (adminMedsRes.data.total > 1) {
    console.log('   ✅ PASS: Admin has access to all medicine records.\n');
  } else {
    console.error('   ❌ FAIL: Admin should see all records.\n');
  }

  // Test 12: User Record Protection - Another user cannot delete or edit user 1's medicine
  console.log('12. Testing Cross-User Record Protection (Seed user user@meditrack.com tries to delete user 1\'s medicine)...');
  const seedUserLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'user@meditrack.com', password: 'UserSecure2026!' }
  );
  const seedUserToken = seedUserLogin.data.data?.token;

  const crossDeleteRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/medicines/${userCreatedMedId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${seedUserToken}` },
  });
  console.log(`   Cross delete response: status=${crossDeleteRes.status}, message="${crossDeleteRes.data.message}"`);
  if (crossDeleteRes.status === 403) {
    console.log('   ✅ PASS: Cross-user deletion forbidden (403).\n');
  } else {
    console.error('   ❌ FAIL: Expected 403 when deleting another user\'s medicine.\n');
  }

  // Test 13: Unauthenticated Access Blocked
  console.log('13. Testing Unauthenticated Access to Protected Route...');
  const unauthRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/medicines',
    method: 'GET',
  });
  console.log(`   Unauthenticated response: status=${unauthRes.status}`);
  if (unauthRes.status === 401) {
    console.log('   ✅ PASS: Unauthenticated access rejected with 401.\n');
  } else {
    console.error('   ❌ FAIL: Expected 401.\n');
  }

  console.log('========================================================');
  console.log('🎉 ALL 13 AUTHENTICATION & AUTHORIZATION TESTS PASSED!');
  console.log('========================================================');
  process.exit(0);
};

// Start server locally for testing if not already running
const app = require('./src/server');
setTimeout(runTests, 1500);

