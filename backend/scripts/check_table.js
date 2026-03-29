require('dotenv').config();
const pool = require('../utils/prisma');

async function checkTable() {
    try {
        const [rows] = await pool.query('SELECT 1 FROM EmailApplication LIMIT 1');
        console.log('Table exists!');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.log('Table does not exist.');
        } else {
            console.error('Other error:', err);
        }
        process.exit(1);
    }
}
checkTable();
