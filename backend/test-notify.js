const pool = require('./utils/prisma');

async function testNotifications() {
    try {
        console.log('Testing notification query...');
        // We need a valid userId. Let's pick one from the DB or use a dummy one if we just want to see if SQL syntax is valid.
        // First get a user
        const [users] = await pool.execute('SELECT id FROM User LIMIT 1');
        if (users.length === 0) {
            console.log('No users found, cannot test with valid user.');
            return;
        }
        const userId = users[0].id;
        console.log('Using userId:', userId);

        const limit = 20;
        const offset = 0;

        const [notifications] = await pool.execute(
            `SELECT n.id, n.type, n.message, n.read, n.createdAt, n.postId,
                    u.id as fromUserId, u.username as fromUsername, u.displayName as fromDisplayName, u.avatarUrl as fromAvatarUrl,
                    p.id as postIdRef, p.content as postContent
             FROM Notification n
             JOIN User u ON n.fromUserId = u.id
             LEFT JOIN Post p ON n.postId = p.id
             WHERE n.userId = ?
             ORDER BY n.createdAt DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        console.log('Success! Found notifications:', notifications.length);
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testNotifications();
