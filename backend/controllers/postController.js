const pool = require('../utils/prisma');
const { uploadFile } = require('../utils/minio');
const { v4: uuidv4 } = require('uuid');
const { sendNotification } = require('../utils/notificationHelper');
const { updateReputation, REPUTATION_POINTS } = require('../utils/reputation');

const executeWithFallback = async (queryWithDisplayName, queryWithoutDisplayName, params) => {
    try {
        return await pool.execute(queryWithDisplayName, params);
    } catch (e) {
        return await pool.execute(queryWithoutDisplayName, params);
    }
};

exports.createPost = async (req, res) => {
    try {
        const { content, privacy = 'public', tags } = req.body;
        let imageUrl = null;

        if (req.file) {
            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            imageUrl = uploadResult.url;
        }

        const postId = uuidv4();
        await pool.execute(
            'INSERT INTO Post (id, content, imageUrl, privacy, authorId, tags) VALUES (?, ?, ?, ?, ?, ?)',
            [postId, content, imageUrl, privacy, req.userId, tags || null]
        );

        await updateReputation(req.userId, REPUTATION_POINTS.CREATE_POST);

        const [posts] = await pool.execute(
            `SELECT p.*, u.username, u.avatarUrl, u.displayName 
             FROM Post p 
             JOIN User u ON p.authorId = u.id 
             WHERE p.id = ?`,
            [postId]
        );

        const post = posts[0];
        // Format to match expected structure
        post.author = { username: post.username, displayName: post.displayName, avatarUrl: post.avatarUrl };
        delete post.username;
        delete post.displayName;
        delete post.avatarUrl;

        res.status(201).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating post' });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const totalLimit = parseInt(req.query.limit) || 10;
        const currentUserId = req.userId; // Can be null now

        if (!currentUserId) {
            // Guest Feed: Show only public posts
            const offset = (page - 1) * totalLimit;
            const guestQuery = `
                SELECT p.*, u.username, u.avatarUrl, u.isPrivate,
                (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
                (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
                'suggested' as feedType
                FROM Post p 
                JOIN User u ON p.authorId = u.id 
                WHERE p.privacy = 'public'
                ORDER BY p.createdAt DESC
                LIMIT ? OFFSET ?
            `;

            let [posts] = [[], []];
            try {
                const guestQueryWithDN = guestQuery.replace('u.avatarUrl,', 'u.avatarUrl, u.displayName,');
                [posts] = await pool.execute(guestQueryWithDN, [totalLimit, offset]);
            } catch (e) {
                [posts] = await pool.execute(guestQuery, [totalLimit, offset]);
            }

            const formattedPosts = posts.map(post => {
                const formatted = {
                    ...post,
                    author: {
                        id: post.authorId,
                        username: post.username,
                        displayName: post.displayName,
                        avatarUrl: post.avatarUrl
                    },
                    _count: {
                        likes: parseInt(post.likeCount || 0),
                        comments: parseInt(post.commentCount || 0)
                    },
                    feedType: 'suggested'
                };
                delete formatted.username;
                delete formatted.displayName;
                delete formatted.avatarUrl;
                delete formatted.likeCount;
                delete formatted.commentCount;
                delete formatted.isPrivate;
                return formatted;
            });
            return res.json(formattedPosts);
        }

        // Authenticated Feed Logic (70% Friends, 30% Suggested)
        let friendLimit = Math.ceil(totalLimit * 0.7);
        let suggestedLimit = totalLimit - friendLimit;

        const friendOffset = (page - 1) * friendLimit;
        const suggestedOffset = (page - 1) * suggestedLimit;

        // 1. Fetch Friends & Own Posts
        const friendsQuery = `
            SELECT p.*, u.username, u.avatarUrl, u.isPrivate,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            'friend' as feedType
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            WHERE 
            NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = p.authorId)
                OR (blockerId = p.authorId AND blockedId = ?)
            )
            AND (
                p.authorId = ?
                OR (EXISTS (
                    SELECT 1 FROM Friendship 
                    WHERE ((userId = ? AND friendId = p.authorId) OR (userId = p.authorId AND friendId = ?))
                    AND status = 'accepted'
                ) AND (p.privacy IN ('public', 'friends')))
            )
            ORDER BY p.createdAt DESC
            LIMIT ? OFFSET ?
        `;

        // 2. Fetch Suggested Posts (Public posts from non-friends)
        const suggestedQuery = `
            SELECT p.*, u.username, u.avatarUrl, u.isPrivate,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            'suggested' as feedType
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            WHERE 
            p.privacy = 'public'
            AND p.authorId != ?
            AND NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = p.authorId)
                OR (blockerId = p.authorId AND blockedId = ?)
            )
            AND NOT EXISTS (
                SELECT 1 FROM Friendship 
                WHERE ((userId = ? AND friendId = p.authorId) OR (userId = p.authorId AND friendId = ?))
                AND status = 'accepted'
            )
            ORDER BY p.createdAt DESC
            LIMIT ? OFFSET ?
        `;

        // We use u.username as a fallback if displayName is missing in the database schema check
        // but for simplicity and robustness in this environment, we'll try to get displayName only if it exists

        let [friendPosts] = [[], []];
        let [suggestedPosts] = [[], []];

        try {
            const fQueryWithDN = friendsQuery.replace('u.avatarUrl,', 'u.avatarUrl, u.displayName,');
            [friendPosts] = await pool.execute(fQueryWithDN, [
                currentUserId, currentUserId,
                currentUserId, currentUserId, currentUserId,
                friendLimit, friendOffset
            ]);
        } catch (e) {
            [friendPosts] = await pool.execute(friendsQuery, [
                currentUserId, currentUserId,
                currentUserId, currentUserId, currentUserId,
                friendLimit, friendOffset
            ]);
        }

        try {
            const sQueryWithDN = suggestedQuery.replace('u.avatarUrl,', 'u.avatarUrl, u.displayName,');
            [suggestedPosts] = await pool.execute(sQueryWithDN, [
                currentUserId, currentUserId, currentUserId,
                currentUserId, currentUserId,
                suggestedLimit, suggestedOffset
            ]);
        } catch (e) {
            [suggestedPosts] = await pool.execute(suggestedQuery, [
                currentUserId, currentUserId, currentUserId,
                currentUserId, currentUserId,
                suggestedLimit, suggestedOffset
            ]);
        }

        // Combine
        let allPosts = [...friendPosts, ...suggestedPosts];
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const formattedPosts = allPosts.map(post => {
            const formatted = {
                ...post,
                author: {
                    id: post.authorId,
                    username: post.username,
                    displayName: post.displayName,
                    avatarUrl: post.avatarUrl
                },
                _count: {
                    likes: parseInt(post.likeCount || 0),
                    comments: parseInt(post.commentCount || 0)
                },
                feedType: post.feedType
            };
            delete formatted.username;
            delete formatted.displayName;
            delete formatted.avatarUrl;
            delete formatted.likeCount;
            delete formatted.commentCount;
            delete formatted.isPrivate;
            return formatted;
        });

        res.json(formattedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching feed' });
    }
};

exports.likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { type = 'like' } = req.body; // Default to 'like' if not provided

        const [existing] = await pool.execute(
            'SELECT * FROM \`Like\` WHERE postId = ? AND userId = ?',
            [postId, req.userId]
        );

        if (existing.length > 0) {
            if (existing[0].type === type) {
                // Same reaction clicked -> Toggle off (Delete)
                await pool.execute('DELETE FROM \`Like\` WHERE id = ?', [existing[0].id]);
                return res.json({ liked: false, type: null });
            } else {
                // Different reaction clicked -> Update type
                await pool.execute('UPDATE \`Like\` SET type = ? WHERE id = ?', [type, existing[0].id]);
                return res.json({ liked: true, type: type });
            }
        }

        // New reaction
        const likeId = uuidv4();
        await pool.execute(
            'INSERT INTO \`Like\` (id, postId, userId, type) VALUES (?, ?, ?, ?)',
            [likeId, postId, req.userId, type]
        );

        // Get post author for notification
        const [postInfo] = await pool.execute(
            'SELECT authorId FROM Post WHERE id = ?',
            [postId]
        );

        // Send notification to post author (don't notify yourself)
        if (postInfo[0] && postInfo[0].authorId !== req.userId) {
            const io = req.app.get('io');
            await sendNotification(io, postInfo[0].authorId, {
                type: 'like', // Notification type remains 'like' for simplicity, or could be dynamic
                message: `reacted with ${type} to your post`,
                fromUserId: req.userId,
                postId: postId
            });

            // Award reputation to post author
            await updateReputation(postInfo[0].authorId, REPUTATION_POINTS.RECEIVE_LIKE);
        }

        res.json({ liked: true, type: type });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error liking post' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, stickerUrl, parentId } = req.body;
        let audioUrl = null;

        if (req.file) {
            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            audioUrl = uploadResult.url;
        }

        const commentId = uuidv4();

        await pool.execute(
            'INSERT INTO Comment (id, content, audioUrl, stickerUrl, postId, userId, parentId) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [commentId, content || null, audioUrl, stickerUrl || null, postId, req.userId, parentId || null]
        );

        // Award reputation to commenter
        await updateReputation(req.userId, REPUTATION_POINTS.CREATE_COMMENT);

        // Award reputation to post author
        const [postResult] = await pool.execute('SELECT authorId FROM Post WHERE id = ?', [postId]);
        if (postResult.length > 0 && postResult[0].authorId !== req.userId) {
            await updateReputation(postResult[0].authorId, REPUTATION_POINTS.RECEIVE_COMMENT);
        }

        const [comments] = await executeWithFallback(
            `SELECT c.*, u.username, u.avatarUrl, u.displayName 
             FROM Comment c 
             JOIN User u ON c.userId = u.id 
             WHERE c.id = ?`,
            `SELECT c.*, u.username, u.avatarUrl 
             FROM Comment c 
             JOIN User u ON c.userId = u.id 
             WHERE c.id = ?`,
            [commentId]
        );

        const comment = comments[0];
        comment.user = {
            username: comment.username,
            displayName: comment.displayName,
            avatarUrl: comment.avatarUrl
        };
        delete comment.username;
        delete comment.displayName;
        delete comment.avatarUrl;

        // Emit real-time event
        const io = req.app.get('io');
        io.to(`post:${postId}`).emit('new_comment', comment);

        // Get post author for notification
        const [postInfo] = await pool.execute(
            'SELECT authorId FROM Post WHERE id = ?',
            [postId]
        );

        // Send notification to post author (don't notify yourself)
        // Also notify parent comment author if this is a reply
        if (postInfo[0] && postInfo[0].authorId !== req.userId) {
            await sendNotification(io, postInfo[0].authorId, {
                type: 'comment',
                message: 'commented on your post',
                fromUserId: req.userId,
                postId: postId
            });
        }

        if (parentId) {
            const [parentComment] = await pool.execute('SELECT userId FROM Comment WHERE id = ?', [parentId]);
            if (parentComment.length > 0 && parentComment[0].userId !== req.userId && parentComment[0].userId !== postInfo[0]?.authorId) {
                await sendNotification(io, parentComment[0].userId, {
                    type: 'comment',
                    message: 'replied to your comment',
                    fromUserId: req.userId,
                    postId: postId
                });
            }
        }

        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding comment' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        // Check if post exists and user is the author
        const [posts] = await pool.execute(
            'SELECT * FROM Post WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (posts[0].authorId !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        // Delete associated likes and comments first (foreign key constraints)
        await pool.execute('DELETE FROM `Like` WHERE postId = ?', [postId]);
        await pool.execute('DELETE FROM Comment WHERE postId = ?', [postId]);

        // Delete the post
        await pool.execute('DELETE FROM Post WHERE id = ?', [postId]);

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting post' });
    }
};

