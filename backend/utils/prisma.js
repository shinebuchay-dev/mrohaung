const mysql = require('mysql2/promise');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in environment variables');
}

// mysql2 cannot parse a raw URL string — we must parse it manually
function parseDbUrl(url) {
    try {
        // Expected format: mysql://user:password@host:port/database
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 3306,
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace(/^\//, ''),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
    } catch (e) {
        console.error('Failed to parse DATABASE_URL:', e.message);
        return {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'user',
            password: process.env.DB_PASSWORD || 'password123',
            database: process.env.DB_NAME || 'social_media',
            port: parseInt(process.env.DB_PORT) || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
    }
}

const dbConfig = parseDbUrl(process.env.DATABASE_URL);
console.log(`[DB] Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const pool = mysql.createPool(dbConfig);

module.exports = pool;
