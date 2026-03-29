const pool = require('../utils/prisma');
const { uploadFile } = require('../utils/minio');
const { v4: uuidv4 } = require('uuid');
const { sendNotification } = require('../utils/notificationHelper');
const { updateReputation, REPUTATION_POINTS } = require('../utils/reputation');

exports.createPost = async (req, res) => {
    try {
        const { content, privacy = 'public', tags } = req.body;
        let imageUrl = null;

        if (req.file) {
            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, req.userId, 'posts');
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
        post.author = { username: post.username, displayName: post.displayName, avatarUrl: post.avatarUrl, id: post.authorId };
        post._count = { likes: 0, comments: 0 };
        delete post.username;
        delete post.displayName;
        delete post.avatarUrl;

        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.emit('new_post', post);
        }

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
        const currentUserId = req.userId; // Can be null (Guest)

        const offset = (page - 1) * totalLimit;

        if (!currentUserId) {
            // Guest Feed: Show only public posts
            const guestQuery = `
                SELECT p.*, u.username, u.avatarUrl, u.displayName, u.isPrivate, u.isVerified,
                (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
                (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
                FALSE as isLiked,
                'suggested' as feedType
                FROM Post p 
                JOIN User u ON p.authorId = u.id 
                WHERE p.privacy = 'public'
                ORDER BY p.createdAt DESC
                LIMIT ? OFFSET ?
            `;

            const [posts] = await pool.query(guestQuery, [totalLimit, offset]);

            // Fetch Short Videos for Guest Feed
            const [shortVideos] = await pool.query(
                `SELECT 
                    sv.id, sv.title as content, sv.videoUrl, sv.thumbnailUrl as imageUrl, 
                    sv.createdAt, sv.authorId,
                    u.username, u.avatarUrl, u.displayName, u.isVerified,
                    (SELECT COUNT(*) FROM ShortVideoLike WHERE videoId = sv.id) as likeCount,
                    (SELECT COUNT(*) FROM ShortVideoComment WHERE videoId = sv.id) as commentCount,
                    0 as isLiked,
                    'short' as feedType
                 FROM ShortVideo sv
                 JOIN User u ON sv.authorId = u.id
                 ORDER BY sv.createdAt DESC
                 LIMIT 5`
            );

            // Combine and sort
            let allItems = [...posts, ...shortVideos];
            allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const formattedPosts = allItems.map(item => {
                const isShort = item.feedType === 'short';
                const formatted = {
                    ...item,
                    isShort,
                    author: {
                        id: item.authorId,
                        username: item.username,
                        displayName: item.displayName,
                        avatarUrl: item.avatarUrl,
                        isVerified: !!item.isVerified
                    },
                    isLiked: false,
                    userReaction: null,
                    _count: {
                        likes: parseInt(item.likeCount || 0),
                        comments: parseInt(item.commentCount || 0)
                    },
                    feedType: item.feedType
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

        const friendsQuery = `
            SELECT p.*, u.username, u.avatarUrl, u.displayName, u.isPrivate, u.isVerified,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            l.id IS NOT NULL as isLiked,
            l.type as userReaction,
            'friend' as feedType
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            LEFT JOIN \`Like\` l ON l.postId = p.id AND l.userId = ?
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

        const suggestedQuery = `
            SELECT p.*, u.username, u.avatarUrl, u.displayName, u.isPrivate, u.isVerified,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            l.id IS NOT NULL as isLiked,
            l.type as userReaction,
            'suggested' as feedType
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            LEFT JOIN \`Like\` l ON l.postId = p.id AND l.userId = ?
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

        const [friendPosts] = await pool.query(friendsQuery, [
            currentUserId,
            currentUserId, currentUserId,
            currentUserId,
            currentUserId, currentUserId,
            friendLimit, friendOffset
        ]);

        const [suggestedPosts] = await pool.query(suggestedQuery, [
            currentUserId,
            currentUserId,
            currentUserId, currentUserId,
            currentUserId, currentUserId,
            suggestedLimit, suggestedOffset
        ]);

        // Fetch Short Videos for feed
        const [shortVideos] = await pool.query(
            `SELECT 
                sv.id, sv.title as content, sv.videoUrl, sv.thumbnailUrl as imageUrl, 
                sv.createdAt, sv.authorId,
                u.username, u.avatarUrl, u.displayName, u.isVerified,
                (SELECT COUNT(*) FROM ShortVideoLike WHERE videoId = sv.id) as likeCount,
                (SELECT COUNT(*) FROM ShortVideoComment WHERE videoId = sv.id) as commentCount,
                ${currentUserId ? 'IF((SELECT 1 FROM ShortVideoLike WHERE videoId = sv.id AND userId = ? LIMIT 1), 1, 0) as isLiked' : '0 as isLiked'},
                'short' as feedType
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             WHERE 
             NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = sv.authorId)
                OR (blockerId = sv.authorId AND blockedId = ?)
             )
             ORDER BY sv.createdAt DESC
             LIMIT 5`,
            currentUserId ? [currentUserId, currentUserId, currentUserId] : [currentUserId, currentUserId]
        );

        // Combine all
        let allItems = [...friendPosts, ...suggestedPosts, ...shortVideos];
        allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const formattedPosts = allItems.map(item => {
            const isShort = item.feedType === 'short';
            const formatted = {
                ...item,
                isShort,
                author: {
                    id: item.authorId,
                    username: item.username,
                    displayName: item.displayName,
                    avatarUrl: item.avatarUrl,
                    isVerified: !!item.isVerified
                },
                isLiked: !!item.isLiked,
                userReaction: item.userReaction || null,
                _count: {
                    likes: parseInt(item.likeCount || 0),
                    comments: parseInt(item.commentCount || 0)
                },
                feedType: item.feedType
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
        console.error('Error in getFeed:', error);
        res.status(500).json({ message: 'Error fetching feed', details: error.message });
    }
};

exports.getPostsByUser = async (req, res) => {
    try {
        const { id } = req.params; // Can be userId or username
        const currentUserId = req.userId;

        const [users] = await pool.execute(
            'SELECT id FROM User WHERE id = ? OR username = ?',
            [id, id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetUserId = users[0].id;

        const query = `
            SELECT p.*, u.username, u.avatarUrl, u.displayName, u.isVerified,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            l.id IS NOT NULL as isLiked,
            l.type as userReaction
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            LEFT JOIN \`Like\` l ON l.postId = p.id AND l.userId = ?
            WHERE p.authorId = ?
            AND (
                p.privacy = 'public'
                OR p.authorId = ?
                OR (p.privacy = 'friends' AND EXISTS (
                    SELECT 1 FROM Friendship 
                    WHERE ((userId = ? AND friendId = p.authorId) OR (userId = p.authorId AND friendId = ?))
                    AND status = 'accepted'
                ))
            )
            AND NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = p.authorId)
                OR (blockerId = p.authorId AND blockedId = ?)
            )
            ORDER BY p.createdAt DESC
        `;

        const [posts] = await pool.execute(query, [
            currentUserId || null,
            targetUserId,
            currentUserId || null,
            currentUserId || null, currentUserId || null,
            currentUserId || null, currentUserId || null
        ]);

        // Fetch Short Videos for this user
        const [shortVideos] = await pool.execute(
            `SELECT 
                sv.id, sv.title as content, sv.videoUrl, sv.thumbnailUrl as imageUrl, 
                sv.createdAt, sv.authorId,
                u.username, u.avatarUrl, u.displayName, u.isVerified,
                (SELECT COUNT(*) FROM ShortVideoLike WHERE videoId = sv.id) as likeCount,
                (SELECT COUNT(*) FROM ShortVideoComment WHERE videoId = sv.id) as commentCount,
                ${currentUserId ? 'IF((SELECT 1 FROM ShortVideoLike WHERE videoId = sv.id AND userId = ? LIMIT 1), 1, 0) as isLiked' : '0 as isLiked'},
                'short' as feedType
             FROM ShortVideo sv
             JOIN User u ON sv.authorId = u.id
             WHERE sv.authorId = ?
             AND NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = sv.authorId)
                OR (blockerId = sv.authorId AND blockedId = ?)
             )
             ORDER BY sv.createdAt DESC`,
            currentUserId ? [currentUserId, targetUserId, currentUserId, currentUserId] : [targetUserId, currentUserId, currentUserId]
        );

        // Combine all items
        let allItems = [...posts, ...shortVideos];
        allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const formattedPosts = allItems.map(item => {
            const isShort = item.feedType === 'short';
            const formatted = {
                ...item,
                isShort,
                author: {
                    id: item.authorId,
                    username: item.username,
                    displayName: item.displayName,
                    avatarUrl: item.avatarUrl,
                    isVerified: !!item.isVerified
                },
                isLiked: !!item.isLiked,
                userReaction: item.userReaction || null,
                _count: {
                    likes: parseInt(item.likeCount || 0),
                    comments: parseInt(item.commentCount || 0)
                }
            };
            delete formatted.username;
            delete formatted.displayName;
            delete formatted.avatarUrl;
            delete formatted.likeCount;
            delete formatted.commentCount;
            return formatted;
        });

        res.json(formattedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching user posts' });
    }
};

exports.likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { type = 'like' } = req.body;

        const [existing] = await pool.execute(
            'SELECT * FROM `Like` WHERE postId = ? AND userId = ?',
            [postId, req.userId]
        );

        let finalLiked = true;
        let finalType = type;

        if (existing.length > 0) {
            if (existing[0].type === type) {
                // Same reaction clicked -> Toggle off (Delete)
                await pool.execute('DELETE FROM `Like` WHERE id = ?', [existing[0].id]);
                finalLiked = false;
                finalType = null;
            } else {
                // Different reaction clicked -> Update type
                await pool.execute('UPDATE `Like` SET type = ? WHERE id = ?', [type, existing[0].id]);
                finalLiked = true;
                finalType = type;
            }
        } else {
            // New reaction
            const likeId = uuidv4();
            await pool.execute(
                'INSERT INTO `Like` (id, postId, userId, type) VALUES (?, ?, ?, ?)',
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
                    type: 'like',
                    message: `reacted with ${type} to your post`,
                    fromUserId: req.userId,
                    postId: postId
                });

                // Award reputation to post author
                await updateReputation(postInfo[0].authorId, REPUTATION_POINTS.RECEIVE_LIKE);
            }
        }

        // Get updated like count for real-time update
        const [[{ count: newLikeCount }]] = await pool.execute(
            'SELECT COUNT(*) as count FROM `Like` WHERE postId = ?',
            [postId]
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('like_update', { postId, likeCount: parseInt(newLikeCount) });
        }

        res.json({ liked: finalLiked, type: finalType });
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
            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, req.userId, 'comments');
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

        const [comments] = await pool.execute(
            `SELECT c.*, u.username, u.avatarUrl, u.displayName, u.isVerified 
             FROM Comment c 
             JOIN User u ON c.userId = u.id 
             WHERE c.id = ?`,
            [commentId]
        );

        const comment = comments[0];
        comment.user = {
            id: comment.userId,
            username: comment.username,
            displayName: comment.displayName,
            avatarUrl: comment.avatarUrl,
            isVerified: !!comment.isVerified
        };
        delete comment.username;
        delete comment.displayName;
        delete comment.avatarUrl;
        delete comment.isVerified;

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
        const [updatedPosts] = await pool.execute(
            `SELECT p.*, u.username, u.avatarUrl, u.displayName 
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

        const [comments] = await pool.execute(
            `SELECT c.*, u.username, u.avatarUrl, u.displayName, u.isVerified,
             (SELECT COUNT(*) FROM CommentLike WHERE commentId = c.id) as likeCount,
             EXISTS(SELECT 1 FROM CommentLike WHERE commentId = c.id AND userId = ?) as isLiked 
             FROM Comment c 
             JOIN User u ON c.userId = u.id 
             WHERE c.postId = ?
             ORDER BY c.createdAt ASC`,
            [req.userId, postId]
        );

        const formattedComments = comments.map(comment => ({
            ...comment,
            user: {
                id: comment.userId,
                username: comment.username,
                displayName: comment.displayName,
                avatarUrl: comment.avatarUrl,
                isVerified: !!comment.isVerified
            },
            isLiked: !!comment.isLiked
        }));

        // Clean up flat fields
        formattedComments.forEach(comment => {
            delete comment.username;
            delete comment.displayName;
            delete comment.avatarUrl;
            delete comment.isVerified;
        });

        res.json(formattedComments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const { postId } = req.params;
        const currentUserId = req.userId;

        const query = `
            SELECT p.*, u.username, u.avatarUrl, u.displayName, u.isPrivate, u.isVerified,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            l.id IS NOT NULL as isLiked,
            l.type as userReaction
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            LEFT JOIN \`Like\` l ON l.postId = p.id AND l.userId = ?
            WHERE p.id = ?
            AND (
                p.privacy = 'public'
                OR p.authorId = ?
                OR (p.privacy = 'friends' AND EXISTS (
                    SELECT 1 FROM Friendship 
                    WHERE ((userId = ? AND friendId = p.authorId) OR (userId = p.authorId AND friendId = ?))
                    AND status = 'accepted'
                ))
            )
            AND NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = p.authorId)
                OR (blockerId = p.authorId AND blockedId = ?)
            )
        `;

        const [posts] = await pool.execute(query, [
            currentUserId || null,
            postId,
            currentUserId || null,
            currentUserId || null, currentUserId || null,
            currentUserId || null, currentUserId || null
        ]);

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found or authorized' });
        }

        const post = posts[0];
        const formatted = {
            ...post,
            author: {
                id: post.authorId,
                username: post.username,
                displayName: post.displayName,
                avatarUrl: post.avatarUrl,
                isVerified: !!post.isVerified
            },
            isLiked: !!post.isLiked,
            userReaction: post.userReaction || null,
            _count: {
                likes: parseInt(post.likeCount || 0),
                comments: parseInt(post.commentCount || 0)
            }
        };
        delete formatted.username;
        delete formatted.displayName;
        delete formatted.avatarUrl;
        delete formatted.likeCount;
        delete formatted.commentCount;
        delete formatted.isPrivate;

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching post' });
    }
};

