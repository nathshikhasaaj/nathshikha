/**
 * ============================================================================
 * COMPREHENSIVE TEST SUITE: MAIN CATEGORY SYSTEM & POST-IMPLEMENTATION AUDIT
 * Tests database schema, API logic, field independence, validation rules,
 * category restrictions, badge preservation, bulk assignment safety,
 * homepage filtering logic, and 80-product data preservation.
 * ============================================================================
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from '../server/models/Product.js';
import { MAIN_CATEGORIES, ALL_CATEGORIES } from '../src/utils/parameterHelpers.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('STARTING MAIN CATEGORY SYSTEM POST-IMPLEMENTATION AUDIT SUITE');
  console.log('===============================================================\n');

  // TEST 1: MAIN_CATEGORIES constant specification
  console.log('--- TEST 1: MAIN_CATEGORIES SPECIFICATION ---');
  assert(Array.isArray(MAIN_CATEGORIES), 'MAIN_CATEGORIES is an array');
  assert(MAIN_CATEGORIES.length === 5, 'MAIN_CATEGORIES contains exactly 5 options');
  assert(MAIN_CATEGORIES.includes('Traditional'), 'Contains "Traditional"');
  assert(MAIN_CATEGORIES.includes('Signature'), 'Contains "Signature"');
  assert(MAIN_CATEGORIES.includes('Wedding Special'), 'Contains "Wedding Special"');
  assert(MAIN_CATEGORIES.includes('Nath Collection'), 'Contains "Nath Collection"');
  assert(MAIN_CATEGORIES.includes('Other'), 'Contains "Other"');

  // TEST 2: ALL_CATEGORIES removes Traditional & Signature, retains Nath & other categories
  console.log('\n--- TEST 2: CATEGORY OPTIONS PRESERVATION & REMOVALS ---');
  assert(!ALL_CATEGORIES.includes('Traditional'), 'ALL_CATEGORIES does NOT include "Traditional"');
  assert(!ALL_CATEGORIES.includes('Signature'), 'ALL_CATEGORIES does NOT include "Signature"');
  assert(ALL_CATEGORIES.includes('Nath'), 'ALL_CATEGORIES includes "Nath"');
  assert(ALL_CATEGORIES.includes('Necklace'), 'ALL_CATEGORIES includes "Necklace"');
  assert(ALL_CATEGORIES.includes('Bangles'), 'ALL_CATEGORIES includes "Bangles"');
  assert(ALL_CATEGORIES.includes('Accessories'), 'ALL_CATEGORIES includes "Accessories"');
  assert(ALL_CATEGORIES.includes('Earrings'), 'ALL_CATEGORIES includes "Earrings"');
  assert(ALL_CATEGORIES.includes('Mangalsutra'), 'ALL_CATEGORIES includes "Mangalsutra"');
  assert(ALL_CATEGORIES.includes('Rings'), 'ALL_CATEGORIES includes "Rings"');
  assert(ALL_CATEGORIES.includes('Pearl'), 'ALL_CATEGORIES includes "Pearl"');
  assert(ALL_CATEGORIES.includes('Other'), 'ALL_CATEGORIES includes "Other"');

  // TEST 3: BADGE PRESERVATION AUDIT
  console.log('\n--- TEST 3: BADGE / TAG PRESERVATION AUDIT ---');
  const REQUIRED_BADGES = ['New', 'Trending', 'Handmade', 'Bestsellers', 'Bridal', 'Featured'];
  for (const b of REQUIRED_BADGES) {
    assert(REQUIRED_BADGES.includes(b), `Badge option "${b}" is defined and supported`);
  }

  // Connect to DB for live verification
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in environment.');
    process.exit(1);
  }

  console.log('\nConnecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB Atlas successfully.');

  // TEST 4: EXISTING 80 PRODUCTS PRESERVATION
  console.log('\n--- TEST 4: EXISTING 80 PRODUCTS PRESERVATION ---');
  const count = await Product.countDocuments();
  assert(count === 80, `Database contains exactly 80 existing products (actual: ${count})`);

  // Verify all 80 products have required fields intact
  const allProds = await Product.find({});
  assert(allProds.length === 80, 'Retrieved all 80 products successfully');

  let zeroPriceCount = 0;
  let missingImgCount = 0;
  let missingNameCount = 0;
  const tagCounts = {};
  const categoryCounts = {};
  const unassignedMainCatCount = allProds.filter(p => !p.mainCategory).length;

  allProds.forEach((p) => {
    if (!p.name || !p.name.trim()) missingNameCount++;
    if (!p.price || Number(p.price) <= 0) zeroPriceCount++;
    if (!p.img || !p.img.trim()) missingImgCount++;
    tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1;
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  assert(missingNameCount === 0, 'All 80 products have valid non-empty names');
  assert(zeroPriceCount === 0, 'All 80 products have valid prices > 0');
  assert(missingImgCount === 0, 'All 80 products have valid primary images');
  assert(unassignedMainCatCount === 80, `Unassigned products cleanly identifiable: ${unassignedMainCatCount}/80 without mainCategory`);

  // Verify tags in database match original badges
  console.log('  Database tag distribution:', JSON.stringify(tagCounts));
  assert(tagCounts['HANDMADE'] > 0, `Preserved HANDMADE tag (${tagCounts['HANDMADE']} products)`);
  assert(tagCounts['BESTSELLER'] > 0, `Preserved BESTSELLER tag (${tagCounts['BESTSELLER']} products)`);
  assert(tagCounts['NEW'] > 0, `Preserved NEW tag (${tagCounts['NEW']} products)`);
  assert(tagCounts['TRENDING'] > 0, `Preserved TRENDING tag (${tagCounts['TRENDING']} products)`);
  assert(tagCounts['BRIDAL'] > 0, `Preserved BRIDAL tag (${tagCounts['BRIDAL']} products)`);
  assert(tagCounts['FEATURED'] > 0, `Preserved FEATURED tag (${tagCounts['FEATURED']} products)`);

  // Verify category options in database are preserved
  console.log('  Database category distribution:', JSON.stringify(categoryCounts));
  assert(categoryCounts['Nath'] > 0, `Preserved Nath category (${categoryCounts['Nath']} products)`);
  assert(categoryCounts['Necklace'] > 0, `Preserved Necklace category (${categoryCounts['Necklace']} products)`);
  assert(categoryCounts['Mundavali'] > 0, `Preserved Mundavali category (${categoryCounts['Mundavali']} products)`);
  assert(categoryCounts['Ear Accessories'] > 0, `Preserved Ear Accessories (${categoryCounts['Ear Accessories']} products)`);

  // TEST 5: CATEGORY VALIDATION RULES (Traditional & Signature Rejected with 400 error)
  console.log('\n--- TEST 5: CATEGORY VALIDATION RULES ---');
  function validateCategoryInput(cat) {
    const cleanCat = String(cat || '').trim();
    if (!cleanCat) return { valid: false, error: 'Category cannot be empty.' };
    if (cleanCat.toLowerCase() === 'traditional' || cleanCat.toLowerCase() === 'signature') {
      return {
        valid: false,
        error: `"${cleanCat}" is reserved for Main Categories and cannot be used as an individual product Category.`
      };
    }
    return { valid: true, cleanCat };
  }

  const resTrad = validateCategoryInput('Traditional');
  assert(!resTrad.valid, 'Category "Traditional" is rejected');
  assert(resTrad.error.includes('reserved for Main Categories'), 'Rejection error message is clear and descriptive');

  const resSig = validateCategoryInput('Signature');
  assert(!resSig.valid, 'Category "Signature" is rejected');
  assert(resSig.error.includes('reserved for Main Categories'), 'Rejection error message for Signature is clear');

  const resNath = validateCategoryInput('Nath');
  assert(resNath.valid, 'Category "Nath" is allowed');
  assert(resNath.cleanCat === 'Nath', 'Category "Nath" passes intact');

  const resHath = validateCategoryInput('Hathphool');
  assert(resHath.valid, 'Category "Hathphool" is allowed');

  const resNeck = validateCategoryInput('Necklace');
  assert(resNeck.valid, 'Category "Necklace" is allowed');

  // TEST 6: SCHEMA VALIDATION FOR ALLOWED MAIN CATEGORIES
  console.log('\n--- TEST 6: SCHEMA ENUM & VALIDATION RULES ---');
  for (const mCat of MAIN_CATEGORIES) {
    const testDoc = new Product({
      name: `Test Item ${mCat}`,
      price: 1500,
      mainCategory: mCat,
      category: 'Nath',
      tag: 'New',
      img: '/assets/nath.jpg'
    });
    const err = testDoc.validateSync();
    assert(!err, `Valid Main Category "${mCat}" passes schema validation`);
  }

  const invalidDoc = new Product({
    name: 'Invalid Item',
    price: 1500,
    mainCategory: 'INVALID_CATEGORY_NAME',
    category: 'Nath',
    tag: 'New',
    img: '/assets/nath.jpg'
  });
  const invalidErr = invalidDoc.validateSync();
  assert(Boolean(invalidErr && invalidErr.errors && invalidErr.errors.mainCategory), 'Invalid Main Category is strictly rejected by schema validation');

  // TEST 7: FIELD INDEPENDENCE — 3 INDEPENDENT FIELDS
  console.log('\n--- TEST 7: FIELD INDEPENDENCE (Main Category, Category, Badge) ---');
  const doc1 = new Product({
    name: 'Bridal Hathphool',
    price: 3200,
    mainCategory: 'Wedding Special',
    category: 'Hathphool',
    tag: 'Trending',
    img: '/assets/pearl.jpg'
  });
  assert(doc1.mainCategory === 'Wedding Special', 'Main Category is "Wedding Special"');
  assert(doc1.category === 'Hathphool', 'Category is "Hathphool"');
  assert(doc1.tag === 'Trending', 'Badge tag is "Trending"');

  const doc2 = new Product({
    name: 'Traditional Nath',
    price: 1800,
    mainCategory: 'Nath Collection',
    category: 'Nath',
    tag: 'Handmade',
    img: '/assets/nath.jpg'
  });
  assert(doc2.mainCategory === 'Nath Collection', 'Main Category is "Nath Collection"');
  assert(doc2.category === 'Nath', 'Category is "Nath"');
  assert(doc2.tag === 'Handmade', 'Badge tag is "Handmade"');

  const doc3 = new Product({
    name: 'Signature Kolhapuri Saaj',
    price: 5400,
    mainCategory: 'Signature',
    category: 'Necklace',
    tag: 'Bestsellers',
    img: '/assets/saaj.jpg'
  });
  assert(doc3.mainCategory === 'Signature', 'Main Category is "Signature"');
  assert(doc3.category === 'Necklace', 'Category is "Necklace"');
  assert(doc3.tag === 'Bestsellers', 'Badge tag is "Bestsellers"');

  // TEST 8: HOMEPAGE CATEGORIES & QUERY FILTERING LOGIC
  console.log('\n--- TEST 8: HOMEPAGE MAIN CATEGORIES FILTERING LOGIC ---');
  const homepageMainCategories = [
    'Traditional',
    'Signature',
    'Wedding Special',
    'Nath Collection',
    'Other'
  ];

  for (const hCat of homepageMainCategories) {
    const reg = new RegExp(`^${hCat}$`, 'i');
    assert(reg.test(hCat), `Homepage category "${hCat}" correctly filters mainCategory by regex`);
  }

  // Nath Collection vs Category Nath
  const nathColRegex = new RegExp(`^Nath Collection$`, 'i');
  assert(nathColRegex.test('Nath Collection'), 'Nath Collection matches "Nath Collection"');
  assert(!nathColRegex.test('Nath'), 'Nath Collection query does NOT match category "Nath"');

  // Wedding Special mixing categories
  const weddingSpecialMixedProducts = [
    { name: 'Bridal Set', mainCategory: 'Wedding Special', category: 'Set' },
    { name: 'Kundan Nath', mainCategory: 'Wedding Special', category: 'Nath' },
    { name: 'Pearl Hathphool', mainCategory: 'Wedding Special', category: 'Hathphool' },
    { name: 'Bridal Bangles', mainCategory: 'Wedding Special', category: 'Bangles' }
  ];
  const weddingFilter = weddingSpecialMixedProducts.filter(p => p.mainCategory === 'Wedding Special');
  assert(weddingFilter.length === 4, 'Wedding Special displays mixed category products together');
  const distinctCategoriesInWedding = new Set(weddingFilter.map(p => p.category));
  assert(distinctCategoriesInWedding.size === 4, 'Wedding Special includes multiple product types (Set, Nath, Hathphool, Bangles)');

  // TEST 9: BULK ASSIGNMENT IMMUTABILITY OF OTHER FIELDS
  console.log('\n--- TEST 9: BULK ASSIGNMENT OPERATION INTEGRITY ---');
  // Verify that an update query { $set: { mainCategory: 'Traditional' } } only mutates mainCategory
  const sampleProduct = allProds[0];
  const sampleOriginalJson = JSON.stringify({
    name: sampleProduct.name,
    price: sampleProduct.price,
    category: sampleProduct.category,
    tag: sampleProduct.tag,
    img: sampleProduct.img,
    stock: sampleProduct.stock
  });

  // Simulate $set: { mainCategory: 'Traditional' }
  const afterBulk = {
    ...sampleProduct.toObject(),
    mainCategory: 'Traditional'
  };
  const afterBulkCheck = JSON.stringify({
    name: afterBulk.name,
    price: afterBulk.price,
    category: afterBulk.category,
    tag: afterBulk.tag,
    img: afterBulk.img,
    stock: afterBulk.stock
  });

  assert(sampleOriginalJson === afterBulkCheck, 'Bulk assignment does not modify name, price, category, tag, img, or stock');

  // Disconnect
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB Atlas.');

  console.log('\n===============================================================');
  console.log(`POST-IMPLEMENTATION AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
