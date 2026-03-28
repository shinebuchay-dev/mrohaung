const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shortVideoController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'), false);
        }
    }
});

// Feed (public with optional auth)
router.get('/feed', optionalAuth, ctrl.getFeed);

// User videos (public with optional auth) — MUST be before /:id to avoid wildcard capture
router.get('/user/:username', optionalAuth, ctrl.getUserVideos);

// Single video — generic wildcard, must come after all specific routes
router.get('/:id', optionalAuth, ctrl.getOne);

// Upload
router.post('/', authMiddleware, upload.single('video'), ctrl.upload);

// Like / Unlike
router.post('/:id/like', authMiddleware, ctrl.toggleLike);

// Comments
router.get('/:id/comments', optionalAuth, ctrl.getComments);
router.post('/:id/comments', authMiddleware, ctrl.addComment);
router.post('/comments/:commentId/like', authMiddleware, ctrl.toggleCommentLike);

// Delete
router.delete('/:id', authMiddleware, ctrl.deleteVideo);

module.exports = router;
