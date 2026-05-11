const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const authMiddleware = require("./middleware/auth");
const dashboardRoute = require("./routes/dashboard.route");
const signupRoute = require("./routes/signup.route");
const loginRoute = require("./routes/login.route");

const app = express();
const port = process.env.PORT || 3000;

// ======================================================
// 1. MongoDB Connection
// ======================================================

/* istanbul ignore next */
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

/* istanbul ignore next */
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
        : /* istanbul ignore next */ MongoStore.create({
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

// Feature Routes
app.use("/signup", signupRoute);
app.use("/login", loginRoute);
app.use("/dashboard", authMiddleware, dashboardRoute);

// ======================================================
// 8. Logout
// ======================================================

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ======================================================
// 12. Privacy
// ======================================================

app.get("/privacy", (req, res) => {
  res.status(200).render("privacy.ejs");
});

// ==========================================
// 12. 404 Handler
// ==========================================
app.use((req, res) => {
  res.redirect("/");
});

// ======================================================
// 13. Start Server
// ======================================================

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`The application started successfully on port ${port}`);
  });
}

module.exports = app;

