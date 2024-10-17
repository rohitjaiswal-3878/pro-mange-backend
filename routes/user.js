const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");

// Register route
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const hashPassword = await bcrypt.hash(password, 10);

      await User.create({
        name,
        email,
        password: hashPassword,
      });

      return res.status(201).json({
        msg: "User registered successfully!!",
      });
    } else {
      return res.status(400).json({
        msg: "User already exists!!!",
      });
    }
  } catch (error) {
    next(error);
  }
});

// Login route
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const verifyPassword = await bcrypt.compare(password, user.password);
      if (verifyPassword) {
        const token = await jwt.sign(
          { _id: user._id, name: user.name, email: user.email },
          process.env.SECRET
        );
        res.header("X-token", token);
        res.status(200).json({
          msg: "User logged in successfully!",
        });
      } else {
        return res.status(401).json({ msg: "Invalid email or password!" });
      }
    } else {
      return res.status(400).json({ msg: "User does not exists!!" });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
