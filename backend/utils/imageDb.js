const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../images.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    data BLOB,
    mimeType TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS private_images (
    id TEXT PRIMARY KEY,
    data BLOB,
    mimeType TEXT,
    ownerId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = {
    saveImage: (id, buffer, mimeType) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO images (id, data, mimeType) VALUES (?, ?, ?)');
        return stmt.run(id, buffer, mimeType);
    },
    getImage: (id) => {
        const stmt = db.prepare('SELECT data, mimeType FROM images WHERE id = ?');
        return stmt.get(id);
    },
    deleteImage: (id) => {
        const stmt = db.prepare('DELETE FROM images WHERE id = ?');
        return stmt.run(id);
    },
    // Private Image Logic
    savePrivateImage: (id, buffer, mimeType, ownerId) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO private_images (id, data, mimeType, ownerId) VALUES (?, ?, ?, ?)');
        return stmt.run(id, buffer, mimeType, ownerId);
    },
    getPrivateImage: (id) => {
        const stmt = db.prepare('SELECT data, mimeType, ownerId FROM private_images WHERE id = ?');
        return stmt.get(id);
    },
    deletePrivateImage: (id) => {
        const stmt = db.prepare('DELETE FROM private_images WHERE id = ?');
        return stmt.run(id);
    }
};
