require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const run = async () => {
  try {
    await connectDB();
    console.log("Database connection test passed.");
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error("Database connection test failed:", error.message);
  process.exit(1);
});
