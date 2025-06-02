const Product = require('../models/Product');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const { uploadImages, resizeProductImages } = require('../utils/fileUpload');

// Upload product images middleware
exports.uploadProductImages = uploadImages('products', 5); // 5 is max number of images

// Resize product images middleware
exports.resizeProductImages = resizeProductImages('products');

// Get all products with filtering, sorting, pagination
exports.getAllProducts = factory.getAll(Product);

// Get single product by ID
exports.getProduct = factory.getOne(Product, { path: 'reviews' });

// Create new product - only farmers can create products
exports.createProduct = catchAsync(async (req, res, next) => {
  // Set farmer ID from authenticated user
  if (!req.body.farmer) req.body.farmer = req.user.id;
  
  // Check if user is a farmer
  if (req.user.role !== 'farmer') {
    return next(new AppError('Only farmers can create products', 403));
  }
  
  // Set farm location from farmer's profile if not provided
  if (!req.body.farmLocation) {
    const farmer = await User.findById(req.user.id);
    req.body.farmLocation = farmer.location;
  }
  
  // Add image paths from upload middleware if available
  if (req.files) {
    req.body.images = [];
    req.files.forEach(file => {
      req.body.images.push(file.filename);
    });
  }
  
  const newProduct = await Product.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      product: newProduct
    }
  });
});

// Update product - only the farmer who created it can update
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  
  // Check if user is the owner of the product or an admin
  if (product.farmer.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to update this product', 403)
    );
  }
  
  // Add image paths from upload middleware if available
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.filename);
  }
  
  const updatedProduct = await Product.findByIdAndUpdate(
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
      product: updatedProduct
    }
  });
});

// Delete product - only the farmer who created it can delete
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  
  // Check if user is the owner of the product or an admin
  if (product.farmer.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to delete this product', 403)
    );
  }
  
  await Product.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get products by location (nearby products)
exports.getProductsByLocation = catchAsync(async (req, res, next) => {
  const { lat, lng, distance = 10, unit = 'km' } = req.query;
  
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }
  
  // Convert distance to radians
  // Earth radius: 6378.1 km or 3963.2 miles
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  
  const products = await Product.find({
    farmLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] }
    }
  });
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

// Get products by category
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;
  
  const products = await Product.find({ category });
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

// Get products by farmer
exports.getProductsByFarmer = catchAsync(async (req, res, next) => {
  const { farmerId } = req.params;
  
  const products = await Product.find({ farmer: farmerId });
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

// Search products by keywords
exports.searchProducts = catchAsync(async (req, res, next) => {
  const { query } = req.query;
  
  if (!query) {
    return next(new AppError('Please provide a search query', 400));
  }
  
  const products = await Product.find({
    $text: { $search: query }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' }
  });
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

// Get seasonal products
exports.getSeasonalProducts = catchAsync(async (req, res, next) => {
  // Assuming inSeason field is set by farmers or automatically updated
  const products = await Product.find({ inSeason: true })
    .sort('-createdAt')
    .limit(20);
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

// Get featured products
exports.getFeaturedProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find({ isFeatured: true })
    .sort('-averageRating')
    .limit(10);
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});