exports.searchPosts = async (req, res) => {
    try {
        const { q } = req.query;
        const currentUserId = req.userId;

        if (!q || q.trim().length < 2) {
            return res.json([]);
        }

        const query = `
            SELECT p.*, u.username, u.avatarUrl, u.displayName, u.isVerified,
            (SELECT COUNT(*) FROM \`Like\` WHERE postId = p.id) as likeCount,
            (SELECT COUNT(*) FROM Comment WHERE postId = p.id) as commentCount,
            l.id IS NOT NULL as isLiked,
            l.type as userReaction
            FROM Post p 
            JOIN User u ON p.authorId = u.id 
            LEFT JOIN \`Like\` l ON l.postId = p.id AND l.userId = ?
            WHERE 
            p.content LIKE ?
            AND p.privacy = 'public'
            AND NOT EXISTS (
                SELECT 1 FROM BlockedUser 
                WHERE (blockerId = ? AND blockedId = p.authorId)
                OR (blockerId = p.authorId AND blockedId = ?)
            )
            ORDER BY p.createdAt DESC
            LIMIT 20
        `;

        const [posts] = await pool.query(query, [
            currentUserId || null,
            `%${q}%`,
            currentUserId || null,
            currentUserId || null
        ]);

        const formattedPosts = posts.map(post => {
            const formatted = {
                ...post,
                author: {
                    id: post.authorId,
                    username: post.username,
                    displayName: post.displayName,
                    avatarUrl: post.avatarUrl,
                    isVerified: !!post.isVerified
                },
                isLiked: !!post.isLiked,
                userReaction: post.userReaction || null,
                _count: {
                    likes: parseInt(post.likeCount || 0),
                    comments: parseInt(post.commentCount || 0)
                }
            };
            delete formatted.username;
            delete formatted.displayName;
            delete formatted.avatarUrl;
            delete formatted.likeCount;
            delete formatted.commentCount;
            return formatted;
        });

        res.json(formattedPosts);
    } catch (error) {
        console.error('Error in searchPosts:', error);
        res.status(500).json({ message: 'Error searching posts' });
    }
};
