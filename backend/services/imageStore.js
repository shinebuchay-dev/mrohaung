const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Storage folder မရှိရင် ဆောက်မယ်
const storageDir = path.join(__dirname, '../storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir);
}

// Database ဖိုင် တည်နေရာ (storage/images.db)
const dbPath = path.join(storageDir, 'images.db');
const db = new Database(dbPath);

// Table ဆောက်မယ် (မရှိသေးရင်)
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE,
    data BLOB,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Performance ကောင်းအောင် WAL mode ဖွင့်မယ်
db.pragma('journal_mode = WAL');

module.exports = {
    // ပုံသိမ်းမယ့် Function
    saveImage: (filename, buffer, mimeType) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO images (filename, data, mime_type) VALUES (?, ?, ?)');
        return stmt.run(filename, buffer, mimeType);
    },

    // ပုံပြန်ထုတ်မယ့် Function
    getImage: (filename) => {
        const stmt = db.prepare('SELECT data, mime_type FROM images WHERE filename = ?');
        return stmt.get(filename);
    },

    // ပုံဖျက်မယ့် Function
    deleteImage: (filename) => {
        const stmt = db.prepare('DELETE FROM images WHERE filename = ?');
        return stmt.run(filename);
    }
};
