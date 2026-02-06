const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authMiddleware, upload.single('image'), postController.createPost);
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');

router.post('/', authMiddleware, upload.single('image'), postController.createPost);
router.get('/feed', optionalAuthMiddleware, postController.getFeed);
router.post('/:postId/like', authMiddleware, postController.likePost);
router.post('/:postId/comment', authMiddleware, upload.single('audio'), postController.addComment);
router.get('/:postId/comments', authMiddleware, postController.getComments);
router.put('/:postId', authMiddleware, postController.updatePost);
router.delete('/:postId', authMiddleware, postController.deletePost);

module.exports = router;
