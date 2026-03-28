const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('./prisma');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 Client Initialization
const s3Client = process.env.R2_ACCESS_KEY_ID ? new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
}) : null;

const initBucket = async () => {
    if (!s3Client) {
        const uploadBase = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadBase)) {
            fs.mkdirSync(uploadBase, { recursive: true });
        }
        console.log('Local File Storage Service Initialized at /uploads (R2 not configured)');
    } else {
        console.log('Cloudflare R2 Storage Service Initialized');
    }
};

const uploadFile = async (fileBuffer, originalName, mimeType, userId = 'guest', usageArea = 'misc') => {
    try {
        const id = uuidv4();
        const extension = path.extname(originalName || '').toLowerCase() || '.jpg';
        const filename = `${id}${extension}`;

        let username = 'guest';

        if (userId !== 'guest') {
            const [rows] = await pool.execute('SELECT username FROM User WHERE id = ?', [userId]);
            if (rows.length > 0) {
                username = rows[0].username;
            }
        }

        const areaMap = {
            'posts': 'Post',
            'comments': 'Comment',
            'avatars': 'Profile',
            'covers': 'Cover',
            'messages': 'Message',
            'stories': 'Story'
        };
        const mappedArea = areaMap[usageArea] || (usageArea.charAt(0).toUpperCase() + usageArea.slice(1));

        // Use R2 if configured
        if (s3Client) {
            const key = `${mappedArea}/${username}/${filename}`;
            const bucketName = process.env.R2_BUCKET_NAME || 'mrohaung-media';
            
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
            }));

            const publicBase = process.env.R2_PUBLIC_URL || 'https://media.mrohaung.com';
            const url = `${publicBase.replace(/\/$/, '')}/${key}`;
            
            return { fileName: filename, url };
        } else {
            // Fallback to local storage
            const relativePath = path.join('uploads', username, mappedArea);
            const uploadDir = path.join(__dirname, '..', relativePath);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, fileBuffer);

            let baseUrl = process.env.BASE_URL || 'https://mrohaung.com';
            baseUrl = baseUrl.replace(/\/$/, '');
            const url = `${baseUrl}/${relativePath.replace(/\\/g, '/')}/${filename}`;

            return { fileName: filename, url };
        }
    } catch (err) {
        console.error('Error during file upload:', err);
        throw new Error('File upload failed');
    }
};

module.exports = { initBucket, uploadFile, minioClient: s3Client, bucketName: process.env.R2_BUCKET_NAME };
