const pool = require('../utils/prisma');

const { v4: uuidv4 } = require('uuid');
const { updateReputation, REPUTATION_POINTS } = require('../utils/reputation');
const { sendNotification } = require('../utils/notificationHelper');

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        // Check if comment exists and verify ownership
        const [comments] = await pool.execute(
            'SELECT * FROM Comment WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const comment = comments[0];

        // Fetch Post to check author
        const [posts] = await pool.execute('SELECT authorId FROM Post WHERE id = ?', [comment.postId]);
        const postAuthorId = posts.length > 0 ? posts[0].authorId : null;

        if (comment.userId !== req.userId && postAuthorId !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        await pool.execute('DELETE FROM Comment WHERE id = ?', [commentId]);

        // Emit socket event
        const io = req.app.get('io');
        io.to(`post:${comment.postId}`).emit('comment_deleted', { commentId, postId: comment.postId });

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting comment' });
    }
};

exports.updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;

        const [comments] = await pool.execute(
            'SELECT * FROM Comment WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comments[0].userId !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this comment' });
        }

        await pool.execute(
            'UPDATE Comment SET content = ? WHERE id = ?',
            [content, commentId]
        );

        // Emit socket event
        const io = req.app.get('io');
        io.to(`post:${comments[0].postId}`).emit('comment_updated', { commentId, content, postId: comments[0].postId });

        res.json({ message: 'Comment updated successfully', content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating comment' });
    }
};

exports.likeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { type = 'like' } = req.body;

        const [existing] = await pool.execute(
            'SELECT * FROM CommentLike WHERE commentId = ? AND userId = ?',
            [commentId, req.userId]
        );

        let finalLiked = true;

        if (existing.length > 0) {
            if (existing[0].type === type) {
                // Toggle off
                await pool.execute('DELETE FROM CommentLike WHERE id = ?', [existing[0].id]);
                finalLiked = false;
            } else {
                // Update type
                await pool.execute('UPDATE CommentLike SET type = ? WHERE id = ?', [type, existing[0].id]);
                finalLiked = true;
            }
        } else {
            // New Like
            const likeId = uuidv4();
            await pool.execute(
                'INSERT INTO CommentLike (id, commentId, userId, type) VALUES (?, ?, ?, ?)',
                [likeId, commentId, req.userId, type]
            );

            // Notify comment author
            const [commentInfo] = await pool.execute('SELECT userId, postId FROM Comment WHERE id = ?', [commentId]);

            if (commentInfo.length > 0 && commentInfo[0].userId !== req.userId) {
                const io = req.app.get('io');
                await sendNotification(io, commentInfo[0].userId, {
                    type: 'like_comment',
                    message: 'liked your comment',
                    fromUserId: req.userId,
                    postId: commentInfo[0].postId
                });
                // Award reputation? Maybe small amount
            }
        }

        res.json({ liked: finalLiked, type: finalLiked ? type : null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error liking comment' });
    }
};

