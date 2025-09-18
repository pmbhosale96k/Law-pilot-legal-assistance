// insertBns.js

const mongoose = require('mongoose');
const BnsSection = require('./models/bns_sec'); 
const bnsData = require('./data/bns_data');     

mongoose.connect('mongodb://localhost:27017/lawpilot')
  .then(async () => {
    console.log("✅ MongoDB connected");

   
    await BnsSection.insertMany(bnsData);
    console.log("✅ BNS sections inserted successfully");

    // Close connection
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("❌ Error inserting data:", err);
    mongoose.connection.close();
  });
