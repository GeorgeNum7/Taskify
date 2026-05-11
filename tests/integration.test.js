const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cheerio = require('cheerio');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;

// 物理层隔离：启动内存数据库，防止污染宿主机真实数据
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

// 测试结束后物理销毁
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany();
});

describe('System Integration Suite: Auth + CSRF + Access Control', () => {

    test('Phase 1: Full Legitimate User Lifecycle (Signup -> Login -> Dashboard -> Logout -> Blocked)', async () => {
        const agent = request.agent(app); // 使用 agent 自动持久化 Session 和 Cookie
        
        // 动作 1: 获取注册页面的 CSRF Token
        const signupPageRes = await agent.get('/signup');
        expect(signupPageRes.statusCode).toBe(200);
        let $ = cheerio.load(signupPageRes.text);
        const signupCsrfToken = $('input[name="_csrf"]').val();
        expect(signupCsrfToken).toBeDefined();

        // 动作 2: 携带合法 Token 提交注册 (验证 Role 1 + Role 2 融合)
        const signupRes = await agent.post('/signup').send({
            _csrf: signupCsrfToken,
            SignUpUsername: 'integration_user',
            SignUpEmail: 'e2e@test.com',
            SignUpPassword: 'securePassword123'
        });
        expect(signupRes.statusCode).toBe(302); // 假设注册成功后重定向

        // 动作 3: 获取登录页面的 CSRF Token
        // 注：部分架构重定向后直接到主页，此处模拟点击登录页
        const loginPageRes = await agent.get('/login');
        $ = cheerio.load(loginPageRes.text);
        const loginCsrfToken = $('input[name="_csrf"]').val();

        // 动作 4: 携带合法 Token 提交登录
        const loginRes = await agent.post('/login').send({
            _csrf: loginCsrfToken,
            LoginEmail: 'e2e@test.com',
            LoginPassword: 'securePassword123'
        });
        expect(loginRes.statusCode).toBe(302);

        // 动作 5: 访问受保护的仪表盘 (验证 Role 3 放行)
        const dashRes = await agent.get('/dashboard');
        expect(dashRes.statusCode).toBe(200);

        // 动作 6: 执行注销
        const logoutRes = await agent.get('/logout');
        expect(logoutRes.statusCode).toBe(302);

        // 动作 7: 验证越权拦截 (Role 3 拦截未授权访问)
        const blockedDashRes = await agent.get('/dashboard');
        expect(blockedDashRes.statusCode).toBe(302);
        expect(blockedDashRes.headers.location).toBe('/signup'); // 或您设定的拦截跳转路由
    });

    test('Phase 2: Attack Vectors & Middleware Interception', async () => {
        const agent = request.agent(app);

        // 攻击场景 1: 无 CSRF Token 提交登录 (验证 Role 2 优先拦截)
        const csrfAttackRes = await agent.post('/login').send({
            LoginEmail: 'e2e@test.com',
            LoginPassword: 'securePassword123'
        });
        expect(csrfAttackRes.statusCode).toBe(403);
        expect(csrfAttackRes.text).toContain('invalid csrf token');

        // 攻击场景 2: 未登录状态直接强制访问仪表盘 (验证 Role 3 拦截)
        const accessAttackRes = await request(app).get('/dashboard');
        expect(accessAttackRes.statusCode).toBe(302);
        expect(accessAttackRes.headers.location).toBe('/signup');

        // 攻击场景 3: 伪造篡改的 Session Cookie 访问 (验证 Role 1 防护)
        const sessionAttackRes = await request(app)
            .get('/dashboard')
            .set('Cookie', ['connect.sid=s%3Afake-session-id.invalidsignature']);
        expect(sessionAttackRes.statusCode).toBe(302);
    });

    test('Phase 3: Static & i18n Integrity (Role 4)', async () => {
        // 验证前端国际化和静态文件挂载正常
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        
        const zhLocale = require('../static/locales/zh.json');
        expect(zhLocale.privacy).toBeDefined();
    });
});