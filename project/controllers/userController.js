const multer = require('multer');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const { uploadImages, resizeProductImages } = require('../utils/fileUpload');

// Upload user photo
exports.uploadUserPhoto = uploadImages('users', 1);

// Resize user photo
exports.resizeUserPhoto = resizeProductImages('users');

// Get currently logged in user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user details (except password)
exports.updateMe = catchAsync(async (req, res, next) => {
  // Prevent password updates with this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // Filter unwanted fields that should not be updated
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'phone',
    'location',
    'farmDetails'
  );

  // Add profile image if uploaded
  if (req.file) filteredBody.profileImage = req.file.filename;

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Delete (deactivate) current user
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Create a new user (admin only)
exports.createUser = catchAsync(async (req, res, next) => {
  return next(
    new AppError(
      'This route is not for user creation. Please use /signup instead',
      400
    )
  );
});

// Get all users (admin only)
exports.getAllUsers = factory.getAll(User);

// Get user by ID
exports.getUser = factory.getOne(User);

// Update user (admin only)
exports.updateUser = catchAsync(async (req, res, next) => {
  // Prevent password updates with this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError('This route is not for password updates.', 400)
    );
  }

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Delete user (admin only)
exports.deleteUser = factory.deleteOne(User);

// Utility function to filter object properties
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};