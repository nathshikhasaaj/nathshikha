import express from 'express';
import { signToken } from '../server/middleware/auth.js';
import adminRoutes from '../server/routes/adminRoutes.js';
import categoryRoutes from '../server/routes/categoryRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);

const adminToken = signToken({
  id: '600000000000000000000001',
  email: 'admin@nathshikha.com',
  role: 'admin',
  name: 'Admin'
});

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminToken}`
};

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log('Testing server on ephemeral port', port);
  try {
    // 1. Test POST /api/admin/products with category: 'Traditional'
    const resTrad = await fetch(`http://localhost:${port}/api/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Reject Traditional',
        price: 999,
        mainCategory: 'Traditional',
        category: 'Traditional',
        img: '/assets/sample.jpg'
      })
    });
    const dataTrad = await resTrad.json();
    console.log('Traditional Category POST status:', resTrad.status, dataTrad);
    if (resTrad.status !== 400 || !dataTrad.error.includes('reserved for Main Categories')) {
      throw new Error('Traditional category was not rejected with 400!');
    }
    console.log('✓ PASS: Traditional category rejected with 400');

    // 2. Test POST /api/admin/products with category: 'Signature'
    const resSig = await fetch(`http://localhost:${port}/api/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Reject Signature',
        price: 999,
        mainCategory: 'Signature',
        category: 'Signature',
        img: '/assets/sample.jpg'
      })
    });
    const dataSig = await resSig.json();
    console.log('Signature Category POST status:', resSig.status, dataSig);
    if (resSig.status !== 400 || !dataSig.error.includes('reserved for Main Categories')) {
      throw new Error('Signature category was not rejected with 400!');
    }
    console.log('✓ PASS: Signature category rejected with 400');

    // 3. Test POST /api/categories/admin with name: 'Traditional'
    const resCatTrad = await fetch(`http://localhost:${port}/api/categories/admin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Traditional'
      })
    });
    const dataCatTrad = await resCatTrad.json();
    console.log('Traditional Category creation status:', resCatTrad.status, dataCatTrad);
    if (resCatTrad.status !== 400 || !dataCatTrad.error.includes('reserved for Main Categories')) {
      throw new Error('Traditional category creation was not rejected with 400!');
    }
    console.log('✓ PASS: Category creation "Traditional" rejected with 400');

    // 4. Test POST /api/categories/admin with name: 'Signature'
    const resCatSig = await fetch(`http://localhost:${port}/api/categories/admin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Signature'
      })
    });
    const dataCatSig = await resCatSig.json();
    console.log('Signature Category creation status:', resCatSig.status, dataCatSig);
    if (resCatSig.status !== 400 || !dataCatSig.error.includes('reserved for Main Categories')) {
      throw new Error('Signature category creation was not rejected with 400!');
    }
    console.log('✓ PASS: Category creation "Signature" rejected with 400');

    // 5. Test PATCH /api/admin/products/:id with category: 'Traditional'
    const resPatchTrad = await fetch(`http://localhost:${port}/api/admin/products/600000000000000000000001`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        category: 'Traditional'
      })
    });
    const dataPatchTrad = await resPatchTrad.json();
    console.log('Traditional Category PATCH status:', resPatchTrad.status, dataPatchTrad);
    if (resPatchTrad.status !== 400 || !dataPatchTrad.error.includes('reserved for Main Categories')) {
      throw new Error('Traditional category in PATCH was not rejected with 400!');
    }
    console.log('✓ PASS: Traditional category in PATCH rejected with 400');

    // 6. Test PATCH /api/admin/products/:id with category: 'Signature'
    const resPatchSig = await fetch(`http://localhost:${port}/api/admin/products/600000000000000000000001`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        category: 'Signature'
      })
    });
    const dataPatchSig = await resPatchSig.json();
    console.log('Signature Category PATCH status:', resPatchSig.status, dataPatchSig);
    if (resPatchSig.status !== 400 || !dataPatchSig.error.includes('reserved for Main Categories')) {
      throw new Error('Signature category in PATCH was not rejected with 400!');
    }
    console.log('✓ PASS: Signature category in PATCH rejected with 400');

    console.log('\n===============================================================');
    console.log('ALL API VALIDATION TESTS PASSED CLEANLY (6/6)');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
