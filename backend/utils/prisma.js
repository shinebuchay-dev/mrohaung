const mysql = require('mysql2/promise');

// Note: In Docker, environment variables are already in process.env
// No need for dotenv.config() here if they are passed by docker-compose

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in environment variables');
    // Fallback if needed, but in Docker it should be set
}

const pool = mysql.createPool(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'social_media',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
