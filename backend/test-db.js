const mysql = require('mysql2/promise');

const combinations = [
    { host: '153.92.15.35', user: 'u860480593_social_media', pass: 'SBCsm225569', db: 'u860480593_social_media' },
    { host: '153.92.15.35', user: 'u860480593_social_media', pass: 'SBCsm225580', db: 'u860480593_social_media' },
    { host: '153.92.15.35', user: 'u860480593_rakhinelottery', pass: 'SBCsm225569', db: 'u860480593_rakhinelottery' },
    { host: '153.92.15.35', user: 'u860480593_rakhinelottery', pass: 'SBCsm225580', db: 'u860480593_rakhinelottery' },
    { host: 'srv1635.hstgr.io', user: 'u860480593_social_media', pass: 'SBCsm225569', db: 'u860480593_social_media' },
    { host: 'srv1635.hstgr.io', user: 'u860480593_social_media', pass: 'SBCsm225580', db: 'u860480593_social_media' },
    { host: 'srv1635.hstgr.io', user: 'u860480593_rakhinelottery', pass: 'SBCsm225569', db: 'u860480593_rakhinelottery' },
    { host: 'srv1635.hstgr.io', user: 'u860480593_rakhinelottery', pass: 'SBCsm225580', db: 'u860480593_rakhinelottery' },
];

async function test() {
    for (const combo of combinations) {
        console.log(`Testing: ${combo.host} | ${combo.user} | ${combo.pass}`);
        try {
            const connection = await mysql.createConnection({
                host: combo.host,
                user: combo.user,
                password: combo.pass,
                database: combo.db
            });
            console.log('--- SUCCESS! ---');
            const [rows] = await connection.execute('SHOW TABLES');
            console.log('Tables:', rows);
            await connection.end();
            return;
        } catch (err) {
            console.error(`Failed: ${err.message}`);
        }
    }
}

test();
