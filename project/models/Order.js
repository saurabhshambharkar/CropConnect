const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1']
  },
  price: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'An order must belong to a buyer']
  },
  farmer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'An order must have a farmer']
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: [
      'pending', 
      'confirmed', 
      'processing', 
      'shipped', 
      'delivered', 
      'cancelled'
    ],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash_on_delivery'],
    required: [true, 'An order must have a payment method']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  shippingAddress: {
    street: {
      type: String,
      required: [true, 'Shipping address must have a street']
    },
    city: {
      type: String,
      required: [true, 'Shipping address must have a city']
    },
    state: {
      type: String,
      required: [true, 'Shipping address must have a state']
    },
    zipCode: {
      type: String,
      required: [true, 'Shipping address must have a zip code']
    },
    country: {
      type: String,
      required: [true, 'Shipping address must have a country']
    }
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'standard_delivery', 'express_delivery'],
    default: 'standard_delivery'
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  notes: String,
  isBulkOrder: {
    type: Boolean,
    default: false
  },
  bulkOrderId: {
    type: mongoose.Schema.ObjectId,
    ref: 'BulkOrder'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for common queries
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Query middleware to populate buyer and product details
orderSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'buyer',
    select: 'name email phone location'
  }).populate({
    path: 'items.product',
    select: 'name images category'
  });
  
  next();
});

// Pre-save hook to update timestamps
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // in days
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;