const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    // Find user by userId in session
    const user = await User.findById(req.session.userId);
    
    res.status(200).render("dashboard/dashboard.ejs", {
      user: user // Pass user info to EJS template
    });
  } catch (err) {
    console.error("Dashboard load failed:", err);
    res.redirect("/login");
  }
});

module.exports = router;
