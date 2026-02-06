const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    uri: process.env.DATABASE_URL
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig.uri);
        console.log('Connected!');

        console.log('Checking User table columns...');
        const [cols] = await connection.execute('DESCRIBE User');
        const fields = cols.map(c => c.Field);

        if (!fields.includes('coverUrl')) {
            console.log('Adding coverUrl column...');
            await connection.execute('ALTER TABLE User ADD COLUMN coverUrl TEXT');
            console.log('Added coverUrl');
        } else {
            console.log('coverUrl column already exists');
        }

        if (!fields.includes('coverOffset')) {
            console.log('Adding coverOffset column...');
            await connection.execute('ALTER TABLE User ADD COLUMN coverOffset INT DEFAULT 50');
            console.log('Added coverOffset');
        } else {
            console.log('coverOffset column already exists');
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
