const express = require("express");
const Task = require("../models/task");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");

// Create tasks
router.post("/create", authMiddleware, async (req, res, next) => {
  try {
    const { title, priority, checklist, due, assign } = req.body;
    const user = req.user;

    await Task.create({
      userId: user._id,
      title,
      priority,
      checklist,
      due,
      assign,
    });

    res.status(201).json({ msg: "Task created successfully!" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
