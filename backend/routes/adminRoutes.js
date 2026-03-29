const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

router.use(authMiddleware, adminMiddleware);

router.get('/overview', adminController.getOverview);

router.get('/users', adminController.listUsers);
router.delete('/users/:userId', adminController.deleteUser);

// router.get('/posts', adminController.listPosts);
// router.delete('/posts/:postId', adminController.deletePost);

// router.get('/stories', adminController.listStories);
// router.delete('/stories/:storyId', adminController.deleteStory);

// router.get('/comments', adminController.listComments);
// router.delete('/comments/:commentId', adminController.deleteComment);

// router.get('/messages', adminController.listMessages);
// router.delete('/messages/:messageId', adminController.deleteMessage);

router.get('/notifications', adminController.listNotifications);
router.delete('/notifications/:notificationId', adminController.deleteNotification);

router.get('/verification-requests', adminController.listVerificationRequests);
router.post('/verify-action', adminController.handleVerificationAction);

// Email Applications
const emailAppCtrl = require('../controllers/emailApplicationController');
router.get('/email-applications', emailAppCtrl.adminList);
router.patch('/email-applications/:id', emailAppCtrl.adminAction);

// Notifications management is handled by separate routes if needed, 
// for now we keep the list available in dashboard for basic admin oversight 
// if the user didn't explicitly ask to remove it too. 
// They asked to remove Messages, Stories, Comments, Posts specifically.

module.exports = router;
