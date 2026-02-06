const pool = require('../utils/prisma');

const { uploadFile } = require('../utils/minio');

const { v4: uuidv4 } = require('uuid');



// Create a new story

exports.createStory = async (req, res) => {
    try {
        const { type = 'image', content, fontStyle, background } = req.body;
        const userId = req.userId;
        let mediaUrl = null;

        if (type === 'image' || type === 'video') {
            if (!req.file) {
                return res.status(400).json({ error: 'Media file is required for image/video stories' });
            }
            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            mediaUrl = uploadResult.url;
        }

        // Calculate expiration time (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const storyId = uuidv4();
        try {
            await pool.execute(
                'INSERT INTO Story (id, userId, type, mediaUrl, caption, fontStyle, background, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [storyId, userId, type, mediaUrl, content || null, fontStyle || null, background || null, expiresAt]
            );
        } catch (e) {
            // Fallback for older schema where column is still 'content'
            await pool.execute(
                'INSERT INTO Story (id, userId, type, mediaUrl, content, fontStyle, background, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [storyId, userId, type, mediaUrl, content || null, fontStyle || null, background || null, expiresAt]
            );
        }



        const [stories] = await pool.execute(

            `SELECT s.*, u.username, u.avatarUrl 

             FROM Story s 

             JOIN User u ON s.userId = u.id 

             WHERE s.id = ?`,

            [storyId]

        );



        const story = stories[0];

        story.author = { username: story.username, avatarUrl: story.avatarUrl };

        delete story.username;

        delete story.avatarUrl;



        res.status(201).json(story);

    } catch (error) {

        console.error('Error creating story:', error);

        res.status(500).json({ error: 'Failed to create story' });

    }

};



// Get all active stories (not expired)

exports.getStories = async (req, res) => {

    try {

        const userId = req.userId;

        const now = new Date();



        // Get stories from user and their friends

        const [stories] = await pool.execute(

            `SELECT s.*, u.username, u.avatarUrl,

             (SELECT COUNT(*) FROM StoryView WHERE storyId = s.id) as viewCount,

             (SELECT COUNT(*) FROM StoryView WHERE storyId = s.id AND userId = ?) as hasViewed

             FROM Story s

             JOIN User u ON s.userId = u.id

             WHERE s.expiresAt > ? AND (

                s.userId = ? OR

                EXISTS (

                    SELECT 1 FROM Friendship 

                    WHERE ((userId = ? AND friendId = s.userId) OR (userId = s.userId AND friendId = ?))

                    AND status = 'accepted'

                )

             )

             ORDER BY s.createdAt DESC`,

            [userId, now, userId, userId, userId]

        );



        // Group stories by user

        const groupedStories = {};

        stories.forEach(story => {

            if (!groupedStories[story.userId]) {

                groupedStories[story.userId] = {

                    userId: story.userId,

                    username: story.username,

                    avatarUrl: story.avatarUrl,

                    stories: []

                };

            }



            groupedStories[story.userId].stories.push({
                id: story.id,
                type: story.type,
                mediaUrl: story.mediaUrl,
                content: story.caption || story.content,
                fontStyle: story.fontStyle,
                background: story.background,
                viewCount: parseInt(story.viewCount || 0),
                hasViewed: parseInt(story.hasViewed || 0) > 0,
                expiresAt: story.expiresAt,
                createdAt: story.createdAt
            });

        });



        res.json(Object.values(groupedStories));

    } catch (error) {

        console.error('Error fetching stories:', error);

        res.status(500).json({ error: 'Failed to fetch stories' });

    }

};



// Get a specific story with views

exports.getStory = async (req, res) => {

    try {

        const { id } = req.params;

        const now = new Date();



        const [stories] = await pool.execute(

            `SELECT s.*, u.username, u.avatarUrl 

             FROM Story s 

             JOIN User u ON s.userId = u.id 

             WHERE s.id = ? AND s.expiresAt > ?`,

            [id, now]

        );



        if (stories.length === 0) {

            return res.status(404).json({ error: 'Story not found or expired' });

        }



        const story = stories[0];



        // Get views

        const [views] = await pool.execute(

            `SELECT sv.*, u.username, u.avatarUrl 

             FROM StoryView sv 

             JOIN User u ON sv.userId = u.id 

             WHERE sv.storyId = ? 

             ORDER BY sv.viewedAt DESC`,

            [id]

        );



        story.author = { username: story.username, avatarUrl: story.avatarUrl };

        delete story.username;

        delete story.avatarUrl;

        story.views = views.map(v => ({

            userId: v.userId,

            username: v.username,

            avatarUrl: v.avatarUrl,

            viewedAt: v.viewedAt

        }));



        res.json(story);

    } catch (error) {

        console.error('Error fetching story:', error);

        res.status(500).json({ error: 'Failed to fetch story' });

    }

};



// Mark story as viewed

exports.viewStory = async (req, res) => {

    try {

        const { id } = req.params;

        const userId = req.userId;



        // Check if story exists and is not expired

        const [stories] = await pool.execute(

            'SELECT * FROM Story WHERE id = ? AND expiresAt > ?',

            [id, new Date()]

        );



        if (stories.length === 0) {

            return res.status(404).json({ error: 'Story not found or expired' });

        }



        // Check if already viewed

        const [existingViews] = await pool.execute(

            'SELECT * FROM StoryView WHERE storyId = ? AND userId = ?',

            [id, userId]

        );



        if (existingViews.length === 0) {

            const viewId = uuidv4();

            await pool.execute(

                'INSERT INTO StoryView (id, storyId, userId) VALUES (?, ?, ?)',

                [viewId, id, userId]

            );

        }



        res.json({ success: true });

    } catch (error) {

        console.error('Error viewing story:', error);

        res.status(500).json({ error: 'Failed to mark story as viewed' });

    }

};



// Delete a story

exports.deleteStory = async (req, res) => {

    try {

        const { id } = req.params;

        const userId = req.userId;



        // Check if user owns the story

        const [stories] = await pool.execute(

            'SELECT * FROM Story WHERE id = ? AND userId = ?',

            [id, userId]

        );



        if (stories.length === 0) {

            return res.status(404).json({ error: 'Story not found or unauthorized' });

        }



        await pool.execute('DELETE FROM Story WHERE id = ?', [id]);



        res.json({ success: true });

    } catch (error) {

        console.error('Error deleting story:', error);

        res.status(500).json({ error: 'Failed to delete story' });

    }

};



// Delete expired stories (cron job endpoint)

exports.deleteExpiredStories = async (req, res) => {

    try {

        const now = new Date();

        const [result] = await pool.execute(

            'DELETE FROM Story WHERE expiresAt <= ?',

            [now]

        );



        res.json({

            success: true,

            deletedCount: result.affectedRows

        });

    } catch (error) {

        console.error('Error deleting expired stories:', error);

        res.status(500).json({ error: 'Failed to delete expired stories' });

    }

};

