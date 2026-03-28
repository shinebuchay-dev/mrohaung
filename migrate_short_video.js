const pool = require('./backend/utils/prisma');

async function migrate() {
    try {
        console.log('--- Starting ShortVideoComment Migration ---');

        // 1. Add parentId to ShortVideoComment if it doesn't exist
        const [cols] = await pool.query('DESCRIBE ShortVideoComment');
        const hasParentId = cols.some(c => c.Field === 'parentId');
        
        if (!hasParentId) {
            console.log('Adding parentId to ShortVideoComment...');
            await pool.query('ALTER TABLE ShortVideoComment ADD COLUMN parentId VARCHAR(255) DEFAULT NULL');
            await pool.query('ALTER TABLE ShortVideoComment ADD CONSTRAINT fk_short_video_comment_parent FOREIGN KEY (parentId) REFERENCES ShortVideoComment(id) ON DELETE CASCADE');
            console.log('parentId added.');
        } else {
            console.log('parentId already exists.');
        }

        // 2. Create ShortVideoCommentLike table if it doesn't exist
        console.log('Checking ShortVideoCommentLike table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ShortVideoCommentLike (
                id VARCHAR(255) PRIMARY KEY,
                commentId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'like',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_short_comment_like (commentId, userId),
                FOREIGN KEY (commentId) REFERENCES ShortVideoComment(id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
            )
        `);
        console.log('ShortVideoCommentLike table ready.');

        console.log('--- Migration Successful ---');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
