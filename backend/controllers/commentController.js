const pool = require('../utils/prisma');

const executeWithFallback = async (queryWithDisplayName, queryWithoutDisplayName, params) => {
    try {
        return await pool.execute(queryWithDisplayName, params);
    } catch (e) {
        return await pool.execute(queryWithoutDisplayName, params);
    }
};

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

        // Allow comment author OR post author to delete (optional, sticking to comment author for now as per usual simple requirement, or maybe check post author too?)
        // Let's implement strict comment author ownership for delete for now to be safe, or allow post author.
        // Usually: Comment Author OR Post Author can delete.

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
