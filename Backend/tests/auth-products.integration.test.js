const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';

const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const LoginSession = require('../src/models/LoginSession');
const AuditLog = require('../src/models/AuditLog');

let mongoServer;

const registerUser = async ({ email, nombre = 'Usuario Test', password = 'Password1234', extra = {} }) => {
  const response = await request(app).post('/api/auth/register').send({
    nombre,
    email,
    password,
    ...extra
  });
  return response;
};

const loginUser = async ({ email, password = 'Password1234' }) => {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  return response;
};

const createUserAndToken = async (email) => {
  const targetEmail = email || `user_${Date.now()}_${Math.floor(Math.random() * 1000)}@mail.com`;
  const registerResponse = await registerUser({ email: targetEmail });

  return {
    user: registerResponse.body.user,
    token: registerResponse.body.token,
    email: targetEmail
  };
};

const createAdminAndToken = async () => {
  const adminEmail = `admin_${Date.now()}_${Math.floor(Math.random() * 1000)}@mail.com`;
  const registerResponse = await registerUser({ email: adminEmail });
  await User.updateOne({ email: adminEmail }, { role: 'admin' });
  const loginResponse = await loginUser({ email: adminEmail });

  return {
    user: loginResponse.body.user,
    token: loginResponse.body.token,
    email: adminEmail,
    userId: registerResponse.body.user.id
  };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    LoginSession.deleteMany({}),
    AuditLog.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth + Roles + Catalog + Cart + Admin API', () => {
  test('creates users with default role "user" even if payload tries admin', async () => {
    const response = await registerUser({
      email: 'normal@mail.com',
      extra: { role: 'admin' }
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.role).toBe('user');
  });

  test('rejects login with wrong password', async () => {
    await registerUser({ email: 'login@mail.com' });

    const response = await loginUser({
      email: 'login@mail.com',
      password: 'invalidpass'
    });

    expect(response.statusCode).toBe(401);
  });

  test('catalog remains public and accessible without login', async () => {
    const response = await request(app).get('/api/products').query({ limit: 5 });
    expect(response.statusCode).toBe(200);
  });

  test('non-admin cannot create products and admin can', async () => {
    const normal = await createUserAndToken();
    const admin = await createAdminAndToken();

    const payload = {
      nombre: 'Playera test',
      descripcion: 'Descripcion suficiente para validar creacion de producto',
      precio: 250,
      stock: 3,
      tipo: 'producto',
      categoria: 'playeras'
    };

    const forbidden = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${normal.token}`)
      .send(payload);

    const allowed = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(payload);

    expect(forbidden.statusCode).toBe(403);
    expect(allowed.statusCode).toBe(201);
  });

  test('admin can update and delete products', async () => {
    const admin = await createAdminAndToken();

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre: 'Tenis update',
        descripcion: 'Producto para validar update y delete en panel admin',
        precio: 900,
        stock: 10,
        tipo: 'producto',
        categoria: 'calzado'
      });

    const productId = created.body.product._id;

    const updated = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ precio: 0, stock: 0 });

    const removed = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(updated.statusCode).toBe(200);
    expect(updated.body.product.precio).toBe(0);
    expect(updated.body.product.stock).toBe(0);
    expect(removed.statusCode).toBe(200);
  });

  test('cart endpoints require authentication', async () => {
    const response = await request(app).get('/api/cart');
    expect(response.statusCode).toBe(401);
  });

  test('authenticated user can add/update/remove cart items', async () => {
    const admin = await createAdminAndToken();
    const user = await createUserAndToken();

    const product = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre: 'Mochila',
        descripcion: 'Mochila resistente para transportar articulos personales',
        precio: 300,
        stock: 10,
        tipo: 'producto',
        categoria: 'accesorios'
      });

    const productId = product.body.product._id;

    const added = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, quantity: 2 });

    const itemId = added.body.cart.items[0].itemId;

    const updated = await request(app)
      .put(`/api/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ quantity: 1 });

    const removed = await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(added.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(removed.statusCode).toBe(200);
    expect(removed.body.cart.items).toHaveLength(0);
  });

  test('prevents overselling in concurrent checkout with one stock', async () => {
    const admin = await createAdminAndToken();
    const buyer1 = await createUserAndToken();
    const buyer2 = await createUserAndToken();

    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre: 'Ultima pieza',
        descripcion: 'Producto unico para probar checkout concurrente',
        precio: 500,
        stock: 1,
        tipo: 'producto',
        categoria: 'accesorios'
      });

    const productId = productResponse.body.product._id;

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyer1.token}`)
      .send({ productId, quantity: 1 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyer2.token}`)
      .send({ productId, quantity: 1 });

    const [checkout1, checkout2] = await Promise.all([
      request(app).post('/api/cart/checkout').set('Authorization', `Bearer ${buyer1.token}`),
      request(app).post('/api/cart/checkout').set('Authorization', `Bearer ${buyer2.token}`)
    ]);

    const statusCodes = [checkout1.statusCode, checkout2.statusCode].sort();
    const productInDb = await Product.findById(productId);

    expect(statusCodes).toEqual([200, 409]);
    expect(productInDb.stock).toBe(0);
  });

  test('admin can list sessions, users and update roles', async () => {
    const admin = await createAdminAndToken();
    const normal = await createUserAndToken();

    await loginUser({ email: normal.email });

    const users = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`);

    const sessions = await request(app)
      .get('/api/admin/sessions')
      .set('Authorization', `Bearer ${admin.token}`);

    const updatedRole = await request(app)
      .patch(`/api/admin/users/${normal.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'admin' });

    expect(users.statusCode).toBe(200);
    expect(sessions.statusCode).toBe(200);
    expect(sessions.body.sessions.length).toBeGreaterThan(0);
    expect(typeof sessions.body.sessions[0].isActive).toBe('boolean');
    expect(updatedRole.statusCode).toBe(200);
    expect(updatedRole.body.user.role).toBe('admin');
  });

  test('admin can create users with selected role', async () => {
    const admin = await createAdminAndToken();

    const response = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre: 'Nuevo Admin',
        email: 'nuevo_admin@mail.com',
        password: 'Password1234',
        role: 'admin'
      });

    const createdUser = await User.findOne({ email: 'nuevo_admin@mail.com' });
    expect(response.statusCode).toBe(201);
    expect(createdUser).not.toBeNull();
    expect(createdUser.role).toBe('admin');
  });

  test('non-admin cannot access admin endpoints', async () => {
    const normal = await createUserAndToken();

    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${normal.token}`);

    expect(response.statusCode).toBe(403);
  });

  test('creates audit logs for critical actions', async () => {
    const admin = await createAdminAndToken();
    const normal = await createUserAndToken();

    await request(app)
      .patch(`/api/admin/users/${normal.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'admin' });

    const logsResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.token}`);

    const hasRoleUpdateLog = logsResponse.body.logs.some((log) => log.action === 'admin.user.role_updated');
    expect(logsResponse.statusCode).toBe(200);
    expect(hasRoleUpdateLog).toBe(true);
  });

  test('supports cart operations by exact size selection', async () => {
    const admin = await createAdminAndToken();
    const user = await createUserAndToken();

    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        nombre: 'Sudadera Size Test',
        descripcion: 'Producto para validar seleccion exacta de tallas en el carrito',
        precio: 799,
        tipo: 'producto',
        categoria: 'ropa',
        segmento: 'hombre',
        tallas: [
          { talla: 'M', stock: 3 },
          { talla: 'L', stock: 2 }
        ]
      });

    const productId = productResponse.body.product._id;

    const addResponse = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        productId,
        talla: 'L',
        quantity: 2
      });

    expect(addResponse.statusCode).toBe(200);
    expect(addResponse.body.cart.items[0].talla).toBe('L');

    const oversellResponse = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        productId,
        talla: 'L',
        quantity: 1
      });

    expect(oversellResponse.statusCode).toBe(409);
  });

  test('admin can delete user account with related history', async () => {
    const admin = await createAdminAndToken();
    const normal = await createUserAndToken();

    await loginUser({ email: normal.email });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${normal.token}`)
      .send({
        productId: (await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${admin.token}`)
          .send({
            nombre: 'Producto temporal',
            descripcion: 'Producto temporal para probar borrado de cuenta e historial',
            precio: 120,
            stock: 5,
            tipo: 'producto',
            categoria: 'otros'
          })).body.product._id,
        quantity: 1
      });

    const deleteResponse = await request(app)
      .delete(`/api/admin/users/${normal.user.id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    const deletedUser = await User.findById(normal.user.id);
    const deletedSessions = await LoginSession.find({ user: normal.user.id });
    const deletedLogs = await AuditLog.find({ user: normal.user.id });

    expect(deleteResponse.statusCode).toBe(200);
    expect(deletedUser).toBeNull();
    expect(deletedSessions).toHaveLength(0);
    expect(deletedLogs).toHaveLength(0);
  });

  test('admin can seed demo catalog by segments', async () => {
    const admin = await createAdminAndToken();

    const response = await request(app)
      .post('/api/admin/seed-products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ count: 15 });

    const seededProducts = await Product.find({ activo: true });
    const hasSizes = seededProducts.some((product) => Array.isArray(product.tallas) && product.tallas.length > 0);
    const segments = new Set(seededProducts.map((product) => product.segmento));

    expect(response.statusCode).toBe(201);
    expect(seededProducts.length).toBe(15);
    expect(hasSizes).toBe(true);
    expect(segments.size).toBeGreaterThan(2);
  });
});
