const mongoose = require("mongoose");

const checklistSchema = new mongoose.Schema({
  checked: {
    type: Boolean,
  },
  item: {
    type: String,
  },
});

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      required: true,
    },
    checklist: {
      type: [checklistSchema],
    },
    due: {
      type: String,
    },
    assign: {
      type: [String],
    },
    assignTo: {
      type: String,
    },
    board: {
      type: String,
      required: true,
      default: "todo",
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("task", taskSchema);
module.exports = Task;
