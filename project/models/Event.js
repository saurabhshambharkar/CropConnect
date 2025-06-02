const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'An event must have a title'],
    trim: true,
    maxlength: [100, 'Event title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'An event must have a description'],
    trim: true
  },
  organizer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'An event must have an organizer']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  startDate: {
    type: Date,
    required: [true, 'An event must have a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'An event must have an end date']
  },
  startTime: String,
  endTime: String,
  images: [String],
  category: {
    type: String,
    enum: ['farmers_market', 'workshop', 'fair', 'community_event', 'other'],
    default: 'farmers_market'
  },
  attendees: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['going', 'interested', 'not_going'],
        default: 'interested'
      }
    }
  ],
  tags: [String],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number, // e.g., every 2 weeks
    endDate: Date
  },
  maxAttendees: Number,
  price: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexing for geospatial and date queries
eventSchema.index({ location: '2dsphere' });
eventSchema.index({ startDate: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ "attendees.user": 1 });

// Populate organizer details
eventSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'organizer',
    select: 'name profileImage'
  });
  next();
});

// Virtual property to get attendee count
eventSchema.virtual('attendeeCount').get(function() {
  return this.attendees.filter(a => a.status === 'going').length;
});

// Virtual property to check if event is past
eventSchema.virtual('isPast').get(function() {
  return new Date(this.endDate) < new Date();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;