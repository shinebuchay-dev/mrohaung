require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    try {
        const parsed = new URL(process.env.DATABASE_URL);
        const dbConfig = {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 3306,
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace(/^\//, ''),
        };

        const conn = await mysql.createConnection(dbConfig);
        console.log('Connected to DB.');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS ShortVideoComment (
                id VARCHAR(36) PRIMARY KEY,
                videoId VARCHAR(36) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                content TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (videoId) REFERENCES ShortVideo(id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
            )
        `);
        console.log('ShortVideoComment table created (or already exists).');

        await conn.end();
        console.log('Done.');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
