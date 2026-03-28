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

// Support both R2_PUBLIC_URL and R2_PUBLIC_DOMAIN env var names
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_DOMAIN || 'https://pub-e61e1977203c41d499155e42c923617c.r2.dev';

const initBucket = async () => {
    if (!s3Client) {
        console.warn('⚠️ WARNING: Cloudflare R2 is NOT configured. Media uploads will fail.');
    } else {
        console.log('✅ Cloudflare R2 Storage Service Initialized');
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

        // Use R2 (Required)
        if (s3Client) {
            const key = `${mappedArea}/${username}/${filename}`;
            const bucketName = process.env.R2_BUCKET_NAME || 'mrohaung-media';
            
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
            }));

            const publicBase = R2_PUBLIC_BASE;
            const url = `${publicBase.replace(/\/$/, '')}/${key}`;
            
            return { fileName: filename, url };
        } else {
            console.error('❌ R2 Client not initialized. Cannot upload file.');
            throw new Error('Cloud storage not configured. Please contact administrator.');
        }
    } catch (err) {
        console.error('Error during file upload:', err);
        throw new Error('File upload failed');
    }
};

module.exports = { initBucket, uploadFile, minioClient: s3Client, bucketName: process.env.R2_BUCKET_NAME };
