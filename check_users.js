const pool = require('./backend/utils/prisma');

async function checkUsers() {
    try {
        const [users] = await pool.query('SELECT username, displayName, isVerified FROM User WHERE username IN ("shinebuchay", "murnheinchun", "testervirus")');
        console.table(users);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkUsers();
