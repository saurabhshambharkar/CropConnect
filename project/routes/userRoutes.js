const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validator');

const router = express.Router();

// Validation middleware for updating user profile
const updateProfileValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone').optional(),
  body('location').optional(),
  validateRequest
];

// Protect all routes after this middleware
router.use(authController.protect);

// User routes
router.get('/me', userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  updateProfileValidation,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

// Admin only routes
router.use(authController.restrictTo('admin'));

router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;