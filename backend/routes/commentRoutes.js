const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');

router.delete('/:commentId', authMiddleware, commentController.deleteComment);
router.put('/:commentId', authMiddleware, commentController.updateComment);

module.exports = router;
