const express = require('express');
const { body } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validator');

const router = express.Router({ mergeParams: true });

// Validation middleware for reviews
const reviewValidation = [
  body('review').notEmpty().withMessage('Review text is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  validateRequest
];

// All routes require authentication
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('buyer'),
    reviewValidation,
    reviewController.setProductUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('buyer', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('buyer', 'admin'),
    reviewController.deleteReview
  );

// Mark review as helpful
router.patch('/:id/helpful', reviewController.markReviewAsHelpful);

module.exports = router;