const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

// Middleware to validate requests using express-validator
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.path}: ${err.msg}`).join('. ');
    return next(new AppError(errorMessages, 400));
  }
  next();
};