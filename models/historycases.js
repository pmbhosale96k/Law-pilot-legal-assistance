// models/history_cases.js
const mongoose = require("mongoose");

const historyCaseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  query: {
    type: String,
    required: true,
  },
  predictedSections: {
    type: [String],
    default: [],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("HistoryCase", historyCaseSchema);
