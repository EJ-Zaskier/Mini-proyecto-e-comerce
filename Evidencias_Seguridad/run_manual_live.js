const fs = require('fs');
const path = require('path');
const request = require(path.resolve(__dirname, '../Backend/node_modules/supertest'));
const mongoose = require(path.resolve(__dirname, '../Backend/node_modules/mongoose'));
const { MongoMemoryServer } = require(path.resolve(__dirname, '../Backend/node_modules/mongodb-memory-server'));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'manual_test_secret';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';

const app = require('../Backend/src/app');
const User = require('../Backend/src/models/User');

(async () => {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  try {
    const results = {};

    const sqli = await request(app).post('/api/auth/register').send({
      nombre: 'Tester',
      email: "' OR '1'='1",
      password: 'Password1234'
    });

    results.sqlInjection = {
      endpoint: 'POST /api/auth/register',
      payload: "' OR '1'='1",
      status: sqli.statusCode,
      blocked: sqli.statusCode === 400,
      message: sqli.body?.message || ''
    };

    const registered = await request(app).post('/api/auth/register').send({
      nombre: 'Usuario XSS',
      email: 'xss_user@mail.com',
      password: 'Password1234'
    });

    const token = registered.body?.token;
    const payload = "<script>alert('XSS')</script>";

    const xssCreate = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ contenido: payload });

    const xssList = await request(app)
      .get('/api/comments')
      .set('Authorization', `Bearer ${token}`);

    results.xss = {
      endpoint: 'POST/GET /api/comments',
      payload,
      createStatus: xssCreate.statusCode,
      listStatus: xssList.statusCode,
      persistedAsText: (xssList.body?.comments || []).some(c => c?.contenido === payload)
    };

    await User.updateOne({ email: 'xss_user@mail.com' }, { role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'xss_user@mail.com', password: 'Password1234' });
    const adminToken = adminLogin.body?.token;

    const invalidProduct = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'X', descripcion: 'corta', precio: -1, stock: -2, tipo: 'hack', categoria: 'invalid' });

    results.inputValidation = {
      endpoint: 'POST /api/products',
      status: invalidProduct.statusCode,
      blocked: invalidProduct.statusCode === 400,
      errorsCount: Array.isArray(invalidProduct.body?.errors) ? invalidProduct.body.errors.length : 0
    };

    const normal = await request(app).post('/api/auth/register').send({ nombre: 'Normal', email: 'normal@mail.com', password: 'Password1234' });
    const noAdmin = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${normal.body?.token}`);

    results.accessControl = {
      endpoint: 'GET /api/admin/users',
      status: noAdmin.statusCode,
      blocked: noAdmin.statusCode === 403,
      message: noAdmin.body?.message || ''
    };

    const corsOk = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    const corsBad = await request(app).get('/api/health').set('Origin', 'http://evil.example.com');

    results.cors = {
      allowedOriginStatus: corsOk.statusCode,
      allowedOriginHeader: corsOk.headers['access-control-allow-origin'] || null,
      blockedOriginStatus: corsBad.statusCode,
      blockedOriginMessage: corsBad.body?.message || ''
    };

    const health = await request(app).get('/api/health');
    results.securityHeaders = {
      status: health.statusCode,
      hasCsp: Boolean(health.headers['content-security-policy']),
      hasXFrameOptions: Boolean(health.headers['x-frame-options']),
      hasXContentTypeOptions: Boolean(health.headers['x-content-type-options']),
      xPoweredByPresent: Boolean(health.headers['x-powered-by'])
    };

    const outPath = path.resolve(__dirname, '05_manual_security_tests.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');

    console.log('\n=== RESULTADOS PRUEBAS MANUALES ===');
    console.log(JSON.stringify(results, null, 2));
    console.log(`\nArchivo actualizado: ${outPath}`);
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

