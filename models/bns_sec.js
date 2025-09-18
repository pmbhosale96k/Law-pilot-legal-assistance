// models/bns_sec.js

const mongoose = require('mongoose');

const bnsSectionSchema = new mongoose.Schema({
  section: String,
  title: String,
  explanation: String
});

module.exports = mongoose.model('BnsSection', bnsSectionSchema);
