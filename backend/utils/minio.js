const imageStore = require('../services/imageStore');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const initBucket = async () => {
    console.log('SQLite Image Storage Service Initialized');
};

const uploadFile = async (fileBuffer, originalName, mimeType) => {
    try {
        const id = uuidv4();
        const safeOriginalName = path.basename(originalName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${id}-${safeOriginalName}`;

        await imageStore.saveImage(filename, fileBuffer, mimeType);

        let baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            // Force production URL if we detect we're not on localhost
            if (process.env.NODE_ENV === 'production' || process.env.PORT) {
                baseUrl = 'https://mrohaung.com';
            } else {
                baseUrl = `http://localhost:5000`;
            }
        }
        console.log(`[Upload] Using Base URL: ${baseUrl}`);
        // Ensure https for production
        if (baseUrl.includes('mrohaung.com') && baseUrl.startsWith('http://')) {
            baseUrl = baseUrl.replace('http://', 'https://');
        }

        const url = `${baseUrl}/api/image/${filename}`;

        return { fileName: filename, url };
    } catch (err) {
        console.error('Error saving image to SQLite via service:', err);
        throw new Error('Image upload failed');
    }
};

module.exports = { initBucket, uploadFile, minioClient: null, bucketName: 'sqlite-images' };
