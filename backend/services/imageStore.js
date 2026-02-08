const imageDb = require('../utils/imageDb');

module.exports = {
    // Save image to SQLite
    saveImage: (filename, buffer, mimeType) => {
        try {
            imageDb.saveImage(filename, buffer, mimeType);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to save image to SQLite:', error);
            throw error;
        }
    },

    // Get image from SQLite
    getImage: (filename) => {
        const row = imageDb.getImage(filename);
        if (!row) return null;
        return {
            data: row.data,
            mime_type: row.mimeType
        };
    },

    // Delete image from SQLite
    deleteImage: (filename) => {
        try {
            imageDb.deleteImage(filename);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to delete image from SQLite:', error);
            return { changes: 0 };
        }
    },

    // Private Image Methods
    savePrivateImage: (filename, buffer, mimeType, ownerId) => {
        try {
            imageDb.savePrivateImage(filename, buffer, mimeType, ownerId);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to save private image to SQLite:', error);
            throw error;
        }
    },

    getPrivateImage: (filename) => {
        const row = imageDb.getPrivateImage(filename);
        if (!row) return null;
        return {
            data: row.data,
            mime_type: row.mimeType,
            owner_id: row.ownerId
        };
    },

    deletePrivateImage: (filename) => {
        try {
            imageDb.deletePrivateImage(filename);
            return { changes: 1 };
        } catch (error) {
            console.error('Failed to delete private image from SQLite:', error);
            return { changes: 0 };
        }
    }
};
