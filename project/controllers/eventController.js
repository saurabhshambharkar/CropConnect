const Event = require('../models/Event');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const { uploadImages, resizeProductImages } = require('../utils/fileUpload');

// Upload event images middleware
exports.uploadEventImages = uploadImages('events', 5);

// Resize event images middleware
exports.resizeEventImages = resizeProductImages('events');

// Get all events with filtering, sorting, pagination
exports.getAllEvents = factory.getAll(Event);

// Get single event by ID
exports.getEvent = factory.getOne(Event);

// Create new event - only farmers and admins can create events
exports.createEvent = catchAsync(async (req, res, next) => {
  // Set organizer ID from authenticated user
  if (!req.body.organizer) req.body.organizer = req.user.id;
  
  // Add image paths from upload middleware if available
  if (req.files) {
    req.body.images = [];
    req.files.forEach(file => {
      req.body.images.push(file.filename);
    });
  }
  
  const newEvent = await Event.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      event: newEvent
    }
  });
});

// Update event - only the organizer or admin can update
exports.updateEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }
  
  // Check if user is the organizer of the event or an admin
  if (event.organizer.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to update this event', 403)
    );
  }
  
  // Add image paths from upload middleware if available
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.filename);
  }
  
  const updatedEvent = await Event.findByIdAndUpdate(
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
      event: updatedEvent
    }
  });
});

// Delete event - only the organizer or admin can delete
exports.deleteEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }
  
  // Check if user is the organizer of the event or an admin
  if (event.organizer.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to delete this event', 403)
    );
  }
  
  await Event.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get upcoming events
exports.getUpcomingEvents = catchAsync(async (req, res, next) => {
  const events = await Event.find({
    startDate: { $gte: new Date() },
    isActive: true
  }).sort('startDate');
  
  res.status(200).json({
    status: 'success',
    results: events.length,
    data: {
      events
    }
  });
});

// Get nearby events
exports.getNearbyEvents = catchAsync(async (req, res, next) => {
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
  
  const events = await Event.find({
    startDate: { $gte: new Date() },
    isActive: true,
    location: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] }
    }
  }).sort('startDate');
  
  res.status(200).json({
    status: 'success',
    results: events.length,
    data: {
      events
    }
  });
});

// RSVP to an event
exports.attendEvent = catchAsync(async (req, res, next) => {
  const { status = 'going' } = req.body;
  
  if (!['going', 'interested', 'not_going'].includes(status)) {
    return next(new AppError('Invalid RSVP status', 400));
  }
  
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }
  
  // Check if event has already passed
  if (new Date(event.endDate) < new Date()) {
    return next(new AppError('Cannot RSVP to a past event', 400));
  }
  
  // Check if event has reached maximum attendees
  if (
    status === 'going' &&
    event.maxAttendees &&
    event.attendees.filter(a => a.status === 'going').length >= event.maxAttendees
  ) {
    return next(new AppError('Event has reached maximum attendees', 400));
  }
  
  // Check if user has already RSVP'd
  const attendeeIndex = event.attendees.findIndex(
    a => a.user.toString() === req.user.id
  );
  
  if (attendeeIndex >= 0) {
    // Update existing RSVP
    event.attendees[attendeeIndex].status = status;
  } else {
    // Add new RSVP
    event.attendees.push({
      user: req.user.id,
      status
    });
  }
  
  await event.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      event
    }
  });
});

// Get attendees for an event
exports.getEventAttendees = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }
  
  // Check if user is the organizer or an admin
  if (event.organizer.id !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to view attendees', 403)
    );
  }
  
  // Populate attendee details
  await event.populate('attendees.user', 'name email phone');
  
  res.status(200).json({
    status: 'success',
    data: {
      attendees: event.attendees
    }
  });
});