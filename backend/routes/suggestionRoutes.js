const express = require('express');
const router = express.Router();
const suggestionController = require('../controllers/suggestionController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/friends', authMiddleware, suggestionController.getFriendSuggestions);
router.get('/random', authMiddleware, suggestionController.getRandomSuggestions);
router.post('/dismiss/:userId', authMiddleware, suggestionController.dismissSuggestion);

module.exports = router;
