const express = require('express');

const http = require('http');

const { Server } = require('socket.io');

const cors = require('cors');

const dotenv = require('dotenv');
dotenv.config(); // Ensure env vars are loaded

const { initBucket } = require('./utils/minio');

const path = require('path');
const fs = require('fs');
// imageStore required removed because we are using local static storage



// Initialize MinIO
initBucket();

// Global Logger for VPS Debugging — capped at 50 MB to prevent disk-full crashes
const logFile = path.join(__dirname, '../node_errors.log');
const LOG_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const logger = (msg) => {
  try {
    // Rotate (truncate) if log exceeds the cap
    if (fs.existsSync(logFile)) {
      const { size } = fs.statSync(logFile);
      if (size > LOG_MAX_BYTES) {
        fs.truncateSync(logFile, 0);
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] --- Log rotated (exceeded ${LOG_MAX_BYTES / 1024 / 1024} MB cap) ---\n`);
      }
    }
    const time = new Date().toISOString();
    fs.appendFileSync(logFile, `[${time}] ${msg}\n`);
    console.log(msg); // Moved inside try-catch block
  } catch (_) { /* never crash on log failure */ }
};

const app = express();

app.use((req, res, next) => {
  logger(`${req.method} ${req.url}`);
  next();
});

process.on('uncaughtException', (err) => {
  logger(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger(`UNHANDLED REJECTION: ${reason}`);
});





const server = http.createServer(app);

const io = new Server(server, {

  cors: {

    origin: "*", // Adjust in production

    methods: ["GET", "POST"]

  }

});



// Temporary "Nuclear Option" CORS to fix development connectivity
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
}));

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


// Profile routes
app.use('/api/profile', profileRoutes);

app.use('/api/auth', authRoutes);

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
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const profileController = require('./controllers/profileController');

// Direct Profile Update Route (to avoid 404 issues in routers)
app.put('/api/profile', authMiddleware, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), profileController.updateProfile);

// Public Image Serving Route (Now Static)
// Local filesystem serves via /uploads route instead of this database route.

// Alias for plural images
app.get('/api/images/:id', (req, res) => res.redirect(`/api/image/${req.params.id}`));

// Health Check & Debug Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    port: process.env.PORT || 5000
  });
});

app.get('/api/ping', (req, res) => res.send('pong'));

// PRIVATE Secure Media Serving Route (Now Static or Middleware validation)
// Add logic if private files are needed. Local filesystem bypasses this entirely for now.







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




// --- FRONTEND STATIC SERVING ---
// Serve static files from the root directory
const staticPath = path.join(__dirname, '..');

// 1. Serve Next.js static assets with high caching
app.use('/_next', express.static(path.join(staticPath, '_next'), {
  maxAge: '365d',
  immutable: true
}));

// 2. Serve other static files (images, favicon, etc)
app.use(express.static(staticPath, {
  maxAge: '1h'
}));

// 3. SPA Fallback: Map clean URLs to .html files or fallback to index.html
app.get(/(.*)/, (req, res) => {
  // Skip API and Socket.io
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ message: 'API Route Not Found' });
  }

  // Try to serve the specific .html file for clean URLs (e.g., /login -> login.html)
  const possibleFile = req.path === '/' ? 'index.html' : `${req.path.replace(/\/$/, '')}.html`;
  const filePath = path.join(staticPath, possibleFile);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Default to index.html for SPA routing
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 MROHAUNG SERVER ACTIVE
----------------------------
Port: ${PORT}
Mode: ${process.env.NODE_ENV || 'development'}
API: https://mrohaung.com/api
----------------------------
`);
});

