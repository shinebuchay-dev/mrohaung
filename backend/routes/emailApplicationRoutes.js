const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emailApplicationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/',          authMiddleware, ctrl.apply);
router.get('/me',         authMiddleware, ctrl.getMyApplication);
router.delete('/me',      authMiddleware, ctrl.cancelApplication);
router.post('/send',      authMiddleware, ctrl.sendEmail);

module.exports = router;
