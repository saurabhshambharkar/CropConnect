const mongoose = require('mongoose');
const Product = require('./Product');

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'Review cannot be empty']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'A review must have a rating']
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Review must belong to a product']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user']
  },
  farmer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  images: [String],
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Prevent duplicate reviews (one review per user per product)
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Pre-save middleware to set farmer from product
reviewSchema.pre('save', async function(next) {
  if (!this.farmer) {
    const product = await Product.findById(this.product);
    if (product) {
      this.farmer = product.farmer;
    }
  }
  next();
});

// Query middleware to populate user and product
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name profileImage'
  });
  next();
});

// Static method to calculate average ratings
reviewSchema.statics.calcAverageRatings = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId }
    },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      averageRating: stats[0].avgRating
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      averageRating: 0
    });
  }
};

// Call calcAverageRatings after save
reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.product);
});

// Find, update, and delete middleware
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.product);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;