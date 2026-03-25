const pool = require('./prisma');
const { v4: uuidv4 } = require('uuid');

async function initImageTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS Images (
                id VARCHAR(255) PRIMARY KEY,
                data LONGBLOB,
                mimeType VARCHAR(100),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ MySQL Images Table Initialized');
    } catch (err) {
        console.error('❌ Failed to initialize MySQL Images table:', err.message);
    }
}

// Auto-init
initImageTable();

module.exports = {
    saveImage: async (id, buffer, mimeType) => {
        try {
            console.log(`[MySQL] Attempting to save image: ${id} (${buffer.length} bytes)`);
            const [result] = await pool.execute(
                'INSERT INTO Images (id, data, mimeType) VALUES (?, ?, ?)',
                [id, buffer, mimeType]
            );
            console.log(`[MySQL] Saved image: ${id}`);
            return result;
        } catch (error) {
            console.error('❌ MySQL Save Image Error:', error.message);
            throw error;
        }
    },
    getImage: async (id) => {
        try {
            const [rows] = await pool.execute(
                'SELECT data, mimeType FROM Images WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('MySQL Get Image Error:', error);
            return null;
        }
    },
    deleteImage: async (id) => {
        try {
            const [result] = await pool.execute('DELETE FROM Images WHERE id = ?', [id]);
            return result;
        } catch (error) {
            console.error('MySQL Delete Image Error:', error);
            return null;
        }
    },
    // Adding private image methods for compatibility
    savePrivateImage: async (id, buffer, mimeType, ownerId) => {
        // We can just add an ownerId column or use another table. 
        // For now, let's keep it simple and reuse the table or ignore it if not critical.
        // Actually, let's update the table.
        try {
            await pool.execute('ALTER TABLE Images ADD COLUMN IF NOT EXISTS ownerId VARCHAR(255)');
            const [result] = await pool.execute(
                'INSERT INTO Images (id, data, mimeType, ownerId) VALUES (?, ?, ?, ?)',
                [id, buffer, mimeType, ownerId]
            );
            return result;
        } catch (error) {
            return null;
        }
    },
    getPrivateImage: async (id) => {
        const [rows] = await pool.execute('SELECT data, mimeType, ownerId FROM Images WHERE id = ?', [id]);
        return rows[0];
    }
};
