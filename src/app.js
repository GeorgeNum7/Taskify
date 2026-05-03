const express = require("express");
const path = require("path");
// 1. 引入修复漏洞必需的安全库
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const app = express();
const port = process.env.PORT || 3000;

app.use("/static", express.static(path.join(__dirname, "../static")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. 挂载 Cookie 解析器，这是 csurf 依赖的底层介质
app.use(cookieParser());

// 3. 初始化并挂载 CSRF 拦截中间件，采用基于 Cookie 的模式
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// 4. 将生成的 token 传递给所有的视图模板，使其在 EJS 中可用
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.get("/", (req, res) => {
    res.status(200).render("index.ejs");
});

app.get("/signup", (req, res) => {
    res.status(200).render("signup.ejs");
});

app.get("/dashboard", (req, res) => {
    res.status(200).render("dashboard/dashboard.ejs");
});

app.get("/privacy", (req, res) => {
    res.status(200).render("privacy.ejs");
});

app.post("/signup", (req, res) => {
    res.redirect("/"); 
});
app.post("/login", (req, res) => {
    res.redirect("/");
});

app.use((req, res) => {
    res.redirect('/');
});

// 当直接运行此文件时（如 node src/app.js），启动服务器监听端口
// 强制添加忽略声明
/* istanbul ignore if */
if (require.main === module) {
    app.listen(port, () => {
        console.log(`The application started successfully on port ${port}`);
    });
}

// 导出 app 实例供 Supertest 在测试环境中调用
module.exports = app;