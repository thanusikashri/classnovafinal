const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // Fallback to current working directory

const isProduction = process.env.NODE_ENV === 'production';
const isDemoModeRequested = process.env.DEMO_MODE === 'true';

// Prevent demo mode from ever activating in production
if (isDemoModeRequested && isProduction) {
  console.error('FATAL: DEMO_MODE cannot be enabled in a production environment.');
  process.exit(1);
}

const isDemoMode = isDemoModeRequested && !isProduction;

const requiredEnvVars = isDemoMode 
  ? ['PORT', 'JWT_SECRET', 'CLIENT_URL']
  : ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'CLIENT_URL'];

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnv();

module.exports = {
  env: {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET || 'classnova_demo_secret_key_not_for_prod_use',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    OTP_EXPIRY_SECONDS: parseInt(process.env.OTP_EXPIRY_SECONDS) || 60,
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
    DEMO_MODE: isDemoMode,
  }
};
