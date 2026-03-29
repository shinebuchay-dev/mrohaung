const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Global Logger
const logFile = path.join(__dirname, '../node_errors.log');
const logger = (msg) => {
  try {
    const time = new Date().toISOString();
    fs.appendFileSync(logFile, `[${time}] ${msg}\n`);
    console.log(msg);
  } catch (_) {}
};

app.use((req, res, next) => {
  logger(`${req.method} ${req.url}`);
  next();
});

// Socket.io
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());

// Public Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Router ---
const apiRouter = express.Router();

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
const shortVideoRoutes = require('./routes/shortVideoRoutes');
const emailApplicationRoutes = require('./routes/emailApplicationRoutes');

const authMiddleware = require('./middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const profileController = require('./controllers/profileController');

// Standard API Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/profile', profileRoutes);

// Bulletproof Direct PUT for Profile
apiRouter.put('/profile', authMiddleware, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), profileController.updateProfile);

apiRouter.use('/posts', postRoutes);
apiRouter.use('/comments', commentRoutes);
apiRouter.use('/friends', friendRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/messages', messageRoutes);
apiRouter.use('/stories', storyRoutes);
apiRouter.use('/suggestions', suggestionRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/privacy', privacyRoutes);
apiRouter.use('/short-videos', shortVideoRoutes);
apiRouter.use('/email-applications', emailApplicationRoutes);

// Mount API Router to /api
app.use('/api', apiRouter);

// Socket.io Connection
const jwt = require('jsonwebtoken');
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.join(`user:${socket.userId}`);
    } catch (e) {}
  }
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
app.set('io', io);

// Frontend Static Serving
const staticPath = path.join(__dirname, '..');
app.use('/_next', express.static(path.join(staticPath, '_next')));
app.use(express.static(staticPath));

app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return res.status(404).json({ message: 'API Route Not Found' });
  }
  const possibleFile = req.path === '/' ? 'index.html' : `${req.path.replace(/\/$/, '')}.html`;
  const filePath = path.join(staticPath, possibleFile);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER ACTIVE ON PORT ${PORT}`);
});

// Start Custom Native SMTP Server on Port 25
try {
  const startSMTPServer = require('./smtp_server');
  startSMTPServer();
} catch (err) {
  console.error('Failed to start native SMTP server:', err);
}
