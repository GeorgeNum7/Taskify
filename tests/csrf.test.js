const request = require('supertest');
const cheerio = require('cheerio');
const app = require('../src/app'); 

describe('CSRF Protection Security Suite', () => {
    let csrfToken;
    let sessionCookies;

    // 测试用例 1：验证页面是否成功渲染并包含防伪造令牌
    it('Phase 1: GET /signup - Should issue CSRF cookie and hidden token', async () => {
        const res = await request(app).get('/signup');
        
        // 断言页面正常响应
        expect(res.status).toBe(200);

        // 提取并保存服务器发放的 Set-Cookie 头部
        sessionCookies = res.headers['set-cookie'];
        expect(sessionCookies).toBeDefined();

        // 使用 Cheerio 解析返回的 HTML 文本，物理提取隐藏域的 Token 值
        const $ = cheerio.load(res.text);
        csrfToken = $('input[name="_csrf"]').val();
        
        // 断言 Token 成功注入
        expect(csrfToken).toBeDefined();
        expect(csrfToken.length).toBeGreaterThan(0);
    });

    // 测试用例 2：验证非法请求是否被物理拦截
    it('Phase 2: POST /signup - Should block request lacking CSRF token (Forbidden)', async () => {
        const res = await request(app)
            .post('/signup')
            .send({
                SignUpUsername: 'hacker',
                SignUpEmail: 'hacker@attack.com',
                SignUpPassword: '123'
            })
            // 模拟跨站请求伪造：浏览器自动携带了受害者的 Cookie，但黑客拿不到 Token
            .set('Cookie', sessionCookies);

        // 断言系统拒绝服务
        expect(res.status).toBe(403);
        // 断言错误栈中包含 csurf 中间件的标准报错信息
        expect(res.text).toContain('invalid csrf token');
    });

    // 测试用例 3：验证合法请求是否被放行
    it('Phase 3: POST /signup - Should authorize request with valid token and cookies', async () => {
        const res = await request(app)
            .post('/signup')
            .send({
                _csrf: csrfToken, // 发送 Phase 1 提取出的合法 Token
                SignUpUsername: 'legitimate_user',
                SignUpEmail: 'user@safe.com',
                SignUpPassword: '123'
            })
            .set('Cookie', sessionCookies); // 携带合法 Cookie

        // 断言请求穿透了 CSRF 防御，触发了 app.js 中我们写的兜底重定向逻辑
        expect(res.status).toBe(302);
        expect(res.header.location).toBe('/');
    });

    // 追加测试：拉升 Functions 和 Branches 的覆盖率，模拟走通剩余的死路由
    it('Phase 4: Coverage Boost - Hit remaining endpoints', async () => {
        // 撞击首页
        const resIndex = await request(app).get('/');
        expect(resIndex.status).toBe(200);

        // 撞击仪表盘
        const resDashboard = await request(app).get('/dashboard');
        expect(resDashboard.status).toBe(200);

        // 撞击登录接口并模拟合法提交 (触发 redirect)
        const resLogin = await request(app)
            .post('/login')
            .send({ _csrf: csrfToken })
            .set('Cookie', sessionCookies);
        expect(resLogin.status).toBe(302);

        // 撞击不存在的路由 (触发 404 兜底)
        const res404 = await request(app).get('/random-path-that-does-not-exist');
        expect(res404.status).toBe(302); 
    });
});