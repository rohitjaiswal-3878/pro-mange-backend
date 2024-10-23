const express = require("express");
const Task = require("../models/task");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const mongoose = require("mongoose");

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

// Get tasks by userId
router.get("/tasks", authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const results = await Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id),
        },
      },
      {
        $group: {
          _id: "$board",
          tasks: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          tasks: {
            $sortArray: {
              input: "$tasks",
              sortBy: {
                updatedAt: 1,
              },
            },
          },
        },
      },
    ]);

    let formatedResult = {};

    results.map((ele, index) => {
      formatedResult[ele._id] = ele.tasks;
    });

    return res.status(200).json(formatedResult);
  } catch (error) {
    next(error);
  }
});

// Update particular task
router.patch("/change", authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const updatedTask = req.body.task;

    const result = await Task.findByIdAndUpdate(
      updatedTask._id,
      {
        checklist: updatedTask.checklist,
        board: updatedTask.board,
      },
      {
        new: true,
      }
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
