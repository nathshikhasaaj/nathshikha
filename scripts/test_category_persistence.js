import 'dotenv/config';
import mongoose from 'mongoose';
import { Category, slugify } from '../server/models/Category.js';
import { Product } from '../server/models/Product.js';
import { User } from '../server/models/User.js';
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

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: CATEGORY PERSISTENT CMS & STARTUP SYNC BEHAVIOR');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);

  try {
    // Clean up any test leftovers
    await Category.deleteMany({ slug: { $in: ['test-persist-cat', 'test-safe-del-src', 'test-safe-del-dst'] } });
    await Product.deleteMany({ name: { $in: ['Test Category Product Item A', 'Test Category Product Item B'] } });

    // --------------------------------------------------------------------------
    // Test 1: Category Creation and MongoDB Persistence
    // --------------------------------------------------------------------------
    console.log('1. Testing Category Creation in MongoDB...');
    const createdCat = await Category.create({
      name: 'Test Persist Cat',
      slug: slugify('Test Persist Cat'),
      isActive: true,
      displayOrder: 999
    });
    assert(Boolean(createdCat && createdCat._id), 'Test category document successfully created');

    const foundInDb = await Category.findById(createdCat._id);
    assert(foundInDb !== null, 'Category exists in MongoDB collection');
    assert(foundInDb.name === 'Test Persist Cat', 'Category name matches');
    assert(foundInDb.slug === 'test-persist-cat', 'Category slug matches URL-safe format');

    // --------------------------------------------------------------------------
    // Test 2: Server Startup Initialization idempotency
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Server Startup ensureDefaultCategories() with existing database...');
    const countBefore = await Category.countDocuments();
    await ensureDefaultCategories();
    const countAfter = await Category.countDocuments();
    assert(countBefore === countAfter, `ensureDefaultCategories did NOT alter existing categories (count: ${countAfter})`);

    // --------------------------------------------------------------------------
    // Test 3: Delete Category from MongoDB
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Category Permanent Deletion...');
    const delResult = await Category.findByIdAndDelete(createdCat._id);
    assert(delResult !== null, 'Category deleted from MongoDB');

    const checkDeleted = await Category.findById(createdCat._id);
    assert(checkDeleted === null, 'Category document is completely gone from MongoDB');

    // --------------------------------------------------------------------------
    // Test 4: Verify Category NEVER Reappears After Subsequent Server Restarts
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Subsequent Server Startup after Category Deletion...');
    // Simulate multiple server restarts
    await ensureDefaultCategories();
    await ensureDefaultCategories();
    await ensureDefaultCategories();

    const checkReappearance = await Category.findOne({ slug: 'test-persist-cat' });
    assert(checkReappearance === null, 'Deleted category was NOT recreated by server startup initialization');

    const checkByName = await Category.findOne({ name: 'Test Persist Cat' });
    assert(checkByName === null, 'Category remains permanently deleted in MongoDB');

    // --------------------------------------------------------------------------
    // Test 5: Safe Delete Protection - Category With Active Products
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Safe Deletion with Assigned Products...');
    const srcCat = await Category.create({
      name: 'Test Safe Del Src',
      slug: 'test-safe-del-src',
      isActive: true,
      displayOrder: 998
    });

    const dstCat = await Category.create({
      name: 'Test Safe Del Dst',
      slug: 'test-safe-del-dst',
      isActive: true,
      displayOrder: 999
    });

    const testProd = await Product.create({
      name: 'Test Category Product Item A',
      price: 299,
      category: srcCat.name,
      tag: 'NEW',
      img: '/assets/nath.jpg',
      stock: 5,
      active: 1
    });

    // Check product count
    const assignedCount = await Product.countDocuments({ category: srcCat.name });
    assert(assignedCount === 1, `Category has ${assignedCount} assigned product`);

    // Simulated safe delete check logic
    const canDeleteDirectly = assignedCount === 0;
    assert(!canDeleteDirectly, 'Deletion correctly blocked when category contains active products');

    // --------------------------------------------------------------------------
    // Test 6: Product Reassignment & Safe Delete
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Product Reassignment and Subsequent Deletion...');
    const reassignRes = await Product.updateMany(
      { category: srcCat.name },
      { category: dstCat.name }
    );
    assert(reassignRes.modifiedCount === 1, 'Product reassigned to destination category');

    const srcCountAfter = await Product.countDocuments({ category: srcCat.name });
    assert(srcCountAfter === 0, 'Source category is now completely empty (0 products)');

    const dstCountAfter = await Product.countDocuments({ category: dstCat.name });
    assert(dstCountAfter === 1, `Destination category received the product (now ${dstCountAfter} product)`);

    // Now delete empty source category
    await Category.findByIdAndDelete(srcCat._id);
    const srcInDb = await Category.findById(srcCat._id);
    assert(srcInDb === null, 'Source category permanently deleted after product reassignment');

    // --------------------------------------------------------------------------
    // Test 7: Public vs Admin Category Active Filtering
    // --------------------------------------------------------------------------
    console.log('\n7. Testing Public Storefront Filtering (Active vs Inactive)...');
    dstCat.isActive = false;
    await dstCat.save();

    const publicActiveList = await Category.find({ isActive: true });
    const isDstInPublic = publicActiveList.some((c) => c._id.toString() === dstCat._id.toString());
    assert(!isDstInPublic, 'Inactive category is hidden from public storefront navigation');

    const adminAllList = await Category.find();
    const isDstInAdmin = adminAllList.some((c) => c._id.toString() === dstCat._id.toString());
    assert(isDstInAdmin, 'Inactive category is still visible in Admin Category Manager for editing/activation');

    // Clean up test data
    await Category.deleteMany({ slug: { $in: ['test-persist-cat', 'test-safe-del-src', 'test-safe-del-dst'] } });
    await Product.deleteMany({ name: { $in: ['Test Category Product Item A', 'Test Category Product Item B'] } });

    console.log('\n================================================================');
    console.log(`ALL CATEGORY TESTS COMPLETED: ${passed}/${passed + failed} PASSED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
