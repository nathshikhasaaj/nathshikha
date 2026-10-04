import 'dotenv/config';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Category } from '../server/models/Category.js';
import { ensureDefaultCategories } from '../server/routes/categoryRoutes.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        ...options
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runHttpTests() {
  console.log('================================================================');
  console.log('HTTP ENDPOINT TESTS: ADMIN CATEGORY CMS & DELETION ENDPOINTS');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const adminUser = await User.findOne({ role: 'admin' });
    const adminToken = jwt.sign(
      { id: adminUser ? adminUser._id.toString() : new mongoose.Types.ObjectId().toString(), role: 'admin' },
      secret,
      { expiresIn: '1d' }
    );

    // 1. Unauthenticated creation attempt
    console.log('1. Testing Security: Unauthenticated mutation blocked...');
    const unauthRes = await request(
      {
        path: '/api/categories/admin',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Hacked Category' }
    );
    assert(unauthRes.status === 401, `Public request cannot create categories (status: ${unauthRes.status})`);

    // 2. Admin Create Category
    console.log('\n2. Testing Admin Category Creation Endpoint...');
    const createRes = await request(
      {
        path: '/api/categories/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Http Test Collection',
        slug: 'http-test-collection',
        isActive: true,
        displayOrder: 888
      }
    );
    assert(createRes.status === 201, `Category created via HTTP API (status: ${createRes.status})`);
    assert(createRes.data.name === 'Http Test Collection', 'Response includes created category name');
    const newCatId = createRes.data.id || createRes.data._id;

    // 3. Verify in Public Categories
    console.log('\n3. Testing Public /api/categories endpoint...');
    const publicRes = await request({ path: '/api/categories', method: 'GET' });
    assert(publicRes.status === 200, 'Public categories returned 200');
    const isInPublic = publicRes.data.some((c) => c.slug === 'http-test-collection');
    assert(isInPublic, 'New active category is present in public storefront endpoint');

    // 4. Delete Category via Admin Delete Endpoint
    console.log('\n4. Testing Admin Delete Category Endpoint...');
    const deleteRes = await request({
      path: `/api/categories/admin/${newCatId}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert(deleteRes.status === 200, `Delete endpoint returned 200 (message: ${deleteRes.data.message})`);
    assert(deleteRes.data.ok === true, 'Delete response ok is true');

    // 5. Verify it is gone from both Public and Admin endpoints
    console.log('\n5. Verifying Category is Gone From Endpoints...');
    const publicAfterDel = await request({ path: '/api/categories', method: 'GET' });
    const inPublicAfterDel = publicAfterDel.data.some((c) => c.slug === 'http-test-collection');
    assert(!inPublicAfterDel, 'Deleted category is immediately gone from public /api/categories');

    const adminAfterDel = await request({
      path: '/api/categories/admin/all',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const inAdminAfterDel = adminAfterDel.data.some((c) => (c.id || c._id) === newCatId);
    assert(!inAdminAfterDel, 'Deleted category is gone from admin /api/categories/admin/all');

    // 6. Simulate Server Startup & Restart
    console.log('\n6. Simulating Backend Server Startup (ensureDefaultCategories)...');
    await ensureDefaultCategories();
    await ensureDefaultCategories();

    const adminAfterStartup = await request({
      path: '/api/categories/admin/all',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const inAdminAfterStartup = adminAfterStartup.data.some((c) => (c.id || c._id) === newCatId);
    assert(!inAdminAfterStartup, 'Deleted category NEVER resurrected after multiple server startup cycles');

    console.log('\n================================================================');
    console.log(`ALL HTTP TESTS COMPLETED: ${passed}/${passed + failed} PASSED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('HTTP test error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runHttpTests();
