const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('./prisma'); // To fetch username from the DB

const initBucket = async () => {
    const uploadBase = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadBase)) {
        fs.mkdirSync(uploadBase, { recursive: true });
    }
    console.log('Local File Storage Service Initialized at /uploads');
};

const uploadFile = async (fileBuffer, originalName, mimeType, userId = 'guest', usageArea = 'misc') => {
    try {
        const id = uuidv4();
        // Clean original name
        const extension = path.extname(originalName || '').toLowerCase() || '.jpg';
        const filename = `${id}${extension}`;

        let username = 'guest';

        // Fetch username from DB if a valid userId is provided
        if (userId !== 'guest') {
            const [rows] = await pool.execute('SELECT username FROM User WHERE id = ?', [userId]);
            if (rows.length > 0) {
                username = rows[0].username;
            }
        }

        // Map usageArea to desired folder names according to request
        const areaMap = {
            'posts': 'Post',
            'comments': 'Comment',
            'avatars': 'Profile',
            'covers': 'Cover',
            'messages': 'Message',
            'stories': 'Story'
        };
        const mappedArea = areaMap[usageArea] || (usageArea.charAt(0).toUpperCase() + usageArea.slice(1));

        // Path structure: uploads/{username}/{mappedArea}
        const relativePath = path.join('uploads', username, mappedArea);
        const uploadDir = path.join(__dirname, '..', relativePath);

        // Ensure directory exists with recursive: true
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, fileBuffer);

        let baseUrl = process.env.BASE_URL || 'https://mrohaung.com';
        
        // Remove trailing slash if exists
        baseUrl = baseUrl.replace(/\/$/, '');
        
        // Return the static path to the file
        // Normalize slashes for URL
        const url = `${baseUrl}/${relativePath.replace(/\\/g, '/')}/${filename}`;

        return { fileName: filename, url };
    } catch (err) {
        console.error('Error saving image to disk:', err);
        throw new Error('Image upload failed');
    }
};

module.exports = { initBucket, uploadFile, minioClient: null, bucketName: 'local-storage' };