exports.updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;

        // Check if post exists and user is the author
        const [posts] = await pool.execute(
            'SELECT * FROM Post WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (posts[0].authorId !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this post' });
        }

        // Update the post
        await pool.execute(
            'UPDATE Post SET content = ? WHERE id = ?',
            [content, postId]
        );

        // Fetch updated post
        const [updatedPosts] = await executeWithFallback(
            `SELECT p.*, u.username, u.avatarUrl, u.displayName 
             FROM Post p 
             JOIN User u ON p.authorId = u.id 
             WHERE p.id = ?`,
            `SELECT p.*, u.username, u.avatarUrl 
             FROM Post p 
             JOIN User u ON p.authorId = u.id 
             WHERE p.id = ?`,
            [postId]
        );

        const post = updatedPosts[0];
        post.author = {
            id: post.authorId,
            username: post.username,
            displayName: post.displayName,
            avatarUrl: post.avatarUrl
        };
        delete post.username;
        delete post.displayName;
        delete post.avatarUrl;

        res.json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating post' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const { postId } = req.params;

        const [comments] = await executeWithFallback(
            `SELECT c.*, u.username, u.avatarUrl, u.displayName 
             FROM Comment c 
             JOIN User u ON c.userId = u.id 
             WHERE c.postId = ?
             ORDER BY c.createdAt ASC`,
            `SELECT c.*, u.username, u.avatarUrl 
             FROM Comment c 
             JOIN User u ON c.userId = u.id 
             WHERE c.postId = ?
             ORDER BY c.createdAt ASC`,
            [postId]
        );

        const formattedComments = comments.map(comment => ({
            ...comment,
            user: {
                id: comment.userId,
                username: comment.username,
                displayName: comment.displayName,
                avatarUrl: comment.avatarUrl
            }
        }));

        // Clean up flat fields
        formattedComments.forEach(comment => {
            delete comment.username;
            delete comment.displayName;
            delete comment.avatarUrl;
        });

        res.json(formattedComments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
};
