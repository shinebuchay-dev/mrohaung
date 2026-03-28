const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables IMMEDIATELY before other local requires
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pool = require('../utils/prisma');

const R2_CONFIG = {
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
};

const s3Client = new S3Client(R2_CONFIG);
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'mrohaung-media';
const PUBLIC_BASE = (process.env.R2_PUBLIC_URL || 'https://media.mrohaung.com').replace(/\/$/, '');

async function migrate() {
    console.log('🚀 Starting Migration from Local Storage to Cloudflare R2...');

    if (!process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID === 'placeholder_access_key' || !process.env.R2_ACCESS_KEY_ID) {
        console.error('❌ ERROR: Please set real R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env file first!');
        process.exit(1);
    }

    const uploadBase = path.join(__dirname, '..', 'uploads');

    if (!fs.existsSync(uploadBase)) {
        console.warn(`⚠️ Warning: No 'uploads' directory found at ${uploadBase}. Perhaps migration is already done or running on wrong path.`);
        return;
    }

    // Recursively walk through files
    async function walk(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.startsWith('.')) continue; // skip hidden files

            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                await walk(fullPath);
            } else {
                const relativePath = path.relative(uploadBase, fullPath);
                // Transform: {username}/{mappedArea}/{filename}
                const parts = relativePath.split(path.sep); 
                
                if (parts.length === 3) {
                    const [username, mappedArea, filename] = parts;
                    const key = `${mappedArea}/${username}/${filename}`;
                    const newUrl = `${PUBLIC_BASE}/${key}`;
                    
                    console.log(`📤 Uploading: ${relativePath} -> ${newUrl}`);
                    
                    try {
                        const fileContent = fs.readFileSync(fullPath);
                        const mimeType = getMimeType(file);
                        
                        // 1. Upload to R2
                        await s3Client.send(new PutObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: key,
                            Body: fileContent,
                            ContentType: mimeType,
                        }));

                        // 2. Update Database (Search and replace old URL format with new R2 URL)
                        // Old format might be: BASE_URL/uploads/username/mappedArea/filename
                        const oldPathPart = `uploads/${username}/${mappedArea}/${filename}`;
                        
                        // We do a partial match update in the DB for Post, User (avatar/cover), Comment, etc.
                        await updateDatabaseUrls(oldPathPart, newUrl);
                        
                        console.log(`✅ Success: ${key}`);
                    } catch (error) {
                        console.error(`❌ Failed: ${key}`, error);
                    }
                }
            }
        }
    }

    await walk(uploadBase);
    console.log('🏁 Migration process completed! Database URLs updated.');
    process.exit(0);
}

async function updateDatabaseUrls(oldPart, newUrl) {
    // Escaping % for LIKE query
    const oldLikeMatch = `%${oldPart}%`;
    
    // Update Post images
    await pool.execute('UPDATE Post SET imageUrl = ? WHERE imageUrl LIKE ?', [newUrl, oldLikeMatch]);
    
    // Update User avatars and covers
    await pool.execute('UPDATE User SET avatarUrl = ? WHERE avatarUrl LIKE ?', [newUrl, oldLikeMatch]);
    await pool.execute('UPDATE User SET coverUrl = ? WHERE coverUrl LIKE ?', [newUrl, oldLikeMatch]);
    
    // Update Comment media (audio/stickers)
    await pool.execute('UPDATE Comment SET audioUrl = ? WHERE audioUrl LIKE ?', [newUrl, oldLikeMatch]);
    await pool.execute('UPDATE Comment SET stickerUrl = ? WHERE stickerUrl LIKE ?', [newUrl, oldLikeMatch]);
    
    // Update Story media (mediaUrl)
    await pool.execute('UPDATE Story SET mediaUrl = ? WHERE mediaUrl LIKE ?', [newUrl, oldLikeMatch]);

    // Update Message attachments (imageUrl)
    await pool.execute('UPDATE Message SET imageUrl = ? WHERE imageUrl LIKE ?', [newUrl, oldLikeMatch]);
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
        '.webp': 'image/webp',
        '.mov': 'video/quicktime',
    };
    return map[ext] || 'application/octet-stream';
}

migrate().catch(err => {
    console.error('Fatal Migration Error:', err);
    process.exit(1);
});
