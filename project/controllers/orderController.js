const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Get all orders - admins can see all, users see their own
exports.getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // Regular users can only see their own orders
  if (req.user.role === 'buyer') {
    filter = { buyer: req.user.id };
  } else if (req.user.role === 'farmer') {
    filter = { farmer: req.user.id };
  }
  
  const orders = await Order.find(filter);
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders
    }
  });
});

// Get single order
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  
  // Check if user is authorized to view this order
  if (
    req.user.role !== 'admin' &&
    order.buyer.id !== req.user.id &&
    order.farmer.id !== req.user.id
  ) {
    return next(
      new AppError('You are not authorized to view this order', 403)
    );
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

// Create new order
exports.createOrder = catchAsync(async (req, res, next) => {
  // Set buyer ID from authenticated user
  if (!req.body.buyer) req.body.buyer = req.user.id;
  
  // Calculate total amount and set item totals
  let totalAmount = 0;
  
  // Validate that items array exists and is not empty
  if (!req.body.items || req.body.items.length === 0) {
    return next(new AppError('Orders must contain at least one item', 400));
  }
  
  // Get product info and calculate totals for each item
  for (let i = 0; i < req.body.items.length; i++) {
    const item = req.body.items[i];
    const product = await Product.findById(item.product);
    
    if (!product) {
      return next(new AppError(`Product not found: ${item.product}`, 404));
    }
    
    // Check if quantity is available
    if (product.quantityAvailable < item.quantity) {
      return next(
        new AppError(
          `Insufficient quantity available for ${product.name}. Available: ${product.quantityAvailable}`,
          400
        )
      );
    }
    
    // Set price from product if not provided
    if (!item.price) {
      item.price = product.discountPrice || product.price;
    }
    
    // Calculate item total
    item.total = item.price * item.quantity;
    totalAmount += item.total;
    
    // Set farmer from first product if not already set
    if (i === 0 && !req.body.farmer) {
      req.body.farmer = product.farmer;
    }
    
    // Reduce product quantity
    await Product.findByIdAndUpdate(
      product._id,
      { $inc: { quantityAvailable: -item.quantity } }
    );
  }
  
  // Set total amount
  req.body.totalAmount = totalAmount;
  
  // Create the order
  const newOrder = await Order.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      order: newOrder
    }
  });
});

// Update order status
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!status) {
    return next(new AppError('Please provide a status to update', 400));
  }
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  
  // Check permissions: Only farmers who own the products or admins can update status
  if (req.user.role !== 'admin' && order.farmer.id !== req.user.id) {
    return next(
      new AppError('You are not authorized to update this order', 403)
    );
  }
  
  // Update status and timestamp
  order.status = status;
  order.updatedAt = Date.now();
  
  // Additional status-specific logic
  if (status === 'shipped') {
    order.trackingNumber = req.body.trackingNumber || `TR-${Date.now()}`;
    order.estimatedDelivery = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    ); // 3 days from now
  } else if (status === 'delivered') {
    order.actualDelivery = Date.now();
  } else if (status === 'cancelled') {
    // Return product quantities to inventory
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { quantityAvailable: item.quantity } }
      );
    }
  }
  
  await order.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

// Cancel order - can be done by buyer or farmer
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  
  // Only the buyer, farmer of the order, or admin can cancel
  if (
    req.user.role !== 'admin' &&
    order.buyer.id !== req.user.id &&
    order.farmer.id !== req.user.id
  ) {
    return next(
      new AppError('You are not authorized to cancel this order', 403)
    );
  }
  
  // Can only cancel if order is not yet shipped
  if (['shipped', 'delivered'].includes(order.status)) {
    return next(
      new AppError('Cannot cancel an order that has been shipped or delivered', 400)
    );
  }
  
  // Update order status
  order.status = 'cancelled';
  order.updatedAt = Date.now();
  
  // Return product quantities to inventory
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product._id,
      { $inc: { quantityAvailable: item.quantity } }
    );
  }
  
  await order.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

// Get order history for a user
exports.getOrderHistory = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;
  
  // Check if user is authorized to view this history
  if (req.user.role !== 'admin' && userId !== req.user.id) {
    return next(
      new AppError('You are not authorized to view this order history', 403)
    );
  }
  
  // Find orders based on user role
  let filter = {};
  if (req.user.role === 'buyer') {
    filter = { buyer: userId };
  } else if (req.user.role === 'farmer') {
    filter = { farmer: userId };
  }
  
  const orders = await Order.find(filter).sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders
    }
  });
});

// Get sales statistics for a farmer
exports.getFarmerSalesStats = catchAsync(async (req, res, next) => {
  const farmerId = req.params.farmerId || req.user.id;
  
  // Check if user is authorized to view these stats
  if (req.user.role !== 'admin' && farmerId !== req.user.id) {
    return next(
      new AppError('You are not authorized to view these statistics', 403)
    );
  }
  
  // Get all completed orders for the farmer
  const completedOrders = await Order.find({
    farmer: farmerId,
    status: { $in: ['delivered', 'completed'] }
  });
  
  // Calculate statistics
  const totalSales = completedOrders.reduce(
    (total, order) => total + order.totalAmount,
    0
  );
  
  const totalOrders = completedOrders.length;
  
  // Calculate sales by product category
  const salesByCategory = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const category = item.product.category;
      if (salesByCategory[category]) {
        salesByCategory[category] += item.total;
      } else {
        salesByCategory[category] = item.total;
      }
    });
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      totalSales,
      totalOrders,
      salesByCategory
    }
  });
});