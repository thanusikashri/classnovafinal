const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // Mongoose server selection or connection buffering timeout
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongooseError' && err.message && err.message.includes('buffering timed out')) {
    const message = 'Database service is currently unavailable. Please verify MongoDB Atlas connection and IP whitelist.';
    error = { message, statusCode: 503 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(error.statusCode === 400 && Array.isArray(error.message) && { errors: error.message })
  });
};

module.exports = { errorHandler };
