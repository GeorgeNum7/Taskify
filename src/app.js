const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();
const port = process.env.PORT || 3000;

// ======================================================
// 1. MongoDB Connection
// ======================================================

if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect("mongodb://127.0.0.1:27017/taskify")
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));
}

// ======================================================
// 2. User Model
// ======================================================

const User = require("./models/User");

// ======================================================
// 3. Middleware
// ======================================================

// Static files
app.use("/static", express.static(path.join(__dirname, "../static")));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// ======================================================
// 4. CSRF Protection
// ======================================================

if (process.env.NODE_ENV !== "test") {
  const csrfProtection = csrf({ cookie: true });

  app.use(csrfProtection);

  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
} else {
  // Test environment:
  // disable csrf validation
  app.use((req, res, next) => {
    res.locals.csrfToken = "";
    next();
  });
}

// ======================================================
// 5. Session
// ======================================================

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,

    // Prevent MongoStore from causing Jest open handle issue
    store:
      process.env.NODE_ENV === "test"
        ? undefined
        : MongoStore.create({
            mongoUrl: "mongodb://127.0.0.1:27017/taskify",
          }),
  })
);

// ======================================================
// 6. View Engine
// ======================================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// ======================================================
// 7. Routes
// ======================================================

// Home
app.get("/", (req, res) => {
  res.status(200).render("index.ejs");
});

// Signup page
app.get("/signup", (req, res) => {
  res.status(200).render("signup.ejs", {
    signupError: null,
    loginError: null,
    showLogin: false,
    csrfToken: res.locals.csrfToken,
  });
});

// Login page
app.get("/login", (req, res) => {
  res.status(200).render("signup.ejs", {
    signupError: null,
    loginError: null,
    showLogin: true,
    csrfToken: res.locals.csrfToken,
  });
});

// ======================================================
// 8. Signup
// ======================================================

app.post("/signup", async (req, res) => {
  try {
    const username = req.body.SignUpUsername;
    const email = req.body.SignUpEmail;
    const password = req.body.SignUpPassword;

    console.log(`尝试注册: ${username}, ${email}`);

    // Missing field validation
    if (!username || !email || !password) {
      return res.status(400).render("signup.ejs", {
        signupError: "All fields are required",
        loginError: null,
        showLogin: false,
        csrfToken: res.locals.csrfToken,
      });
    }

    // Duplicate username
    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      return res.status(400).render("signup.ejs", {
        signupError: "Username already exists",
        loginError: null,
        showLogin: false,
        csrfToken: res.locals.csrfToken,
      });
    }

    // Duplicate email
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(400).render("signup.ejs", {
        signupError: "Email already registered",
        loginError: null,
        showLogin: false,
        csrfToken: res.locals.csrfToken,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    console.log(`用户创建成功: ${user._id}`);

    return res.redirect("/login?show=login");
  } catch (err) {
    console.error("注册错误:", err);

    return res.status(500).render("signup.ejs", {
      signupError: "Signup failed, please try again",
      loginError: null,
      showLogin: false,
      csrfToken: res.locals.csrfToken,
    });
  }
});

// ======================================================
// 9. Login
// ======================================================

app.post("/login", async (req, res) => {
  try {
    const email = req.body.LoginEmail;
    const password = req.body.LoginPassword;

    console.log(`登录尝试 - 邮箱: ${email}`);

    // Missing fields
    if (!email || !password) {
      return res.status(400).render("signup.ejs", {
        loginError: "All fields are required",
        signupError: null,
        showLogin: true,
        csrfToken: res.locals.csrfToken,
      });
    }

    const user = await User.findOne({ email });

    console.log(
      `查询结果: ${user ? `找到用户 ${user.username}` : "用户不存在"}`
    );

    // User not found
    if (!user) {
      return res.status(401).render("signup.ejs", {
        loginError: "User not found",
        signupError: null,
        showLogin: true,
        csrfToken: res.locals.csrfToken,
      });
    }

    // Password compare
    const isMatch = await bcrypt.compare(password, user.password);

    console.log(`密码验证: ${isMatch ? "成功" : "失败"}`);

    // Wrong password
    if (!isMatch) {
      return res.status(401).render("signup.ejs", {
        loginError: "Wrong password",
        signupError: null,
        showLogin: true,
        csrfToken: res.locals.csrfToken,
      });
    }

    // Save session
    req.session.userId = user._id;

    console.log(`登录成功，session ID: ${req.session.userId}`);

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("登录错误:", err);
    

    return res.status(500).render("signup.ejs", {
      loginError: "Server error",
      signupError: null,
      showLogin: true,
      csrfToken: res.locals.csrfToken,
    });
  }
});

// ======================================================
// 10. Auth Middleware
// ======================================================

function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    console.log(`未授权访问，session: ${req.session.userId}`);

    return res.redirect("/login");
  }

  next();
}

// ======================================================
// 11. Dashboard
// ======================================================

app.get("/dashboard", authMiddleware, (req, res) => {
  res.status(200).render("dashboard/dashboard.ejs");
});

// ======================================================
// 12. 404 Handler
// ======================================================

app.use((req, res) => {
  res.redirect("/");
});

// ======================================================
// 13. Start Server
// ======================================================

if (require.main === module) {
  app.listen(port, () => {
    console.log(
      `The application started successfully on port ${port}`
    );
  });
}

module.exports = app;