const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');

// Socket.io setup
module.exports = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store online users
  const onlineUsers = new Map();

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket
      socket.user = {
        id: user._id,
        name: user.name,
        role: user.role
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Add user to online users
    onlineUsers.set(socket.user.id.toString(), socket.id);

    // Join user to their personal room
    socket.join(socket.user.id.toString());

    // Send online status to clients
    io.emit('userStatus', {
      userId: socket.user.id,
      status: 'online'
    });

    // Handle joining a chat room
    socket.on('joinChat', async (chatId) => {
      try {
        // Find chat to check if user is a participant
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant = chat.participants.some(
          (participant) => participant.toString() === socket.user.id.toString()
        );

        if (!isParticipant && socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Not authorized to join this chat' });
          return;
        }

        // Join the chat room
        socket.join(chatId);
        
        // Mark messages as read
        await Chat.findOneAndUpdate(
          { 
            _id: chatId,
            'messages.sender': { $ne: socket.user.id },
            'messages.isRead': false
          },
          { 
            $set: { 
              'messages.$[elem].isRead': true,
              'messages.$[elem].readAt': new Date()
            } 
          },
          { 
            arrayFilters: [{ 'elem.sender': { $ne: socket.user.id }, 'elem.isRead': false }],
            new: true
          }
        );

        // Notify client that messages were read
        socket.emit('messagesRead', { chatId });
        
      } catch (error) {
        socket.emit('error', { message: 'Error joining chat' });
      }
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      try {
        const { chatId, content } = data;
        
        if (!content.trim()) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        // Find chat to check if user is a participant
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant = chat.participants.some(
          (participant) => participant.toString() === socket.user.id.toString()
        );

        if (!isParticipant && socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Not authorized to send messages in this chat' });
          return;
        }

        // Add message to chat
        const newMessage = {
          sender: socket.user.id,
          content,
          createdAt: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastActivity = new Date();
        await chat.save();

        // Get the newly added message
        const addedMessage = chat.messages[chat.messages.length - 1];

        // Emit message to all participants in the chat
        io.to(chatId).emit('newMessage', {
          chatId,
          message: {
            _id: addedMessage._id,
            sender: {
              _id: socket.user.id,
              name: socket.user.name
            },
            content: addedMessage.content,
            isRead: addedMessage.isRead,
            createdAt: addedMessage.createdAt
          }
        });

        // Send notification to other participants if they're not in the chat room
        chat.participants.forEach((participant) => {
          const participantId = participant.toString();
          
          if (participantId !== socket.user.id.toString()) {
            const participantSocketId = onlineUsers.get(participantId);
            
            if (participantSocketId) {
              io.to(participantSocketId).emit('chatNotification', {
                chatId,
                message: `New message from ${socket.user.name}`,
                sender: {
                  _id: socket.user.id,
                  name: socket.user.name
                }
              });
            }
          }
        });

      } catch (error) {
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle creating a new chat
    socket.on('createChat', async (data) => {
      try {
        const { participantId, productId, initialMessage } = data;
        
        // Check if participant exists
        const participant = await User.findById(participantId);
        
        if (!participant) {
          socket.emit('error', { message: 'Participant not found' });
          return;
        }

        // Check if a chat already exists between these users for this product
        let chat = await Chat.findOne({
          participants: { $all: [socket.user.id, participantId] },
          product: productId
        });

        if (!chat) {
          // Create new chat
          chat = new Chat({
            participants: [socket.user.id, participantId],
            product: productId,
            messages: initialMessage ? [
              {
                sender: socket.user.id,
                content: initialMessage
              }
            ] : []
          });
          
          await chat.save();
        } else if (initialMessage) {
          // Add initial message to existing chat
          chat.messages.push({
            sender: socket.user.id,
            content: initialMessage
          });
          
          chat.lastActivity = new Date();
          await chat.save();
        }

        // Populate chat details for response
        await chat.populate('participants', 'name profileImage');
        await chat.populate('product', 'name images price');

        // Emit chat creation event to both participants
        socket.emit('chatCreated', { chat });
        
        const participantSocketId = onlineUsers.get(participantId);
        if (participantSocketId) {
          io.to(participantSocketId).emit('chatCreated', { chat });
        }

      } catch (error) {
        socket.emit('error', { message: 'Error creating chat' });
      }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      
      // Remove user from online users
      onlineUsers.delete(socket.user.id.toString());

      // Send offline status to clients
      io.emit('userStatus', {
        userId: socket.user.id,
        status: 'offline'
      });
    });
  });

  return io;
};