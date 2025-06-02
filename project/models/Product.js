const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true,
    maxlength: [100, 'A product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'A product must have a description'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price']
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function(val) {
        // this only points to current doc on NEW document creation
        return val < this.price;
      },
      message: 'Discount price ({VALUE}) should be below regular price'
    }
  },
  category: {
    type: String,
    required: [true, 'A product must have a category'],
    enum: {
      values: ['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'poultry', 'herbs', 'other'],
      message: 'Category is either: fruits, vegetables, grains, dairy, meat, poultry, herbs, or other'
    }
  },
  subCategory: String,
  images: [String],
  unit: {
    type: String,
    required: [true, 'A product must have a unit of measurement'],
    enum: {
      values: ['kg', 'g', 'lb', 'oz', 'l', 'ml', 'piece', 'dozen', 'bunch'],
      message: 'Unit is either: kg, g, lb, oz, l, ml, piece, dozen, or bunch'
    }
  },
  quantityAvailable: {
    type: Number,
    required: [true, 'A product must have quantity available']
  },
  minimumOrderQuantity: {
    type: Number,
    default: 1
  },
  harvestedAt: Date,
  expiresAt: Date,
  isOrganic: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
    vitamins: [String]
  },
  farmer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A product must belong to a farmer']
  },
  farmLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  inSeason: {
    type: Boolean,
    default: true
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating must be at most 5'],
    set: val => Math.round(val * 10) / 10 // round to 1 decimal place
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for common queries
productSchema.index({ price: 1, averageRating: -1 });
productSchema.index({ farmLocation: '2dsphere' });
productSchema.index({ category: 1, farmer: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual populate for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id'
});

// Document middleware: runs before .save() and .create()
productSchema.pre('save', function(next) {
  // Set expiration date if harvestedAt exists and expiresAt doesn't
  if (this.harvestedAt && !this.expiresAt) {
    // Default expiration: 7 days after harvest for perishables
    if (['fruits', 'vegetables', 'dairy'].includes(this.category)) {
      this.expiresAt = new Date(this.harvestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      // 30 days for non-perishables
      this.expiresAt = new Date(this.harvestedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

// Query middleware: populate farmer details
productSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'farmer',
    select: 'name profileImage location'
  });
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;