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

        imageStore.saveImage(filename, fileBuffer, mimeType);

        const port = process.env.PORT || 5000;
        const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
        const url = `${baseUrl}/api/image/${filename}`;

        return { fileName: filename, url };
    } catch (err) {
        console.error('Error saving image to SQLite via service:', err);
        throw new Error('Image upload failed');
    }
};

module.exports = { initBucket, uploadFile, minioClient: null, bucketName: 'sqlite-images' };
