const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validator');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// Validation middleware for creating products
const productValidation = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category')
    .isIn(['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'poultry', 'herbs', 'other'])
    .withMessage('Invalid category'),
  body('unit')
    .isIn(['kg', 'g', 'lb', 'oz', 'l', 'ml', 'piece', 'dozen', 'bunch'])
    .withMessage('Invalid unit'),
  body('quantityAvailable').isNumeric().withMessage('Quantity must be a number'),
  validateRequest
];

// Nested routes for reviews
router.use('/:productId/reviews', reviewRouter);

// Public routes
router.get('/', productController.getAllProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/search', productController.searchProducts);
router.get('/seasonal', productController.getSeasonalProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/nearby', productController.getProductsByLocation);
router.get('/farmer/:farmerId', productController.getProductsByFarmer);
router.get('/:id', productController.getProduct);

// Protected routes
router.use(authController.protect);

// Only farmers can create products
router.post(
  '/',
  authController.restrictTo('farmer'),
  productController.uploadProductImages,
  productController.resizeProductImages,
  productValidation,
  productController.createProduct
);

router.patch(
  '/:id',
  productController.uploadProductImages,
  productController.resizeProductImages,
  productController.updateProduct
);

router.delete('/:id', productController.deleteProduct);

module.exports = router;