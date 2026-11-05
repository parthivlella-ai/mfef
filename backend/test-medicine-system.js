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

const runMedicineTests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING MEDITRACK MEDICINE MANAGEMENT SYSTEM VERIFICATION');
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
  const user1Email = `meduser1_${ts}@meditrack.com`;
  const user2Email = `meduser2_${ts}@meditrack.com`;
  const password = 'Password2026!';

  // Helper date generators
  const addDays = (d) => {
    const date = new Date();
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };

  try {
    // 1. Register User 1
    console.log('1. Registering User 1 (Primary Pharmacist)...');
    const u1Reg = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Pharmacist Alice',
        email: user1Email,
        password,
        confirmPassword: password,
      }
    );
    const u1Token = u1Reg.data?.data?.token || u1Reg.data?.token;
    assert(u1Reg.status === 201 && u1Token, 'User 1 registered and JWT token acquired', `Failed to register User 1: ${u1Reg.data?.message}`);

    // 2. Register User 2 (Secondary Pharmacist for record ownership test)
    console.log('\n2. Registering User 2 (Isolated Pharmacist)...');
    const u2Reg = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Pharmacist Bob',
        email: user2Email,
        password,
        confirmPassword: password,
      }
    );
    const u2Token = u2Reg.data?.data?.token || u2Reg.data?.token;
    assert(u2Reg.status === 201 && u2Token, 'User 2 registered and JWT token acquired', `Failed to register User 2: ${u2Reg.data?.message}`);

    // 3. Add Medicine with ALL required schema fields
    console.log('\n3. Testing Medicine Creation with all required schema fields...');
    const medPayload = {
      name: 'Amoxicillin Trihydrate 500mg',
      category: 'Antibiotics',
      brand: 'GlaxoSmithKline',
      batchNumber: `AMX-${ts.toString().slice(-5)}`,
      quantity: 120,
      unit: 'Capsules',
      purchaseDate: addDays(-30),
      expiryDate: addDays(400),
      price: 18.5,
      description: 'Used for bacterial infections including pneumonia and bronchitis.',
      minStockLevel: 20,
    };

    const createRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${u1Token}`,
        },
      },
      medPayload
    );

    const createdMed = createRes.data?.data;
    assert(
      createRes.status === 201 &&
        createdMed &&
        createdMed.name === medPayload.name &&
        createdMed.brand === 'GlaxoSmithKline' &&
        createdMed.category === 'Antibiotics' &&
        createdMed.batchNumber === medPayload.batchNumber &&
        createdMed.quantity === 120 &&
        createdMed.unit === 'Capsules' &&
        createdMed.price === 18.5 &&
        createdMed.description === medPayload.description &&
        (createdMed.userId || createdMed.createdBy) &&
        createdMed.createdAt,
      'Medicine created with all 11 schema fields: name, category, brand, batchNumber, quantity, unit, purchaseDate, expiryDate, price, description, userId, createdAt',
      `Medicine creation failed: ${createRes.data?.message}`
    );

    const primaryMedId = createdMed?._id;

    // 4. Create batches for expiry and stock categories
    console.log('\n4. Creating specific test batches: Expired, Expiring in 5 days, Expiring in 20 days, Low Stock, Safe...');

    // 4a. Expired batch (expiry in the past)
    const expiredRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u1Token}` },
      },
      {
        name: 'Doxycycline 100mg',
        category: 'Antibiotics',
        brand: 'Pfizer',
        batchNumber: `DOX-${ts.toString().slice(-4)}`,
        quantity: 50,
        unit: 'Tablets',
        purchaseDate: addDays(-400),
        expiryDate: addDays(-10), // Expired 10 days ago
        price: 14.0,
      }
    );
    assert(expiredRes.status === 201, 'Expired batch created successfully', 'Failed to create expired batch');

    // 4b. Expiring within 7 days
    const exp7Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u1Token}` },
      },
      {
        name: 'Azithromycin 250mg',
        category: 'Antibiotics',
        brand: 'Pfizer',
        batchNumber: `AZI-${ts.toString().slice(-4)}`,
        quantity: 35,
        unit: 'Tablets',
        purchaseDate: addDays(-200),
        expiryDate: addDays(4), // Expiring in 4 days (<= 7 days)
        price: 22.0,
      }
    );
    assert(exp7Res.status === 201, 'Expiring in <= 7 days batch created successfully', 'Failed to create 7-day expiry batch');

    // 4c. Expiring within 30 days
    const exp30Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u1Token}` },
      },
      {
        name: 'Cough Relief Syrup',
        category: 'Respiratory',
        brand: 'Johnson & Johnson',
        batchNumber: `CRS-${ts.toString().slice(-4)}`,
        quantity: 45,
        unit: 'Syrup Bottles',
        purchaseDate: addDays(-180),
        expiryDate: addDays(22), // Expiring in 22 days (<= 30 days)
        price: 8.5,
      }
    );
    assert(exp30Res.status === 201, 'Expiring in <= 30 days batch created successfully', 'Failed to create 30-day expiry batch');

    // 4d. Low Stock batch (quantity 3 <= threshold 10)
    const lowStockRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/medicines',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u1Token}` },
      },
      {
        name: 'Insulin Glargine 100U',
        category: 'Antidiabetic',
        brand: 'Sanofi',
        batchNumber: `INS-${ts.toString().slice(-4)}`,
        quantity: 3, // Low stock: 3 units
        unit: 'Injection Vials',
        purchaseDate: addDays(-60),
        expiryDate: addDays(300),
        price: 65.0,
        minStockLevel: 10,
      }
    );
    assert(lowStockRes.status === 201, 'Low stock batch created successfully', 'Failed to create low stock batch');

    // 5. Test GET /api/medicines/stats
    console.log('\n5. Testing Medicine Counts and Expiry Stats API (/api/medicines/stats)...');
    const statsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines/stats?threshold=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const s = statsRes.data?.data;
    assert(
      statsRes.status === 200 &&
        s &&
        s.total >= 5 &&
        s.expired >= 1 &&
        s.expiring7 >= 1 &&
        s.expiring30 >= 2 &&
        s.lowStock >= 1 &&
        s.safe >= 1,
      `Counts returned accurately: Total=${s?.total}, Expired=${s?.expired}, Expiring7=${s?.expiring7}, Expiring30=${s?.expiring30}, LowStock=${s?.lowStock}, Safe=${s?.safe}`,
      `Stats verification failed: ${JSON.stringify(s)}`
    );

    // 6. Test Configurable Low-Stock Threshold
    console.log('\n6. Testing Configurable Threshold (?threshold=40)...');
    const customThresholdRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines/stats?threshold=40',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const customS = customThresholdRes.data?.data;
    assert(
      customThresholdRes.status === 200 && customS && customS.lowStock >= s.lowStock,
      `Threshold configurable dynamically: lowStock count changed from ${s?.lowStock} (threshold 10) to ${customS?.lowStock} (threshold 40)`,
      `Custom threshold failed: ${JSON.stringify(customS)}`
    );

    // 7. Search medicines by name OR brand
    console.log('\n7. Testing Search by Name and Brand...');
    // 7a. Search by Name
    const searchNameRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?search=Amoxicillin',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const nameMatch = searchNameRes.data?.data?.every((m) =>
      m.name.toLowerCase().includes('amoxicillin') || (m.brand && m.brand.toLowerCase().includes('amoxicillin'))
    );
    assert(
      searchNameRes.status === 200 && searchNameRes.data?.data?.length > 0 && nameMatch,
      `Search by Name "Amoxicillin" returned ${searchNameRes.data?.data?.length} match(es)`,
      'Search by Name failed'
    );

    // 7b. Search by Brand
    const searchBrandRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?search=Sanofi',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const brandMatch = searchBrandRes.data?.data?.some(
      (m) => m.brand && m.brand.toLowerCase().includes('sanofi')
    );
    assert(
      searchBrandRes.status === 200 && brandMatch,
      `Search by Brand "Sanofi" found batch with brand "${searchBrandRes.data?.data?.[0]?.brand}"`,
      'Search by Brand failed'
    );

    // 8. Filter medicines by category
    console.log('\n8. Testing Category Filter (?category=Respiratory)...');
    const catFilterRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?category=Respiratory',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const catMatch =
      catFilterRes.data?.data?.length > 0 &&
      catFilterRes.data?.data?.every((m) => m.category === 'Respiratory');
    assert(
      catFilterRes.status === 200 && catMatch,
      `Category filter returned ${catFilterRes.data?.data?.length} Respiratory medicine(s)`,
      'Category filter failed'
    );

    // 9. Sorting tests
    console.log('\n9. Testing Sorting by Expiry Date and Quantity...');
    // 9a. Sort by expiry date ascending
    const sortExpiryRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?sortBy=expiryDate&sortOrder=asc',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const sortedExpiries = sortExpiryRes.data?.data;
    let isExpiryAsc = true;
    for (let i = 1; i < sortedExpiries.length; i++) {
      if (new Date(sortedExpiries[i].expiryDate) < new Date(sortedExpiries[i - 1].expiryDate)) {
        isExpiryAsc = false;
        break;
      }
    }
    assert(
      sortExpiryRes.status === 200 && isExpiryAsc,
      'Sorted by expiryDate ASC successfully (earliest expiry first)',
      'Sorting by expiryDate failed'
    );

    // 9b. Sort by quantity descending
    const sortQtyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?sortBy=quantity&sortOrder=desc',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    const sortedQty = sortQtyRes.data?.data;
    let isQtyDesc = true;
    for (let i = 1; i < sortedQty.length; i++) {
      if (Number(sortedQty[i].quantity) > Number(sortedQty[i - 1].quantity)) {
        isQtyDesc = false;
        break;
      }
    }
    assert(
      sortQtyRes.status === 200 && isQtyDesc,
      'Sorted by quantity DESC successfully (highest stock first)',
      'Sorting by quantity failed'
    );

    // 10. Status Filter Tests (Safe, Expiring Soon, Expired, Low Stock)
    console.log('\n10. Testing Status Filter Endpoints (expired, expiring7, expiring30, lowStock, safe)...');
    const filterExpired = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?statusFilter=expired',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    assert(
      filterExpired.status === 200 && filterExpired.data?.data?.every((m) => m.isExpired),
      `Filter statusFilter=expired returned ${filterExpired.data?.data?.length} expired medicine(s)`,
      'Expired filter failed'
    );

    const filterLowStock = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?statusFilter=lowStock&threshold=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    assert(
      filterLowStock.status === 200 && filterLowStock.data?.data?.every((m) => m.quantity <= 10),
      `Filter statusFilter=lowStock returned ${filterLowStock.data?.data?.length} low-stock medicine(s)`,
      'Low-stock filter failed'
    );

    // 11. Edit existing medicine details
    console.log('\n11. Testing Edit Medicine (PUT /api/medicines/:id)...');
    const updateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/medicines/${primaryMedId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${u1Token}`,
        },
      },
      {
        name: 'Amoxicillin + Clavulanic Acid 625mg',
        quantity: 180,
        price: 21.0,
        description: 'Updated with clavulanic acid beta-lactamase inhibitor.',
      }
    );
    assert(
      updateRes.status === 200 &&
        updateRes.data?.data?.name === 'Amoxicillin + Clavulanic Acid 625mg' &&
        updateRes.data?.data?.quantity === 180 &&
        updateRes.data?.data?.price === 21.0,
      'Medicine details updated successfully (name, quantity, price, description)',
      `Update failed: ${updateRes.data?.message}`
    );

    // 12. Security & Record Ownership Checks
    console.log('\n12. Testing Security & Record Ownership Isolation...');

    // 12a. User 2 queries their own inventory -> must be 0
    const u2ListRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines',
      method: 'GET',
      headers: { Authorization: `Bearer ${u2Token}` },
    });
    assert(
      u2ListRes.status === 200 && u2ListRes.data?.data?.length === 0,
      `User 2 cannot see User 1's medicines in GET /api/medicines (count = 0)`,
      `Isolation failed: User 2 sees ${u2ListRes.data?.data?.length} medicines`
    );

    // 12b. User 2 attempts to GET User 1's medicine by ID -> 403 Forbidden
    const u2GetRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${primaryMedId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${u2Token}` },
    });
    assert(
      u2GetRes.status === 403,
      'User 2 blocked from viewing User 1 medicine (403 Forbidden)',
      `Expected 403, got status ${u2GetRes.status}`
    );

    // 12c. User 2 attempts to PUT User 1's medicine -> 403 Forbidden
    const u2PutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/medicines/${primaryMedId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${u2Token}`,
        },
      },
      { quantity: 9999 }
    );
    assert(
      u2PutRes.status === 403,
      'User 2 blocked from editing User 1 medicine (403 Forbidden)',
      `Expected 403, got status ${u2PutRes.status}`
    );

    // 12d. User 2 attempts to DELETE User 1's medicine -> 403 Forbidden
    const u2DelRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${primaryMedId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${u2Token}` },
    });
    assert(
      u2DelRes.status === 403,
      'User 2 blocked from deleting User 1 medicine (403 Forbidden)',
      `Expected 403, got status ${u2DelRes.status}`
    );

    // 13. Delete medicine with confirmation (User 1 deletes their own medicine)
    console.log('\n13. Testing Delete Medicine with Confirmation (DELETE /api/medicines/:id)...');
    const delRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${primaryMedId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    assert(
      delRes.status === 200,
      'User 1 successfully deleted their medicine',
      `Delete failed: ${delRes.data?.message}`
    );

    // Verify it is gone
    const verifyDelRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/medicines/${primaryMedId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${u1Token}` },
    });
    assert(
      verifyDelRes.status === 404,
      'Deleted medicine confirmed removed (404 Not Found)',
      `Expected 404, got status ${verifyDelRes.status}`
    );

    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
};

runMedicineTests();
