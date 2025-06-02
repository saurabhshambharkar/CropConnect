const Chat = require('../models/Chat');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all chats for current user
exports.getUserChats = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({
    participants: req.user.id,
    isActive: true
  })
    .sort('-lastActivity')
    .populate('participants', 'name profileImage')
    .populate('product', 'name images price')
    .populate('order', 'status totalAmount');
  
  res.status(200).json({
    status: 'success',
    results: chats.length,
    data: {
      chats
    }
  });
});

// Get a single chat by ID
exports.getChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id)
    .populate('participants', 'name profileImage')
    .populate('product', 'name images price')
    .populate('order', 'status totalAmount');
  
  if (!chat) {
    return next(new AppError('No chat found with that ID', 404));
  }
  
  // Check if user is a participant
  if (!chat.participants.some(p => p._id.toString() === req.user.id)) {
    return next(
      new AppError('You do not have permission to access this chat', 403)
    );
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      chat
    }
  });
});

// Create a new chat
exports.createChat = catchAsync(async (req, res, next) => {
  const { recipientId, productId, orderId, initialMessage } = req.body;
  
  if (!recipientId) {
    return next(new AppError('Recipient ID is required', 400));
  }
  
  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  
  if (!recipient) {
    return next(new AppError('Recipient not found', 404));
  }
  
  // Check if chat already exists
  let filter = {
    participants: { $all: [req.user.id, recipientId] },
    isActive: true
  };
  
  if (productId) filter.product = productId;
  if (orderId) filter.order = orderId;
  
  let chat = await Chat.findOne(filter);
  
  if (chat) {
    return res.status(200).json({
      status: 'success',
      data: {
        chat
      }
    });
  }
  
  // Create new chat
  chat = new Chat({
    participants: [req.user.id, recipientId],
    product: productId,
    order: orderId,
    messages: initialMessage ? [{
      sender: req.user.id,
      content: initialMessage
    }] : [],
    lastActivity: Date.now()
  });
  
  await chat.save();
  
  // Populate chat details
  await chat.populate('participants', 'name profileImage');
  if (productId) await chat.populate('product', 'name images price');
  if (orderId) await chat.populate('order', 'status totalAmount');
  
  res.status(201).json({
    status: 'success',
    data: {
      chat
    }
  });
});

// Add message to a chat
exports.addMessage = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  
  if (!content || !content.trim()) {
    return next(new AppError('Message content is required', 400));
  }
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('No chat found with that ID', 404));
  }
  
  // Check if user is a participant
  if (!chat.participants.some(p => p.toString() === req.user.id)) {
    return next(
      new AppError('You do not have permission to send messages in this chat', 403)
    );
  }
  
  // Add message
  chat.messages.push({
    sender: req.user.id,
    content,
    createdAt: Date.now()
  });
  
  chat.lastActivity = Date.now();
  await chat.save();
  
  // Get the newly added message
  const newMessage = chat.messages[chat.messages.length - 1];
  
  res.status(201).json({
    status: 'success',
    data: {
      message: newMessage
    }
  });
});

// Mark chat messages as read
exports.markChatAsRead = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('No chat found with that ID', 404));
  }
  
  // Check if user is a participant
  if (!chat.participants.some(p => p.toString() === req.user.id)) {
    return next(
      new AppError('You do not have permission to access this chat', 403)
    );
  }
  
  // Mark all messages not sent by the current user as read
  for (const message of chat.messages) {
    if (
      message.sender.toString() !== req.user.id &&
      !message.isRead
    ) {
      message.isRead = true;
      message.readAt = Date.now();
    }
  }
  
  await chat.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      chat
    }
  });
});