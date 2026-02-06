const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Please set it in backend/.env');
}

const poolConfig = {
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = {
        rejectUnauthorized: true
    };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
