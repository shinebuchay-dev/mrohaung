const pool = require('../utils/prisma');
const { uploadFile } = require('../utils/minio');
const { v4: uuidv4 } = require('uuid');

// ── GET /api/short-videos/feed ──────────────────────────────────────────────
exports.getFeed = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;
        const userId = req.userId || null;

        const [videos] = await pool.query(
            `SELECT
                sv.id, sv.title, sv.description, sv.videoUrl, sv.thumbnailUrl,
                sv.duration, sv.views, sv.createdAt,
                u.id as authorId, u.username, u.displayName, u.avatarUrl, u.isVerified,
                COUNT(DISTINCT svl.id) as likeCount,
                ${userId ? 'MAX(CASE WHEN svl2.userId = ? THEN 1 ELSE 0 END) as isLiked' : '0 as isLiked'}
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             LEFT JOIN ShortVideoLike svl ON sv.id = svl.videoId
             ${userId ? 'LEFT JOIN ShortVideoLike svl2 ON sv.id = svl2.videoId AND svl2.userId = ?' : ''}
             GROUP BY sv.id
             ORDER BY sv.createdAt DESC
             LIMIT ? OFFSET ?`,
            userId
                ? [userId, userId, limit, offset]
                : [limit, offset]
        );

        const [[{ total }]] = await pool.execute(
            'SELECT COUNT(*) as total FROM ShortVideo'
        );

        res.json({
            videos: videos.map(v => ({
                ...v,
                likeCount: parseInt(v.likeCount || 0),
                isLiked: !!v.isLiked,
                author: {
                    id: v.authorId,
                    username: v.username,
                    displayName: v.displayName,
                    avatarUrl: v.avatarUrl,
                    isVerified: !!v.isVerified
                }
            })),
            page,
            limit,
            total: parseInt(total || 0)
        });
    } catch (err) {
        console.error('[ShortVideo] getFeed error:', err);
        res.status(500).json({ message: 'Failed to load feed' });
    }
};

// ── GET /api/short-videos/:id ────────────────────────────────────────────────
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId || null;

        const [[video]] = await pool.execute(
            `SELECT
                sv.id, sv.title, sv.description, sv.videoUrl, sv.thumbnailUrl,
                sv.duration, sv.views, sv.createdAt,
                u.id as authorId, u.username, u.displayName, u.avatarUrl, u.isVerified,
                COUNT(DISTINCT svl.id) as likeCount
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             LEFT JOIN ShortVideoLike svl ON sv.id = svl.videoId
             WHERE sv.id = ?
             GROUP BY sv.id`,
            [id]
        );

        if (!video) return res.status(404).json({ message: 'Video not found' });

        // Track view
        await pool.execute(
            'UPDATE ShortVideo SET views = views + 1 WHERE id = ?', [id]
        );

        let isLiked = false;
        if (userId) {
            const [[like]] = await pool.execute(
                'SELECT 1 FROM ShortVideoLike WHERE videoId = ? AND userId = ?', [id, userId]
            );
            isLiked = !!like;
        }

        res.json({
            ...video,
            likeCount: parseInt(video.likeCount || 0),
            isLiked,
            author: {
                id: video.authorId,
                username: video.username,
                displayName: video.displayName,
                avatarUrl: video.avatarUrl,
                isVerified: !!video.isVerified
            }
        });
    } catch (err) {
        console.error('[ShortVideo] getOne error:', err);
        res.status(500).json({ message: 'Failed to load video' });
    }
};

// ── POST /api/short-videos ───────────────────────────────────────────────────
exports.upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file provided' });
        }

        const { title = '', description = '' } = req.body;
        const userId = req.userId;
        const id = uuidv4();

        // Upload video to R2
        const videoResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            userId,
            'short-videos'
        );

        await pool.execute(
            `INSERT INTO ShortVideo (id, authorId, title, description, videoUrl, views, createdAt)
             VALUES (?, ?, ?, ?, ?, 0, NOW())`,
            [id, userId, title.trim(), description.trim(), videoResult.url]
        );

        const [[video]] = await pool.execute(
            `SELECT sv.*, u.username, u.displayName, u.avatarUrl
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             WHERE sv.id = ?`,
            [id]
        );

        res.status(201).json(video);
    } catch (err) {
        console.error('[ShortVideo] upload error:', err);
        res.status(500).json({ message: err.message || 'Upload failed' });
    }
};

// ── POST /api/short-videos/:id/like ─────────────────────────────────────────
exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [[existing]] = await pool.execute(
            'SELECT id FROM ShortVideoLike WHERE videoId = ? AND userId = ?',
            [id, userId]
        );

        if (existing) {
            await pool.execute(
                'DELETE FROM ShortVideoLike WHERE videoId = ? AND userId = ?',
                [id, userId]
            );
            res.json({ liked: false });
        } else {
            const likeId = uuidv4();
            await pool.execute(
                'INSERT INTO ShortVideoLike (id, videoId, userId) VALUES (?, ?, ?)',
                [likeId, id, userId]
            );
            res.json({ liked: true });
        }
    } catch (err) {
        console.error('[ShortVideo] toggleLike error:', err);
        res.status(500).json({ message: 'Failed to toggle like' });
    }
};

// ── DELETE /api/short-videos/:id ─────────────────────────────────────────────
exports.deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [[video]] = await pool.execute(
            'SELECT authorId FROM ShortVideo WHERE id = ?', [id]
        );
        if (!video) return res.status(404).json({ message: 'Video not found' });
        if (video.authorId !== userId) return res.status(403).json({ message: 'Forbidden' });

        await pool.execute('DELETE FROM ShortVideoLike WHERE videoId = ?', [id]);
        await pool.execute('DELETE FROM ShortVideo WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('[ShortVideo] deleteVideo error:', err);
        res.status(500).json({ message: 'Failed to delete video' });
    }
};
