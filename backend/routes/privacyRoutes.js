const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacyController');
const authMiddleware = require('../middleware/authMiddleware');

// Block/Unblock users
router.post('/block/:blockedId', authMiddleware, privacyController.blockUser);
router.delete('/unblock/:blockedId', authMiddleware, privacyController.unblockUser);
router.get('/blocked', authMiddleware, privacyController.getBlockedUsers);
router.get('/check-blocked/:targetUserId', authMiddleware, privacyController.checkBlocked);

// Account privacy
router.put('/account', authMiddleware, privacyController.updatePrivacy);
router.get('/account', authMiddleware, privacyController.getPrivacy);

module.exports = router;
