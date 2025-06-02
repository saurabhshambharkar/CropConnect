const Review = require('../models/Review');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Middleware to set product and user IDs for creating reviews
exports.setProductUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Get all reviews
exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // If product ID is in params, filter by that product
  if (req.params.productId) {
    filter = { product: req.params.productId };
  }
  
  const reviews = await Review.find(filter);
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

// Get a single review
exports.getReview = factory.getOne(Review);

// Create a review - only buyers can create reviews
exports.createReview = catchAsync(async (req, res, next) => {
  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    product: req.body.product,
    user: req.user.id
  });
  
  if (existingReview) {
    return next(
      new AppError('You have already reviewed this product', 400)
    );
  }
  
  // Create the review
  const newReview = await Review.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview
    }
  });
});

// Update a review - only the reviewer or admin can update
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }
  
  // Check if user is the owner of the review or an admin
  if (review.user.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to update this review', 403)
    );
  }
  
  // Update the review
  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview
    }
  });
});

// Delete a review - only the reviewer or admin can delete
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }
  
  // Check if user is the owner of the review or an admin
  if (review.user.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to delete this review', 403)
    );
  }
  
  await Review.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Mark a review as helpful
exports.markReviewAsHelpful = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }
  
  // Check if user has already marked this review as helpful
  const hasMarked = review.helpful.users.includes(req.user.id);
  
  if (hasMarked) {
    // User has already marked it, so remove the mark
    await Review.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { 'helpful.users': req.user.id },
        $inc: { 'helpful.count': -1 }
      },
      { new: true }
    );
  } else {
    // User has not marked it, so add the mark
    await Review.findByIdAndUpdate(
      req.params.id,
      {
        $push: { 'helpful.users': req.user.id },
        $inc: { 'helpful.count': 1 }
      },
      { new: true }
    );
  }
  
  const updatedReview = await Review.findById(req.params.id);
  
  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview
    }
  });
});