const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkData() {
    const url = process.env.DATABASE_URL || 'mysql://u860480593_social_media:ShineThorsan123!@194.59.164.85:3306/u860480593_social_media';
    console.log('Connecting to:', url.split('@')[1]);

    try {
        const connection = await mysql.createConnection(url);
        console.log('✅ Connected');

        const [users] = await connection.execute('SELECT COUNT(*) as c FROM User');
        const [posts] = await connection.execute('SELECT COUNT(*) as c FROM Post');
        const [comments] = await connection.execute('SELECT COUNT(*) as c FROM Comment');
        const [stories] = await connection.execute('SELECT COUNT(*) as c FROM Story');
        const [messages] = await connection.execute('SELECT COUNT(*) as c FROM Message');
        const [notifications] = await connection.execute('SELECT COUNT(*) as c FROM Notification');

        console.log('COUNTS:');
        console.log('Users:', users[0].c);
        console.log('Posts:', posts[0].c);
        console.log('Comments:', comments[0].c);
        console.log('Stories:', stories[0].c);
        console.log('Messages:', messages[0].c);
        console.log('Notifications:', notifications[0].c);

        await connection.end();
    } catch (e) {
        console.error('❌ Connection Failed:', e.message);
    }
}

checkData();
