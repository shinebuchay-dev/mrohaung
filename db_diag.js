const pool = require('./backend/utils/prisma');

async function test() {
    try {
        const [users] = await pool.query('SELECT id, username FROM User LIMIT 5');
        console.log('Sample Users:', users);

        const [shorts] = await pool.query('SELECT * FROM ShortVideo LIMIT 5');
        console.log('Sample Shorts:', shorts);

        if (users.length > 0) {
            const username = users[0].username;
            console.log(`Checking shorts for user: ${username}`);
            
            // Replicate the failed query check
            const userId = users[0].id;
            const limit = 20;
            const offset = 0;
            
            const [videos] = await pool.query(
                `SELECT
                    sv.id, u.username
                 FROM ShortVideo sv
                 JOIN User u ON sv.authorId = u.id
                 WHERE u.username = ?
                 LIMIT ? OFFSET ?`,
                [username, limit, offset]
            );
            console.log(`Shorts found for ${username}:`, videos.length);
        }

        process.exit(0);
    } catch (err) {
        console.error('Diagnostic error:', err);
        process.exit(1);
    }
}

test();
