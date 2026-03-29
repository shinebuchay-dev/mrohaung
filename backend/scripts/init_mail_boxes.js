const pool = require('../utils/prisma');

async function init() {
    try {
        console.log("Connecting strictly to database configuration...");
        
        // Ensure EmailApplication supports user-defined password (we just reuse smtpPassword field)
        // No schema change needed for that, we just change the insertion logic.
        
        // Create the EmailMessage table for storing Inbox & Sent mails
        const query = `
            CREATE TABLE IF NOT EXISTS EmailMessage (
                id VARCHAR(36) PRIMARY KEY,
                ownerEmail VARCHAR(255) NOT NULL,
                folder VARCHAR(20) DEFAULT 'inbox',
                fromAddress VARCHAR(255),
                toAddress VARCHAR(255),
                subject VARCHAR(255),
                bodyText TEXT,
                bodyHtml TEXT,
                isRead BOOLEAN DEFAULT FALSE,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_owner_folder (ownerEmail, folder)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await pool.query(query);
        console.log("✅ EmailMessage table verified successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ EmailMessage initialization failed:", err);
        process.exit(1);
    }
}

init();
