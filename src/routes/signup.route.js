const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");

// Signup page
router.get("/", (req, res) => {
  res.status(200).render("signup.ejs", {
    signupError: null,
    loginError: null,
    showLogin: false,
    csrfToken: res.locals.csrfToken,
  });
});

// Handle Signup POST
router.post("/", async (req, res) => {
  try {
    const username = req.body.SignUpUsername;
    const email = req.body.SignUpEmail;
    const password = req.body.SignUpPassword;

    console.log(`Signup attempt: ${username}, ${email}`);

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
    console.log(`User created successfully: ${user._id}`);

    return res.redirect("/login?show=login");
  } catch (err) {
    console.log("Signup error:", err);
    return res.status(500).render("signup.ejs", {
      signupError: "Signup failed, please try again",
      loginError: null,
      showLogin: false,
      csrfToken: res.locals.csrfToken,
    });
  }
});

module.exports = router;
