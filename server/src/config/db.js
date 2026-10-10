const mongoose = require('mongoose');
const { env } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error Name: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    if (error.cause) console.error(`Error Cause: ${error.cause}`);
    if (error.reason) console.error(`Error Reason: ${JSON.stringify(error.reason, null, 2)}`);
    process.exit(1);
  }
};

module.exports = connectDB;
