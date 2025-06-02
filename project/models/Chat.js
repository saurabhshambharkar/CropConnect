const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A message must have a sender']
  },
  content: {
    type: String,
    required: [true, 'Message content cannot be empty'],
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Chat must have participants']
    }
  ],
  messages: [messageSchema],
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product'
  },
  order: {
    type: mongoose.Schema.ObjectId,
    ref: 'Order'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for quick lookups
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ product: 1 });
chatSchema.index({ order: 1 });

// Populate participants when querying chats
chatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'participants',
    select: 'name profileImage'
  });
  
  if (this.options._recursed) {
    return next();
  }
  
  // Avoid infinite recursion
  this.options._recursed = true;
  
  if (this._mongooseOptions.lean !== true) {
    this.populate({
      path: 'product',
      select: 'name images price'
    }).populate({
      path: 'order',
      select: 'status totalAmount createdAt'
    });
  }
  
  next();
});

// Update lastActivity when a new message is added
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = Date.now();
  }
  next();
});

// Virtual for unread message count
chatSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(message => !message.isRead).length;
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;