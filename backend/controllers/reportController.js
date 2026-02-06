const pool = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');

// Create a new report
exports.createReport = async (req, res) => {
    try {
        const reporterId = req.userId;
        const { reason, details, postId, targetUserId } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        if (!postId && !targetUserId) {
            return res.status(400).json({ error: 'Must report either a post or a user' });
        }

        const reportId = uuidv4();

        await pool.execute(
            `INSERT INTO Report (id, reporterId, reason, details, postId, targetUserId, status, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [reportId, reporterId, reason, details || null, postId || null, targetUserId || null]
        );

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            reportId
        });

    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
};

// Get all reports (Admin only - basic implementation)
exports.getReports = async (req, res) => {
    try {
        // checks for admin rights should be in middleware, assuming middleware passed
        const [reports] = await pool.execute(`
            SELECT r.*, 
                   u.username as reporterName,
                   tu.username as reportedUserName
            FROM Report r
            JOIN User u ON r.reporterId = u.id
            LEFT JOIN User tu ON r.targetUserId = tu.id
            ORDER BY r.createdAt DESC
        `);

        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};
