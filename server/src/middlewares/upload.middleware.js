const multer = require('multer');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Basic file filter (optional, extend as needed)
const fileFilter = (req, file, cb) => {
  // Can add constraints here
  cb(null, true); 
};

// Initialize multer
const upload = multer({
  storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 : 10 * 1024 * 1024, // default 10MB
  },
  fileFilter
});

module.exports = upload;
