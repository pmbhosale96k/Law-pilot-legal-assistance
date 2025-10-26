const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define lawyer schema
const lawyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expertise: {
    type: String,
    required: true,
    enum: [
      "Cyber Crime",
      "Financial Fraud",
      "Domestic Violence",
      "Property Dispute",
      "Murder Case",
      "Theft and Robbery",
      "Harassment",
      "Drug Abuse",
      "Child Abuse",
      "Corruption",
    ], // dropdown options
  },
}, { timestamps: true });

// Hash password before save
lawyerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
lawyerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Lawyer", lawyerSchema);
