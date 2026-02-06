const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authMiddleware, upload.single('media'), storyController.createStory);
router.get('/', authMiddleware, storyController.getStories);
router.get('/:id', authMiddleware, storyController.getStory);
router.post('/:id/view', authMiddleware, storyController.viewStory);
router.delete('/:id', authMiddleware, storyController.deleteStory);
router.delete('/cleanup/expired', storyController.deleteExpiredStories);

module.exports = router;
