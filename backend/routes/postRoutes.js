const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const verificationMiddleware = require('../middleware/verificationMiddleware');

router.post('/', authMiddleware, verificationMiddleware, upload.single('image'), postController.createPost);
router.get('/feed', optionalAuthMiddleware, postController.getFeed);
router.get('/user/:id', optionalAuthMiddleware, postController.getPostsByUser);
router.get('/search', optionalAuthMiddleware, postController.searchPosts);
router.get('/:postId', optionalAuthMiddleware, postController.getPostById);
router.post('/:postId/like', authMiddleware, verificationMiddleware, postController.likePost);
router.post('/:postId/comment', authMiddleware, verificationMiddleware, upload.single('audio'), postController.addComment);
router.get('/:postId/comments', optionalAuthMiddleware, postController.getComments);
router.put('/:postId', authMiddleware, verificationMiddleware, postController.updatePost);
router.delete('/:postId', authMiddleware, postController.deletePost);

module.exports = router;
