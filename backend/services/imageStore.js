const imageDb = require('../utils/imageDb');

module.exports = {
    // Save image to MySQL (now async)
    saveImage: async (filename, buffer, mimeType) => {
        try {
            await imageDb.saveImage(filename, buffer, mimeType);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to save image to MySQL:', error);
            throw error;
        }
    },

    // Get image from MySQL (now async)
    getImage: async (filename) => {
        const row = await imageDb.getImage(filename);
        if (!row) return null;
        return {
            data: row.data,
            mime_type: row.mimeType
        };
    },

    // Delete image from MySQL (now async)
    deleteImage: async (filename) => {
        try {
            await imageDb.deleteImage(filename);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to delete image from MySQL:', error);
            return { changes: 0 };
        }
    },

    savePrivateImage: async (filename, buffer, mimeType, ownerId) => {
        try {
            await imageDb.savePrivateImage(filename, buffer, mimeType, ownerId);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to save private image to MySQL:', error);
            throw error;
        }
    },

    getPrivateImage: async (filename) => {
        const row = await imageDb.getPrivateImage(filename);
        if (!row) return null;
        return {
            data: row.data,
            mime_type: row.mimeType,
            owner_id: row.ownerId
        };
    }
};
