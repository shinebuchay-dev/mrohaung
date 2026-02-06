const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

// Submit a report
router.post('/', authMiddleware, reportController.createReport);

// Get reports (In a real app, you'd add adminMiddleware here)
router.get('/', authMiddleware, reportController.getReports);

module.exports = router;
