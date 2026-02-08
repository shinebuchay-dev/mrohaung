const express = require('express');

const http = require('http');

const { Server } = require('socket.io');

const cors = require('cors');

const dotenv = require('dotenv');

const { initBucket } = require('./utils/minio');

const path = require('path');
const imageStore = require('./services/imageStore');



dotenv.config();



// Initialize MinIO

initBucket();



const app = express();

const server = http.createServer(app);

const io = new Server(server, {

  cors: {

    origin: "*", // Adjust in production

    methods: ["GET", "POST"]

  }

});



const allowedOrigins = [
  'http://localhost:3000',
  'https://social.shinebuchay.com',
  'https://mrohaung.com',
  'https://www.mrohaung.com',
  'https://api.mrohaung.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

app.use(express.json());

// Health Check Route for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});



app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Routes

const authRoutes = require('./routes/authRoutes');

const profileRoutes = require('./routes/profileRoutes');

const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');

const friendRoutes = require('./routes/friendRoutes');

const notificationRoutes = require('./routes/notificationRoutes');

const messageRoutes = require('./routes/messageRoutes');

const storyRoutes = require('./routes/storyRoutes');

const suggestionRoutes = require('./routes/suggestionRoutes');

const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const privacyRoutes = require('./routes/privacyRoutes');


app.use('/api/auth', authRoutes);

app.use('/api/profile', profileRoutes);

app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

app.use('/api/friends', friendRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/messages', messageRoutes);

app.use('/api/stories', storyRoutes);

app.use('/api/suggestions', suggestionRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/privacy', privacyRoutes);

const authMiddleware = require('./middleware/authMiddleware');

// Public SQLite Image Serving Route
app.get(['/api/images/:id', '/api/image/:id'], (req, res) => {
  try {
    const image = imageStore.getImage(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Dynamic MIME Type handling
    const mimeType = image.mime_type || 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.send(image.data);
  } catch (error) {
    console.error('Error serving public image:', error);
    res.status(500).send('Internal server error');
  }
});

// PRIVATE Secure Media Serving Route (Sensitive Docs)
app.get('/api/media/private/:id', authMiddleware, (req, res) => {
  try {
    const image = imageStore.getPrivateImage(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Private media not found' });
    }

    // Security Check: Only owner can view or Admin
    // We check admin status from a session/request if available, 
    // but for now strictly ownership. 
    // If you want admins to see it, you'd need to fetch their role here too.
    if (image.owner_id !== req.userId) {
      // Check if current user is admin
      // This is a quick check, but adminMiddleware should ideally be used if we had a combined middleware
      return res.status(403).json({ message: 'Unauthorized to view this private media' });
    }

    // SECURITY HEADERS
    res.setHeader('X-Robots-Tag', 'noindex, nofollow'); // Prevents Search Engines
    res.setHeader('Content-Type', image.mime_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=0, no-cache'); // Do not cache private docs

    res.send(image.data);
  } catch (error) {
    console.error('Error serving private media:', error);
    res.status(500).send('Internal server error');
  }
});



app.get('/', (req, res) => {

  res.send('Social Media API is running...');

});



// Socket.io connection logic with authentication

const jwt = require('jsonwebtoken');



io.on('connection', (socket) => {

  console.log('A user connected:', socket.id);



  // Authenticate user

  const token = socket.handshake.auth.token;

  if (token) {

    try {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.userId;



      // Join user's personal room for targeted notifications

      socket.join(`user:${socket.userId}`);

      console.log(`User ${socket.userId} joined their room`);

    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      // Don't throw, just let the user be unauthenticated
    }
  }



  // Join conversation room

  socket.on('join_conversation', (conversationId) => {

    socket.join(`conversation:${conversationId}`);

    console.log(`User ${socket.userId} joined conversation ${conversationId}`);

  });



  // Leave conversation room

  socket.on('leave_conversation', (conversationId) => {

    socket.leave(`conversation:${conversationId}`);

    console.log(`User ${socket.userId} left conversation ${conversationId}`);

  });



  // Typing indicator

  socket.on('typing', ({ conversationId, username }) => {

    socket.to(`conversation:${conversationId}`).emit('user_typing', {

      userId: socket.userId,

      username,

      conversationId

    });

  });



  // Stop typing indicator
  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
      userId: socket.userId,
      conversationId
    });
  });

  // Post rooms for real-time comments
  socket.on('join_post', (postId) => {
    socket.join(`post:${postId}`);
    console.log(`User ${socket.userId} joined post room ${postId}`);
  });

  socket.on('leave_post', (postId) => {
    socket.leave(`post:${postId}`);
    console.log(`User ${socket.userId} left post room ${postId}`);
  });



  socket.on('disconnect', () => {

    console.log('User disconnected:', socket.id);

  });

});



// Make io available globally for controllers

app.set('io', io);



const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

  console.log(`Server is running on port ${PORT}`);

});

