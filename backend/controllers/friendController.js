const pool = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');
const { sendNotification } = require('../utils/notificationHelper');

// Friend Request ပို့ခြင်း
exports.sendFriendRequest = async (req, res) => {
    try {
        // ID ဖတ်ရမည့် နေရာကို ပိုမိုစိတ်ချရအောင် ပြင်ဆင်ခြင်း
        // URL param ကနေ ယူမယ် (မရှိမှ body ကနေ ယူမယ်)
        const receiverId = req.params.userId || req.params.friendId || (req.body && req.body.friendId);
        const senderId = req.userId; // Auth Middleware က လာတဲ့ ID

        console.log(`[FRIEND_REQUEST] From: ${senderId}, To: ${receiverId}`);

        if (!receiverId) {
            return res.status(400).json({ message: "Receiver ID is required" });
        }

        if (senderId === receiverId) {
            return res.status(400).json({ message: "You cannot add yourself" });
        }

        // ရှိပြီးသား Request စစ်ဆေးခြင်း
        const [existing] = await pool.execute(
            'SELECT * FROM Friendship WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)',
            [senderId, receiverId, receiverId, senderId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Friend request already sent or users are already friends" });
        }

        // Request အသစ် ဖန်တီးခြင်း
        const friendshipId = uuidv4();
        await pool.execute(
            'INSERT INTO Friendship (id, userId, friendId, status) VALUES (?, ?, ?, ?)',
            [friendshipId, senderId, receiverId, 'PENDING']
        );

        // Send notification to the friend
        const io = req.app.get('io');
        try {
            await sendNotification(io, receiverId, {
                type: 'friend_request',
                message: 'sent you a friend request',
                fromUserId: senderId,
                postId: null
            });
        } catch (notifErr) {
            console.error('Failed to send notification:', notifErr);
            // Don't fail the whole request
        }

        res.status(200).json({ message: "Friend request sent successfully", id: friendshipId, status: 'PENDING' });

    } catch (error) {
        console.error("[FRIEND_REQUEST_ERROR]", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// သူငယ်ချင်းစာရင်း ရယူခြင်း (အခြား user များအတွက်)
exports.getUserFriends = async (req, res) => {
    try {
        const userId = req.params.userId;

        const [friends] = await pool.execute(
            `SELECT u.id, u.username, u.displayName, u.avatarUrl, u.bio
       FROM Friendship f
       JOIN User u ON (f.userId = u.id OR f.friendId = u.id)
       WHERE (f.userId = ? OR f.friendId = ?) 
       AND f.status = 'ACCEPTED' 
       AND u.id != ?`,
            [userId, userId, userId]
        );

        res.status(200).json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching friends" });
    }
};

// စောင့်ဆိုင်းနေသော Request များ
exports.getPendingRequests = async (req, res) => {
    try {
        const [requests] = await pool.execute(
            `SELECT f.id, f.friendId, u.id as userId, u.username, u.displayName, u.avatarUrl 
       FROM Friendship f
       JOIN User u ON f.userId = u.id
       WHERE f.friendId = ? AND f.status = 'PENDING'`,
            [req.userId]
        );

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching pending requests' });
    }
};

// သူငယ်ချင်း ဖြစ်နေသူများ စာရင်း (Logged in user အတွက်)
exports.getFriends = async (req, res) => {
    try {
        const [friends] = await pool.execute(
            `SELECT u.id, u.username, u.displayName, u.avatarUrl 
       FROM Friendship f
       JOIN User u ON (f.userId = u.id OR f.friendId = u.id)
       WHERE (f.userId = ? OR f.friendId = ?) 
       AND f.status = 'ACCEPTED' 
       AND u.id != ?`,
            [req.userId, req.userId, req.userId]
        );

        res.json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching friends' });
    }
};

// Request လက်ခံခြင်း
exports.acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const [friendships] = await pool.execute('SELECT * FROM Friendship WHERE id = ?', [requestId]);
        const friendship = friendships[0];

        if (!friendship || friendship.friendId !== req.userId) {
            return res.status(404).json({ message: 'Request not found' });
        }

        await pool.execute('UPDATE Friendship SET status = ? WHERE id = ?', ['ACCEPTED', requestId]);

        // Auto-create conversation via Prisma (Existing logic)
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        try {
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
            console.error('Error creating conversation:', convError);
        } finally {
            await prisma.$disconnect();
        }

        // Send notification back to requester
        const io = req.app.get('io');
        try {
            await sendNotification(io, friendship.userId, {
                type: 'friend_accept',
                message: 'accepted your friend request',
                fromUserId: req.userId,
                postId: null
            });
        } catch (notifErr) {
            console.error('Failed to send accept notification:', notifErr);
        }

        res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error accepting request" });
    }
};

// Request ငြင်းပယ်ခြင်း
exports.rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const [friendships] = await pool.execute('SELECT * FROM Friendship WHERE id = ?', [requestId]);
        const friendship = friendships[0];

        if (!friendship || (friendship.friendId !== req.userId && friendship.userId !== req.userId)) {
            return res.status(404).json({ message: 'Request not found' });
        }

        await pool.execute('DELETE FROM Friendship WHERE id = ?', [requestId]);

        res.status(200).json({ message: "Friend request removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error removing request" });
    }
};

// ပို့ထားသော Request များ ရယူခြင်း (Sent Requests)
exports.getSentRequests = async (req, res) => {
    try {
        const [requests] = await pool.execute(
            `SELECT f.id, f.friendId, u.id as userId, u.username, u.displayName, u.avatarUrl 
       FROM Friendship f
       JOIN User u ON f.friendId = u.id
       WHERE f.userId = ? AND f.status = 'PENDING'`,
            [req.userId]
        );

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching sent requests' });
    }
};

// ပို့ထားသော Request ပယ်ဖျက်ခြင်း (Cancel Sent Request)
exports.cancelFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const [friendships] = await pool.execute('SELECT * FROM Friendship WHERE id = ?', [requestId]);
        const friendship = friendships[0];

        // Only the sender can cancel their own request
        if (!friendship || friendship.userId !== req.userId) {
            return res.status(404).json({ message: 'Request not found or unauthorized' });
        }

        if (friendship.status !== 'PENDING') {
            return res.status(400).json({ message: 'Cannot cancel accepted request' });
        }

        await pool.execute('DELETE FROM Friendship WHERE id = ?', [requestId]);

        res.status(200).json({ message: "Friend request cancelled" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error cancelling request" });
    }
};

