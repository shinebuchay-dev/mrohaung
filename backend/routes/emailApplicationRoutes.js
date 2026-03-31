const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emailApplicationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/',                  authMiddleware, ctrl.apply);
router.get('/me',                 authMiddleware, ctrl.getMyApplication);
router.delete('/me',              authMiddleware, ctrl.cancelApplication);
router.post('/send',              authMiddleware, ctrl.sendEmail);
router.post('/relay',             ctrl.relayEmail);
router.get('/inbox',              authMiddleware, ctrl.getInbox);
router.get('/sent',               authMiddleware, ctrl.getSent);
router.get('/folder/:folderName', authMiddleware, ctrl.getFolderEmails);
router.post('/action',            authMiddleware, ctrl.emailAction);
router.get('/admin/overview',     authMiddleware, ctrl.adminOverview);
router.post('/webhook/receive',   ctrl.webhookReceive); 

module.exports = router;
