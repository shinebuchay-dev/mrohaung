const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/conversations/:conversationId/messages', authMiddleware, messageController.getMessages);
router.post('/send', authMiddleware, upload.single('image'), messageController.sendMessage);
router.put('/conversations/:conversationId/read', authMiddleware, messageController.markAsRead);
router.get('/unread-count', authMiddleware, messageController.getUnreadCount);
router.post('/:messageId/reaction', authMiddleware, messageController.handleReaction);
router.get('/conversations/:conversationId/media', authMiddleware, messageController.getSharedMedia);

module.exports = router;

