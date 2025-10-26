const express = require("express");
const jwt = require("jsonwebtoken");
const Lawyer = require("../models/Lawyer");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Lawyer Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, username, password, expertise } = req.body;

    if (!name || !username || !password || !expertise)
      return res.status(400).json({ message: "All fields are required" });

    const existingLawyer = await Lawyer.findOne({ username });
    if (existingLawyer)
      return res.status(400).json({ message: "Username already exists" });

    const lawyer = await Lawyer.create({ name, username, password, expertise });

    const token = jwt.sign({ id: lawyer._id }, JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({
      message: "Lawyer registered successfully",
      token,
      lawyer: {
        id: lawyer._id,
        name: lawyer.name,
        username: lawyer.username,
        expertise: lawyer.expertise
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Lawyer Login
router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    const lawyer = await Lawyer.findOne({ username });
    if (!lawyer) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await lawyer.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: lawyer._id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      message: "Login successful",
      token,
      lawyer: {
        id: lawyer._id,
        name: lawyer.name,
        username: lawyer.username,
        expertise: lawyer.expertise
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
