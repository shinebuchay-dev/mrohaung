const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middleware/authMiddleware');

// Friends management
router.post('/request', authMiddleware, friendController.sendFriendRequest);
router.post('/request/:userId', authMiddleware, friendController.sendFriendRequest);
router.post('/accept/:requestId', authMiddleware, friendController.acceptFriendRequest);
router.delete('/reject/:requestId', authMiddleware, friendController.rejectFriendRequest);
router.get('/requests', authMiddleware, friendController.getPendingRequests);
router.get('/', authMiddleware, friendController.getFriends);

// Frontend calls /api/friends/user/:userId
router.get('/user/:userId', authMiddleware, friendController.getUserFriends);

module.exports = router;
