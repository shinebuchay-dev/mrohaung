const pool = require('./backend/utils/prisma');

async function check() {
    try {
        console.log('--- ShortVideoComment Table Info ---');
        const [cols] = await pool.query('DESCRIBE ShortVideoComment');
        console.table(cols);

        console.log('\n--- Sample Comment with Join ---');
        const [rows] = await pool.query(`
            SELECT svc.*, u.username, u.displayName, u.avatarUrl, u.isVerified
            FROM ShortVideoComment svc
            JOIN User u ON svc.userId = u.id
            LIMIT 1
        `);
        console.log(JSON.stringify(rows[0], null, 2));

        console.log('\n--- Sample User for comparison ---');
        const [users] = await pool.query('SELECT id, username, displayName FROM User LIMIT 1');
        console.log(users[0]);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
