/**
 * Access Control Tests (Role 3)
 *
 * Tests that /dashboard is protected by authMiddleware:
 * - Unauthenticated users are redirected to /signup
 * - Authenticated users can access the dashboard
 * - After logout, users are redirected again
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany();
});

describe('Role 3: Broken Access Control Tests', () => {

  test('Unauthenticated GET /dashboard should redirect to /signup', async () => {
    const response = await request(app).get('/dashboard');

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/signup');
  });

  test('Authenticated user should access /dashboard successfully', async () => {
    // Create a user with hashed password
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'accessuser',
      email: 'access@test.com',
      password: hashedPassword
    });

    // Use agent to persist cookies/session across requests
    const agent = request.agent(app);

    // Login
    await agent
      .post('/login')
      .send({
        LoginEmail: 'access@test.com',
        LoginPassword: 'password123'
      });

    // Access dashboard — should succeed
    const response = await agent.get('/dashboard');
    expect(response.statusCode).toBe(200);
  });

  test('After logout, GET /dashboard should redirect to /signup', async () => {
    // Create a user
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'logoutuser',
      email: 'logout@test.com',
      password: hashedPassword
    });

    const agent = request.agent(app);

    // Login
    await agent
      .post('/login')
      .send({
        LoginEmail: 'logout@test.com',
        LoginPassword: 'password123'
      });

    // Verify dashboard is accessible
    const dashRes = await agent.get('/dashboard');
    expect(dashRes.statusCode).toBe(200);

    // Logout
    await agent.get('/logout');

    // Dashboard should now redirect (no session)
    const afterLogout = await agent.get('/dashboard');
    expect(afterLogout.statusCode).toBe(302);
    expect(afterLogout.headers.location).toBe('/signup');
  });

  test('GET /logout should redirect to /', async () => {
    const response = await request(app).get('/logout');

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
  });

  test('authMiddleware module should export a function', () => {
    const authMiddleware = require('../src/middleware/auth');
    expect(typeof authMiddleware).toBe('function');
  });

  // --- Supplementary tests: cover untested routes in app.js ---

  test('GET / should return 200 (home page)', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
  });

  test('GET /privacy should return 200', async () => {
    const response = await request(app).get('/privacy');
    expect(response.statusCode).toBe(200);
  });

  test('Unknown route should redirect to /', async () => {
    const response = await request(app).get('/this-route-does-not-exist');
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
  });

  // --- Deep Access Control Tests ---

  test('GET /signup should be accessible without authentication', async () => {
    const response = await request(app).get('/signup');
    expect(response.statusCode).toBe(200);
  });

  test('GET /login should be accessible without authentication', async () => {
    const response = await request(app).get('/login');
    expect(response.statusCode).toBe(200);
  });

  test('Dashboard should contain expected HTML content when authenticated', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'contentuser',
      email: 'content@test.com',
      password: hashedPassword
    });

    const agent = request.agent(app);
    await agent.post('/login').send({
      LoginEmail: 'content@test.com',
      LoginPassword: 'password123'
    });

    const response = await agent.get('/dashboard');
    expect(response.statusCode).toBe(200);
    // Verify it's actually the dashboard page, not a redirect or error
    expect(response.text).toContain('dashboard');
  });

  test('Session should persist across multiple dashboard requests', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'persistuser',
      email: 'persist@test.com',
      password: hashedPassword
    });

    const agent = request.agent(app);
    await agent.post('/login').send({
      LoginEmail: 'persist@test.com',
      LoginPassword: 'password123'
    });

    // Access dashboard multiple times — session should stay valid
    const res1 = await agent.get('/dashboard');
    const res2 = await agent.get('/dashboard');
    const res3 = await agent.get('/dashboard');
    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    expect(res3.statusCode).toBe(200);
  });

  test('Different users should have isolated sessions', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'userA',
      email: 'a@test.com',
      password: hashedPassword
    });
    await User.create({
      username: 'userB',
      email: 'b@test.com',
      password: hashedPassword
    });

    const agentA = request.agent(app);
    const agentB = request.agent(app);

    // User A logs in
    await agentA.post('/login').send({
      LoginEmail: 'a@test.com',
      LoginPassword: 'password123'
    });

    // User B does NOT log in
    // User A should access dashboard
    const resA = await agentA.get('/dashboard');
    expect(resA.statusCode).toBe(200);

    // User B should be blocked
    const resB = await agentB.get('/dashboard');
    expect(resB.statusCode).toBe(302);
    expect(resB.headers.location).toBe('/signup');
  });

  test('Forged or invalid session cookie should not grant access', async () => {
    // Attempt to access dashboard with a manually crafted cookie
    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', ['connect.sid=s%3Afake-session-id.invalidsignature']);

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/signup');
  });

  test('Complete lifecycle: signup → login → dashboard → logout → blocked', async () => {
    const agent = request.agent(app);

    // 1. Signup
    const signupRes = await agent.post('/signup').send({
      SignUpUsername: 'lifecycleuser',
      SignUpEmail: 'lifecycle@test.com',
      SignUpPassword: 'securePass123'
    });
    expect(signupRes.statusCode).toBe(302); // redirect to /login

    // 2. Login
    const loginRes = await agent.post('/login').send({
      LoginEmail: 'lifecycle@test.com',
      LoginPassword: 'securePass123'
    });
    expect(loginRes.statusCode).toBe(302); // redirect to /dashboard

    // 3. Access dashboard
    const dashRes = await agent.get('/dashboard');
    expect(dashRes.statusCode).toBe(200);

    // 4. Logout
    const logoutRes = await agent.get('/logout');
    expect(logoutRes.statusCode).toBe(302);
    expect(logoutRes.headers.location).toBe('/');

    // 5. Dashboard should be blocked
    const blockedRes = await agent.get('/dashboard');
    expect(blockedRes.statusCode).toBe(302);
    expect(blockedRes.headers.location).toBe('/signup');
  });

});
