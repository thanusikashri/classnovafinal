const mongoose = require('mongoose');
const { env } = require('./src/config/env');

const uri = env.MONGODB_URI;

async function testConnection() {
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000 // 15 seconds
        });
        
        console.log('MongoDB connection successful');
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("--- MongoDB Connection Error ---");
        console.error("Name:", error.name);
        console.error("Message:", error.message);
        
        if (error.cause) {
            console.error("Cause:", error.cause);
        }
        
        process.exit(1);
    }
}

testConnection();
