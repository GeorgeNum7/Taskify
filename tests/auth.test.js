const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');

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

describe('Authentication Tests', () => {

  test('User signup should succeed', async () => {

    const response = await request(app)
      .post('/signup')
      .send({
        SignUpUsername: 'testuser',
        SignUpEmail: 'test@test.com',
        SignUpPassword: 'password123'
      });

    expect(response.statusCode).toBe(302);
  });

  test('Duplicate username should fail', async () => {

    await User.create({
      username: 'testuser',
      email: 'a@test.com',
      password: 'hashedpassword'
    });

    const response = await request(app)
      .post('/signup')
      .send({
        SignUpUsername: 'testuser',
        SignUpEmail: 'b@test.com',
        SignUpPassword: 'password123'
      });

    expect(response.text).toContain('Username already exists');
  });

  test('Login with wrong password should fail', async () => {

    await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: await require('bcrypt').hash('correctpassword', 10)
    });

    const response = await request(app)
      .post('/login')
      .send({
        LoginEmail: 'test@test.com',
        LoginPassword: 'wrongpassword'
      });

    expect(response.text).toContain('Wrong password');
  });

  test('Unauthenticated dashboard access should redirect', async () => {

    const response = await request(app)
      .get('/dashboard');

    expect(response.statusCode).toBe(302);
  });

  test('GET / should return 200', async () => {

    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);

  });

  test('GET /signup should return 200', async () => {

    const response = await request(app).get('/signup');

    expect(response.statusCode).toBe(200);

  });

  test('GET /login should return 200', async () => {

    const response = await request(app).get('/login');

    expect(response.statusCode).toBe(200);

  });

  test('Duplicate email should fail', async () => {

    await User.create({
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'hashedpassword'
    });

    const response = await request(app)
        .post('/signup')
        .send({
          SignUpUsername: 'user2',
          SignUpEmail: 'duplicate@test.com',
          SignUpPassword: 'password123'
        });

    expect(response.text).toContain('Email already registered');

  });

  test('Login with non-existing user should fail', async () => {

    const response = await request(app)
      .post('/login')
      .send({
        LoginEmail: 'nouser@test.com',
        LoginPassword: 'password123'
      });

    expect(response.text).toContain('User not found');

  });

  test('Login should succeed', async () => {

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('correctpassword', 10);

    await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: hashedPassword
    });

    const response = await request(app)
      .post('/login')
      .send({
        LoginEmail: 'test@test.com',
        LoginPassword: 'correctpassword'
      });

    expect(response.statusCode).toBe(302);

  });

  test('Unknown route should redirect', async () => {

    const response = await request(app).get('/unknown');
    expect(response.statusCode).toBe(302);

  });

  test('Signup with missing fields should fail', async () => {

    const response = await request(app)
      .post('/signup')
      .send({
        SignUpUsername: '',
        SignUpEmail: '',
        SignUpPassword: ''
      });

    expect(response.statusCode).toBe(400);
    expect(response.text).toContain('All fields are required');
  });

  test('Login with missing fields should fail', async () => {

    const response = await request(app)
      .post('/login')
      .send({
        LoginEmail: '',
        LoginPassword: ''
      });

    expect(response.statusCode).toBe(400);
    expect(response.text).toContain('All fields are required');
  });

  test('Authenticated dashboard access should succeed', async () => {

  const bcrypt = require('bcrypt');

  await User.create({
    username: 'dashboarduser',
    email: 'dashboard@test.com',
    password: await bcrypt.hash('password123', 10)
  });

  const agent = request.agent(app);

  // 登录
  await agent
    .post('/login')
    .send({
    LoginEmail: 'dashboard@test.com',
    LoginPassword: 'password123'
    });

  // 访问 dashboard
  const response = await agent.get('/dashboard');
  expect(response.statusCode).toBe(200);
  });


  test('Signup server error should return 500', async () => {

  jest.spyOn(User, 'findOne').mockImplementation(() => {
    throw new Error('Database error');
  });

  const response = await request(app)
    .post('/signup')
    .send({
    SignUpUsername: 'test',
    SignUpEmail: 'test@test.com',
    SignUpPassword: 'password123'
    });

  expect(response.statusCode).toBe(500);
  expect(response.text).toContain('Signup failed');

  User.findOne.mockRestore();
  });

  test('Login server error should return 500', async () => {

  jest.spyOn(User, 'findOne').mockImplementation(() => {
    throw new Error('Database error');
  });

  const response = await request(app)
    .post('/login')
    .send({
    LoginEmail: 'test@test.com',
    LoginPassword: 'password123'
    });

  expect(response.statusCode).toBe(500);
  expect(response.text).toContain('Server error');

  User.findOne.mockRestore();
  });


});
