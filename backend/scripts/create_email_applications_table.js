const pool = require('../utils/prisma');

async function createEmailApplicationsTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS EmailApplication (
                id          VARCHAR(36)  NOT NULL PRIMARY KEY,
                userId      VARCHAR(36)  NOT NULL,
                emailPrefix VARCHAR(64)  NOT NULL,
                fullEmail   VARCHAR(128) NOT NULL,
                status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                smtpPassword VARCHAR(128) NULL,
                notes       TEXT         NULL,
                createdAt   DATETIME     NOT NULL DEFAULT NOW(),
                updatedAt   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
                UNIQUE KEY uq_email (fullEmail),
                UNIQUE KEY uq_user (userId),
                FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ EmailApplication table created/verified.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err.message);
        process.exit(1);
    }
}

createEmailApplicationsTable();
