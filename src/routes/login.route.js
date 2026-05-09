const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");

// Login page
router.get("/", (req, res) => {
  res.status(200).render("signup.ejs", {
    signupError: null,
    loginError: null,
    showLogin: true,
    csrfToken: res.locals.csrfToken,
  });
});

// Handle Login POST
router.post("/", async (req, res) => {
  try {
    const email = req.body.LoginEmail;
    const password = req.body.LoginPassword;

    console.log(`Login attempt - email: ${email}`);

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
    console.log(`Query result: ${user ? `Found user ${user.username}` : "User does not exist"}`);

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
    console.log(`Password verification: ${isMatch ? "Success" : "Failed"}`);

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
    console.log(`Login success, session ID: ${req.session.userId}`);

    // Ensure session is saved before redirecting to prevent race conditions
    req.session.save(() => {
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("signup.ejs", {
      loginError: "Server error",
      signupError: null,
      showLogin: true,
      csrfToken: res.locals.csrfToken,
    });
  }
});

module.exports = router;
