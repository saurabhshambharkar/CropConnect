const express = require('express');
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validator');

const router = express.Router();

// Validation middleware for creating orders
const orderValidation = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'paypal', 'cash_on_delivery'])
    .withMessage('Invalid payment method'),
  validateRequest
];

// All order routes require authentication
router.use(authController.protect);

// Order routes
router.get('/', orderController.getAllOrders);
router.get('/history', orderController.getOrderHistory);
router.get('/history/:userId', orderController.getOrderHistory);
router.get('/stats', authController.restrictTo('farmer', 'admin'), orderController.getFarmerSalesStats);
router.get('/stats/:farmerId', authController.restrictTo('farmer', 'admin'), orderController.getFarmerSalesStats);
router.get('/:id', orderController.getOrder);
router.post('/', authController.restrictTo('buyer'), orderValidation, orderController.createOrder);
router.patch('/:id/status', authController.restrictTo('farmer', 'admin'), orderController.updateOrderStatus);
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;