const mysql = require('mysql2/promise');

async function test() {
    try {
        const dbConfig = {
            host: '194.59.164.85',
            user: 'u860480593_social_media',
            password: 'SBCsmdb1234',
            database: 'u860480593_social_media',
            port: 3306,
        };

        const conn = await mysql.createConnection(dbConfig);
        console.log("Connected to Remote DB.");

        const [shorts] = await conn.query('SELECT COUNT(*) as count FROM ShortVideo');
        console.log('Total Shorts in DB:', shorts[0].count);

        if (shorts[0].count > 0) {
            const [sample] = await conn.query(`
                SELECT sv.id, sv.title, u.username 
                FROM ShortVideo sv 
                JOIN User u ON sv.authorId = u.id 
                LIMIT 5
            `);
            console.log('Sample Shorts with Authors:', sample);
        }

        await conn.end();
        process.exit(0);
    } catch (err) {
        console.error('Remote Diagnostic error:', err);
        process.exit(1);
    }
}

test();
