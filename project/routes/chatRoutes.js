const express = require('express');
const chatController = require('../controllers/chatController');
const authController = require('../controllers/authController');

const router = express.Router();

// All chat routes require authentication
router.use(authController.protect);

// Chat routes
router.get('/', chatController.getUserChats);
router.get('/:id', chatController.getChat);
router.post('/', chatController.createChat);
router.post('/:id/messages', chatController.addMessage);
router.patch('/:id/read', chatController.markChatAsRead);

module.exports = router;