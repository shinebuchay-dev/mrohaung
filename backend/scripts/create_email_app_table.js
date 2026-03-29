require('dotenv').config();
const pool = require('../utils/prisma');

async function createTable() {
    try {
        console.log('Creating EmailApplication table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS EmailApplication (
                id VARCHAR(191) NOT NULL,
                userId VARCHAR(191) NOT NULL,
                emailPrefix VARCHAR(191) NOT NULL,
                fullEmail VARCHAR(191) NOT NULL,
                status VARCHAR(191) NOT NULL DEFAULT 'pending',
                smtpPassword VARCHAR(191),
                notes TEXT,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX EmailApplication_fullEmail_key (fullEmail),
                INDEX EmailApplication_userId_idx (userId),
                CONSTRAINT EmailApplication_userId_fkey FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('EmailApplication table created or already exists.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

createTable();
