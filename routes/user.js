const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middlewares/auth");

// Register route
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const hashPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password: hashPassword,
      });

      const token = await jwt.sign(
        {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        process.env.SECRET
      );
      res.header("X-token", token);
      res.header("name", user.name);
      return res.status(201).json({
        msg: "User registered successfully!!",
        userId: user._id,
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
        res.header("name", user.name);
        res.status(200).json({
          msg: "User logged in successfully!",
          userId: user._id,
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

// Search user
router.get("/filter/:enteredEmail", authMiddleware, async (req, res, next) => {
  try {
    const { enteredEmail } = req.params;
    const user = req.user;
    if (enteredEmail != "*") {
      const results = await User.find(
        {
          $and: [
            {
              email: {
                $not: {
                  $eq: user.email,
                },
              },
            },
            {
              email: {
                $regex: `${enteredEmail}`,
                $options: "i",
              },
            },
          ],
        },
        { _id: 0, email: 1 }
      );
      return res.status(200).json(results);
    } else {
      return res.status(200).json([]);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
