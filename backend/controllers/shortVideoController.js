const pool = require('../utils/prisma');
const { uploadFile, deleteFile } = require('../utils/minio');
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
                (SELECT COUNT(*) FROM ShortVideoLike WHERE videoId = sv.id) as likeCount,
                (SELECT COUNT(*) FROM ShortVideoComment WHERE videoId = sv.id) as commentCount,
                ${userId ? 'IF((SELECT 1 FROM ShortVideoLike WHERE videoId = sv.id AND userId = ? LIMIT 1), 1, 0) as isLiked' : '0 as isLiked'}
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             ORDER BY sv.createdAt DESC
             LIMIT ? OFFSET ?`,
            userId
                ? [userId, limit, offset]
                : [limit, offset]
        );

        const [[{ total }]] = await pool.execute(
            'SELECT COUNT(*) as total FROM ShortVideo'
        );

        res.json({
            videos: videos.map(v => ({
                ...v,
                likeCount: parseInt(v.likeCount || 0),
                commentCount: parseInt(v.commentCount || 0),
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

// ── GET /api/short-videos/user/:username ────────────────────────────────────
exports.getUserVideos = async (req, res) => {
    try {
        let { username } = req.params;
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, parseInt(req.query.limit) || 12);
        const offset = (page - 1) * limit;
        const userId = req.userId || null;

        // Handle @ prefix if present
        if (username.startsWith('@')) username = username.substring(1);

        const [[targetUser]] = await pool.execute('SELECT id FROM User WHERE username = ?', [username]);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        const [videos] = await pool.query(
            `SELECT
                sv.id, sv.title, sv.description, sv.videoUrl, sv.thumbnailUrl,
                sv.duration, sv.views, sv.createdAt,
                u.id as authorId, u.username, u.displayName, u.avatarUrl, u.isVerified,
                (SELECT COUNT(*) FROM ShortVideoLike WHERE videoId = sv.id) as likeCount,
                (SELECT COUNT(*) FROM ShortVideoComment WHERE videoId = sv.id) as commentCount,
                ${userId ? 'IF((SELECT 1 FROM ShortVideoLike WHERE videoId = sv.id AND userId = ? LIMIT 1), 1, 0) as isLiked' : '0 as isLiked'}
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             WHERE sv.authorId = ?
             ORDER BY sv.createdAt DESC
             LIMIT ? OFFSET ?`,
            userId
                ? [userId, targetUser.id, limit, offset]
                : [targetUser.id, limit, offset]
        );

        res.json({
            videos: videos.map(v => ({
                ...v,
                likeCount: parseInt(v.likeCount || 0),
                commentCount: parseInt(v.commentCount || 0),
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
            limit
        });
    } catch (err) {
        console.error('[ShortVideo] getUserVideos error:', err);
        res.status(500).json({ message: 'Failed to load user videos' });
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
                (SELECT COUNT(*) FROM ShortVideoLike WHERE videoId = sv.id) as likeCount,
                (SELECT COUNT(*) FROM ShortVideoComment WHERE videoId = sv.id) as commentCount,
                ${userId ? 'IF((SELECT 1 FROM ShortVideoLike WHERE videoId = sv.id AND userId = ? LIMIT 1), 1, 0) as isLiked' : '0 as isLiked'}
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             WHERE sv.id = ?`,
            userId ? [userId, id] : [id]
        );

        if (!video) return res.status(404).json({ message: 'Video not found' });

        // Track view
        await pool.execute(
            'UPDATE ShortVideo SET views = views + 1 WHERE id = ?', [id]
        );

        res.json({
            ...video,
            likeCount: parseInt(video.likeCount || 0),
            commentCount: parseInt(video.commentCount || 0),
            isLiked: !!video.isLiked,
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
            'SELECT authorId, videoUrl FROM ShortVideo WHERE id = ?', [id]
        );
        if (!video) return res.status(404).json({ message: 'Video not found' });
        if (video.authorId !== userId) return res.status(403).json({ message: 'Forbidden' });

        // Delete video file from Cloudflare R2 (non-blocking — DB deletion proceeds even if R2 fails)
        if (video.videoUrl) {
            await deleteFile(video.videoUrl);
        }

        // Delete from DB
        await pool.execute('DELETE FROM ShortVideoLike WHERE videoId = ?', [id]);
        await pool.execute('DELETE FROM ShortVideoComment WHERE videoId = ?', [id]);
        await pool.execute('DELETE FROM ShortVideo WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('[ShortVideo] deleteVideo error:', err);
        res.status(500).json({ message: 'Failed to delete video' });
    }
};

// ── GET /api/short-videos/:id/comments ──────────────────────────────────────
exports.getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT
                svc.id,
                svc.videoId,
                svc.userId,
                svc.content,
                svc.createdAt,
                u.username,
                u.displayName,
                u.avatarUrl,
                (SELECT isVerified FROM User WHERE id = svc.userId LIMIT 1) AS isVerified
             FROM ShortVideoComment svc
             JOIN User u ON svc.userId = u.id
             WHERE svc.videoId = ?
             ORDER BY svc.createdAt DESC`,
            [id]
        );
        const formatted = rows.map(c => ({
            id: c.id,
            videoId: c.videoId,
            userId: c.userId,
            content: c.content,
            createdAt: c.createdAt,
            user: {
                id: c.userId,
                username: c.username,
                displayName: c.displayName,
                avatarUrl: c.avatarUrl,
                isVerified: c.isVerified === 1 || c.isVerified === true
            }
        }));
        res.json(formatted);
    } catch (err) {
        console.error('[ShortVideo] getComments error:', err);
        res.status(500).json({ message: 'Failed to load comments' });
    }
};

// ── POST /api/short-videos/:id/comments ─────────────────────────────────────
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const commentId = uuidv4();
        await pool.execute(
            'INSERT INTO ShortVideoComment (id, videoId, userId, content) VALUES (?, ?, ?, ?)',
            [commentId, id, userId, content.trim()]
        );

        const [[comment]] = await pool.execute(
            `SELECT
                svc.id,
                svc.videoId,
                svc.userId,
                svc.content,
                svc.createdAt,
                u.username,
                u.displayName,
                u.avatarUrl,
                (SELECT isVerified FROM User WHERE id = svc.userId LIMIT 1) AS isVerified
             FROM ShortVideoComment svc
             JOIN User u ON svc.userId = u.id
             WHERE svc.id = ?`,
            [commentId]
        );

        res.status(201).json({
            id: comment.id,
            videoId: comment.videoId,
            userId: comment.userId,
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: comment.userId,
                username: comment.username,
                displayName: comment.displayName,
                avatarUrl: comment.avatarUrl,
                isVerified: comment.isVerified === 1 || comment.isVerified === true
            }
        });
    } catch (err) {
        console.error('[ShortVideo] addComment error:', err);
        res.status(500).json({ message: 'Failed to add comment' });
    }
};
