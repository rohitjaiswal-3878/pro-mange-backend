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

// Task analytics.
router.get("/analytics", authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    const boardResults = await Task.aggregate([
      {
        $match: {
          $or: [
            { userId: new mongoose.Types.ObjectId(user._id) },
            { assign: user.email },
            { "assignTo.assignUser": user.email },
          ],
        },
      },
      {
        $group: {
          _id: "$board",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          board: "$_id",
          count: 1,
        },
      },
    ]);

    const priorityResults = await Task.aggregate([
      {
        $match: {
          $or: [
            { userId: new mongoose.Types.ObjectId(user._id) },
            { assign: user.email },
            { "assignTo.assignUser": user.email },
          ],
        },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
      {
        $project: { _id: 0, priority: "$_id", count: 1 },
      },
    ]);

    const dueDate = await Task.aggregate([
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
              due: { $ne: "" },
            },
          ],
        },
      },
      {
        $group: {
          _id: "",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          due: "due",
          count: 1,
        },
      },
    ]);

    let result = {};

    boardResults.forEach((e, i) => {
      result[e.board] = e.count;
    });

    priorityResults.forEach((e, i) => {
      result[e.priority] = e.count;
    });

    if (dueDate.length != 0) {
      result[dueDate[0].due] = dueDate[0].count;
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Update Content of task.
router.patch("/update", authMiddleware, async (req, res, next) => {
  try {
    const { _id, userId, title, priority, assignTo, due, checklist } = req.body;

    await Task.findByIdAndUpdate(_id, {
      title,
      priority,
      assignTo,
      checklist,
      due,
    });

    res.status(200).json({ msg: "Task updated successfully!" });
  } catch (error) {
    next(error);
  }
});

// Get task by task id.
router.get("/single/:taskId", async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    const result = await Task.findById(taskId).select(
      "title priority assignTo checklist due userId"
    );

    if(result){
      res.json(result);
    }else{
      res.status(404).json({msg : "Task not found!"})
    }
  } catch (error) {
    next(error);
  }
});

// Delete task by ID.
router.delete("/remove/:taskId", authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const taskId = req.params.taskId;
    const task = await Task.findById(taskId);
    if(task.userId == user._id){
      await Task.findByIdAndDelete(taskId);
      return res.status(200).json({msg : "Task deleted successfully!"})
    }else{
      res.status(400).json({msg : "Only Owner can delete the task!"})
    }
  } catch (error) {
    next(error)
  }
})

module.exports = router;
