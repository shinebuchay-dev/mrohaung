const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const initBucket = async () => {
    console.log('Local File Storage Service Initialized');
};

const uploadFile = async (fileBuffer, originalName, mimeType, userId = 'guest', usageArea = 'misc') => {
    try {
        const id = uuidv4();
        const safeOriginalName = path.basename(originalName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${id}-${safeOriginalName}`;

        // Create folder structure: uploads/users/{userId}/{usageArea}
        const relativePath = path.join('uploads', 'users', String(userId), usageArea);
        const uploadDir = path.join(__dirname, '..', relativePath);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, fileBuffer);

        let baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            if (process.env.NODE_ENV === 'production' || process.env.PORT) {
                baseUrl = 'https://mrohaung.com';
            } else {
                baseUrl = `http://localhost:${process.env.PORT || 5001}`;
            }
        }
        
        if (baseUrl.includes('mrohaung.com') && baseUrl.startsWith('http://')) {
            baseUrl = baseUrl.replace('http://', 'https://');
        }

        // Return the static path to the file
        const url = `${baseUrl}/${relativePath.replace(/\\/g, '/')}/${filename}`;

        return { fileName: filename, url };
    } catch (err) {
        console.error('Error saving image to disk:', err);
        throw new Error('Image upload failed');
    }
};

module.exports = { initBucket, uploadFile, minioClient: null, bucketName: 'local-storage' };
