const express = require("express");
const Task = require("../models/task");
const User = require("../models/user");

const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const mongoose = require("mongoose");

// Create tasks
router.post("/create", authMiddleware, async (req, res, next) => {
  try {
    const { title, priority, checklist, due, assign, assignTo } = req.body;
    const user = req.user;
    const assignToObj = { assignUser: assignTo, userId: user._id };
    await Task.create({
      userId: user._id,
      title,
      priority,
      checklist,
      due,
      assign,
      assignTo: assignToObj,
    });

    res.status(201).json({ msg: "Task created successfully!" });
  } catch (error) {
    next(error);
  }
});

// Get tasks by userId
router.get("/tasks/:filter", authMiddleware, async (req, res, next) => {
  try {
    const filter = req.params.filter;
    let start, end;
    if (filter == "today") {
      const today = new Date();
      const date = new Date();
      date.setDate(today.getDate() - 1);
      start = date.toLocaleDateString("en-CA") + "T18:30:00Z";
      end = today.toLocaleDateString("en-CA") + "T18:30:00Z";
    } else if (filter == "week") {
      const date = new Date();

      const startOfWeek = new Date();
      startOfWeek.setDate(date.getDate() - date.getDay());

      const endOfweek = new Date(startOfWeek);
      endOfweek.setDate(startOfWeek.getDate() + 7);

      start = startOfWeek.toLocaleDateString("en-CA") + "T18:30:00Z";
      end = endOfweek.toLocaleDateString("en-CA") + "T18:30:00Z";
    } else {
      const date = new Date();

      const year = date.getFullYear();
      const month = date.getMonth();

      const startDate = new Date(year, month, 0);
      const endDate = new Date(year, month + 1, 0);

      start = startDate.toLocaleDateString("en-CA") + "T18:30:00Z";
      end = endDate.toLocaleDateString("en-CA") + "T18:30:00Z";
    }

    const user = req.user;
    const results = await Task.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { userId: new mongoose.Types.ObjectId(user._id) },
                { assign: user.email },
                { "assignTo.assignUser": user.email },
              ],
            },
            {
              createdAt: {
                $gte: new Date(start),
                $lte: new Date(end),
              },
            },
          ],
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

// Assign all the task to user.
router.patch("/add-people", authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const assignTo = req.body.email;

    if (user.email != assignTo) {
      const assignUser = await User.findOne({ email: assignTo });
      if (assignUser) {
        const result = await Task.updateMany(
          {
            userId: new mongoose.Types.ObjectId(user._id),
          },
          {
            $addToSet: { assign: assignTo },
          }
        );

        return res.status(200).json({
          msg: "User successfully added to the board!",
          result,
        });
      } else {
        return res.status(400).json({
          msg: "User does not exists!",
        });
      }
    } else {
      return res.status(400).json({
        msg: "You cannot assign board to yourself!",
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
