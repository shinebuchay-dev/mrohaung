const pool = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');
const { sendNotification } = require('../utils/notificationHelper');

exports.sendFriendRequest = async (req, res) => {
    try {
        const friendId = req.body.friendId || req.params.userId || req.params.friendId;

        if (req.userId === friendId) {
            return res.status(400).json({ message: 'Cannot add yourself' });
        }

        const [existing] = await pool.execute(
            'SELECT * FROM Friendship WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)',
            [req.userId, friendId, friendId, req.userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Friendship already exists or pending' });
        }

        const friendshipId = uuidv4();
        await pool.execute(
            'INSERT INTO Friendship (id, userId, friendId, status) VALUES (?, ?, ?, ?)',
            [friendshipId, req.userId, friendId, 'PENDING']
        );

        // Send notification to the friend
        const io = req.app.get('io');
        await sendNotification(io, friendId, {
            type: 'friend_request',
            message: 'sent you a friend request',
            fromUserId: req.userId,
            postId: null
        });

        res.status(201).json({ id: friendshipId, status: 'PENDING' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending friend request' });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const [friendships] = await pool.execute('SELECT * FROM Friendship WHERE id = ?', [requestId]);
        const friendship = friendships[0];

        if (!friendship || friendship.friendId !== req.userId) {
            return res.status(404).json({ message: 'Request not found' });
        }

        await pool.execute('UPDATE Friendship SET status = ? WHERE id = ?', ['ACCEPTED', requestId]);

        // Auto-create conversation via Prisma
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        try {
            // Check if conversation already exists
            const existingConv = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        { participants: { some: { userId: friendship.userId } } },
                        { participants: { some: { userId: friendship.friendId } } }
                    ]
                }
            });

            if (!existingConv) {
                await prisma.conversation.create({
                    data: {
                        participants: {
                            create: [
                                { userId: friendship.userId },
                                { userId: friendship.friendId }
                            ]
                        }
                    }
                });
            }
        } catch (convError) {
            console.error('Error creating conversation on friend accept:', convError);
            // Don't fail the whole request if conversation creation fails
        } finally {
            await prisma.$disconnect();
        }

        // Send notification to the requester that their request was accepted
        const io = req.app.get('io');
        await sendNotification(io, friendship.userId, {
            type: 'friend_accept',
            message: 'accepted your friend request',
            fromUserId: req.userId,
            postId: null
        });

        res.json({ ...friendship, status: 'ACCEPTED' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error accepting friend request' });
    }
};

exports.getFriends = async (req, res) => {
    try {
        let friends;
        try {
            [friends] = await pool.execute(
                `SELECT u.id, u.username, u.displayName, u.avatarUrl 
                 FROM Friendship f
                 JOIN User u ON (f.userId = u.id OR f.friendId = u.id)
                 WHERE (f.userId = ? OR f.friendId = ?) 
                 AND f.status = 'ACCEPTED' 
                 AND u.id != ?`,
                [req.userId, req.userId, req.userId]
            );
        } catch (e) {
            [friends] = await pool.execute(
                `SELECT u.id, u.username, u.avatarUrl 
                 FROM Friendship f
                 JOIN User u ON (f.userId = u.id OR f.friendId = u.id)
                 WHERE (f.userId = ? OR f.friendId = ?) 
                 AND f.status = 'ACCEPTED' 
                 AND u.id != ?`,
                [req.userId, req.userId, req.userId]
            );
        }

        res.json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching friends' });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        let requests;
        try {
            [requests] = await pool.execute(
                `SELECT f.id, f.friendId, u.id as userId, u.username, u.displayName, u.avatarUrl 
                 FROM Friendship f
                 JOIN User u ON f.userId = u.id
                 WHERE f.friendId = ? AND f.status = 'PENDING'`,
                [req.userId]
            );
        } catch (e) {
            [requests] = await pool.execute(
                `SELECT f.id, f.friendId, u.id as userId, u.username, u.avatarUrl 
                 FROM Friendship f
                 JOIN User u ON f.userId = u.id
                 WHERE f.friendId = ? AND f.status = 'PENDING'`,
                [req.userId]
            );
        }

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching pending requests' });
    }
};

exports.rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const [friendships] = await pool.execute('SELECT * FROM Friendship WHERE id = ?', [requestId]);
        const friendship = friendships[0];

        if (!friendship || friendship.friendId !== req.userId) {
            return res.status(404).json({ message: 'Request not found' });
        }

        await pool.execute('DELETE FROM Friendship WHERE id = ?', [requestId]);

        res.json({ message: 'Request rejected' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error rejecting friend request' });
    }
};

exports.getUserFriends = async (req, res) => {
    try {
        const { userId } = req.params;

        const [friends] = await pool.execute(
            `SELECT u.id, u.username, u.displayName, u.avatarUrl, u.bio
             FROM Friendship f
             JOIN User u ON (f.userId = u.id OR f.friendId = u.id)
             WHERE (f.userId = ? OR f.friendId = ?) 
             AND f.status = 'ACCEPTED' 
             AND u.id != ?`,
            [userId, userId, userId]
        );

        res.json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching user friends' });
    }
};
