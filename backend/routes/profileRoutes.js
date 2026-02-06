const express = require('express');

const router = express.Router();

const profileController = require('../controllers/profileController');

const authMiddleware = require('../middleware/authMiddleware');

const multer = require('multer');



const upload = multer({ storage: multer.memoryStorage() });



router.get('/search', authMiddleware, profileController.searchUsers);

router.get('/:id', profileController.getProfile);

router.put('/', authMiddleware, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), profileController.updateProfile);



module.exports = router;

