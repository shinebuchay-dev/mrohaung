const express = require('express');

const router = express.Router();

const profileController = require('../controllers/profileController');

const authMiddleware = require('../middleware/authMiddleware');

const multer = require('multer');



const upload = multer({ storage: multer.memoryStorage() });



const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');

router.get('/search', optionalAuthMiddleware, profileController.searchUsers);

router.get('/:id', optionalAuthMiddleware, profileController.getProfile);

// Note: PUT /profile is handled directly in index.js to ensure reliable matching



module.exports = router;

