// scripts/test_product_modal_mobile_ui.js
import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('ADMIN PRODUCT DETAILS MODAL DESKTOP & MOBILE UI AUDIT');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

const modalJsx = fs.readFileSync(
  path.resolve('src/components/admin/AdminProductDetailsModal.jsx'),
  'utf8'
);

const modalCss = fs.readFileSync(
  path.resolve('src/components/admin/AdminProductDetailsModal.css'),
  'utf8'
);

// --- UNIVERSAL IMAGE & DATA RESILIENCE ---
it('Main image has safe onError fallback to prevent broken browser placeholder glyph', () => {
  assert(
    modalJsx.includes('onError=') &&
    modalJsx.includes('/assets/nath-category.jpg'),
    'Main image must include safe fallback handler'
  );
});

it('Thumbnails have safe onError fallback', () => {
  const matches = (modalJsx.match(/onError=/g) || []).length;
  assert(matches >= 2, 'Both main image and thumbnails must have safe fallback handlers');
});

it('Images resolution safely supports arrays, single URLs, and comma-separated strings', () => {
  assert(
    modalJsx.includes('Array.isArray(product.images)') &&
    modalJsx.includes('product.images.split(\',\')'),
    'Images resolution must parse multiple image formats safely'
  );
});

// --- DESKTOP VIEW AUDIT ---
it('Desktop modal dialog has max-width: 940px with elegant border radius and shadow', () => {
  assert(
    modalCss.includes('max-width: 940px;') &&
    modalCss.includes('border-radius: 14px;'),
    'Desktop dialog must be bounded to 940px with 14px radius'
  );
});

it('Desktop layout uses 2-column grid: 340px sticky gallery + flexible specs', () => {
  assert(
    modalCss.includes('grid-template-columns: 340px 1fr;') &&
    modalCss.includes('position: sticky;'),
    'Desktop grid must pair a 340px sticky gallery with flexible info column'
  );
});

it('Desktop stats card arranges 5 specs into a balanced 3-column grid', () => {
  assert(
    modalCss.includes('.productDetailStatsCard') &&
    modalCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'),
    'Desktop specs card must use a balanced 3-column grid'
  );
});

it('Desktop footer has clean two-sided layout: admin toggles on left, dialog actions on right', () => {
  assert(
    modalCss.includes('.productDetailFooter') &&
    modalCss.includes('justify-content: space-between;') &&
    modalCss.includes('.footerSecondaryGroup') &&
    modalCss.includes('.footerPrimaryGroup'),
    'Desktop footer must cleanly separate left and right groups across space-between'
  );
});

it('Desktop footer buttons have uniform 38px height and white-space: nowrap (no line breaks)', () => {
  assert(
    modalCss.includes('.detailFooterBtn,') &&
    modalCss.includes('height: 38px;') &&
    modalCss.includes('white-space: nowrap;'),
    'All desktop footer buttons must enforce 38px height with white-space: nowrap'
  );
});

it('Desktop description preserves intentional line breaks with white-space: pre-line', () => {
  assert(
    modalCss.includes('.productDetailDescText') &&
    modalCss.includes('white-space: pre-line;'),
    'Description must render pre-line breaks cleanly'
  );
});

// --- MOBILE VIEW AUDIT ---
it('Mobile footer arranges secondary admin buttons into 3 compact columns in Row 1', () => {
  assert(
    modalCss.includes('.footerSecondaryGroup') &&
    modalCss.includes('grid-template-columns: repeat(3, 1fr);'),
    'Row 1 must place Hide, Bestseller, and Delete side-by-side in 3 columns'
  );
});

it('Mobile footer arranges primary modal actions (Close & Edit) into Row 2', () => {
  assert(
    modalCss.includes('.footerPrimaryGroup') &&
    modalCss.includes('grid-template-columns: 1fr 1.6fr;'),
    'Row 2 must place Close and Edit Product side-by-side'
  );
});

it('Mobile image container is constrained to 200px-220px to prevent viewport blowout', () => {
  assert(
    modalCss.includes('.productDetailMainImgWrap') &&
    modalCss.includes('max-width: 220px;') &&
    modalCss.includes('max-height: 220px;'),
    'Image container must be scaled appropriately for mobile'
  );
});

it('Mobile stats card uses 2 columns instead of 1 column', () => {
  assert(
    modalCss.includes('.productDetailStatsCard') &&
    modalCss.includes('grid-template-columns: repeat(2, 1fr);'),
    'Stats card must use 2 columns on mobile devices'
  );
});

it('Mobile product title allows 2 lines of wrapping instead of premature truncation', () => {
  assert(
    modalCss.includes('.productDetailTitleGroup h2') &&
    modalCss.includes('white-space: normal;') &&
    modalCss.includes('-webkit-line-clamp: 2;'),
    'Product title must clamp cleanly across 2 lines on mobile'
  );
});

console.log('\n===============================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log('===============================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
