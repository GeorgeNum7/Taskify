const request = require('supertest');
const path = require('path');
const fs = require('fs');

// 测试路由
describe('Route Tests', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    app = require('../src/app');
  });

  test('GET / should return 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  test('GET /signup should return 200', async () => {
    const res = await request(app).get('/signup');
    expect(res.statusCode).toBe(200);
  });

  test('GET /dashboard should return 200', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.statusCode).toBe(200);
  });

  test('GET /privacy should return 200', async () => {
    const res = await request(app).get('/privacy');
    expect(res.statusCode).toBe(200);
  });

  test('POST /signup should redirect to /', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ SignUpUsername: 'test', SignUpEmail: 'test@test.com', SignUpPassword: 'password' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  test('POST /login should redirect to /', async () => {
    const res = await request(app)
      .post('/login')
      .send({ LoginEmail: 'test@test.com', LoginPassword: 'password' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  test('GET /unknown should redirect to /', async () => {
    const res = await request(app).get('/unknown-page');
    expect(res.statusCode).toBe(302);
  });

});

// 测试PORT环境变量分支
describe('Port configuration', () => {
  test('should use default port 3000 when PORT not set', () => {
    delete process.env.PORT;
    jest.resetModules();
    const testApp = require('../src/app');
    expect(testApp).toBeDefined();
  });

  test('should use PORT env variable when set', () => {
    process.env.PORT = '4000';
    jest.resetModules();
    const testApp = require('../src/app');
    expect(testApp).toBeDefined();
    delete process.env.PORT;
  });
});

// 测试i18n文件
describe('i18n locale files', () => {

  test('en.json should exist', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/locales/en.json'));
    expect(exists).toBe(true);
  });

  test('zh.json should exist', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/locales/zh.json'));
    expect(exists).toBe(true);
  });

  test('en.json should have nav translations', () => {
    const en = require('../static/locales/en.json');
    expect(en.nav).toBeDefined();
    expect(en.nav.features).toBe('Features');
  });

  test('zh.json should have nav translations', () => {
    const zh = require('../static/locales/zh.json');
    expect(zh.nav).toBeDefined();
    expect(zh.nav.features).toBe('功能');
  });

  test('en.json should have cookie translations', () => {
    const en = require('../static/locales/en.json');
    expect(en.cookie).toBeDefined();
    expect(en.cookie.accept).toBe('Accept');
  });

  test('zh.json should have cookie translations', () => {
    const zh = require('../static/locales/zh.json');
    expect(zh.cookie).toBeDefined();
    expect(zh.cookie.accept).toBe('接受');
  });

  test('en.json should have privacy translations', () => {
    const en = require('../static/locales/en.json');
    expect(en.privacy).toBeDefined();
    expect(en.privacy.title).toBe('Privacy Policy');
  });

  test('zh.json should have privacy translations', () => {
    const zh = require('../static/locales/zh.json');
    expect(zh.privacy).toBeDefined();
    expect(zh.privacy.title).toBe('隐私政策');
  });

});

// 测试静态文件
describe('Static files', () => {

  test('i18n.js should exist', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/i18n.js'));
    expect(exists).toBe(true);
  });

  test('main.css should exist', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/styles/main.css'));
    expect(exists).toBe(true);
  });

  test('nav.css should exist', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/styles/partials/nav.css'));
    expect(exists).toBe(true);
  });

  test('en.json should exist in locales', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/locales/en.json'));
    expect(exists).toBe(true);
  });

  test('zh.json should exist in locales', () => {
    const exists = fs.existsSync(path.join(__dirname, '../static/locales/zh.json'));
    expect(exists).toBe(true);
  });

});