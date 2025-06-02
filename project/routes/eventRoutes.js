const express = require('express');
const { body } = require('express-validator');
const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validator');

const router = express.Router();

// Validation middleware for events
const eventValidation = [
  body('title').notEmpty().withMessage('Event title is required'),
  body('description').notEmpty().withMessage('Event description is required'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('location').notEmpty().withMessage('Event location is required'),
  body('category')
    .optional()
    .isIn(['farmers_market', 'workshop', 'fair', 'community_event', 'other'])
    .withMessage('Invalid event category'),
  validateRequest
];

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/upcoming', eventController.getUpcomingEvents);
router.get('/nearby', eventController.getNearbyEvents);
router.get('/:id', eventController.getEvent);

// Protected routes
router.use(authController.protect);

// Create event - farmers and admins only
router.post(
  '/',
  authController.restrictTo('farmer', 'admin'),
  eventController.uploadEventImages,
  eventController.resizeEventImages,
  eventValidation,
  eventController.createEvent
);

router.patch(
  '/:id',
  eventController.uploadEventImages,
  eventController.resizeEventImages,
  eventController.updateEvent
);

router.delete('/:id', eventController.deleteEvent);

// RSVP to an event
router.post('/:id/attend', eventController.attendEvent);

// Get attendees for an event
router.get(
  '/:id/attendees',
  authController.restrictTo('farmer', 'admin'),
  eventController.getEventAttendees
);

module.exports = router;