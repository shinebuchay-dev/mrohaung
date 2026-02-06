const mysql = require('mysql2/promise');

const dbConfig = {
    host: '153.92.15.35',
    user: 'u860480593_social_media',
    password: 'SBCsm225569',
    database: 'u860480593_social_media'
};

const queries = [
    `CREATE TABLE IF NOT EXISTS User (
    id VARCHAR(191) PRIMARY KEY,
    username VARCHAR(191) UNIQUE NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(191) NOT NULL,
    bio VARCHAR(191),
    avatarUrl VARCHAR(191),
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
  )`,
    `CREATE TABLE IF NOT EXISTS Post (
    id VARCHAR(191) PRIMARY KEY,
    content TEXT NOT NULL,
    imageUrl VARCHAR(191),
    authorId VARCHAR(191) NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (authorId) REFERENCES User(id) ON DELETE CASCADE
  )`,
    `CREATE TABLE IF NOT EXISTS Friendship (
    id VARCHAR(191) PRIMARY KEY,
    userId VARCHAR(191) NOT NULL,
    friendId VARCHAR(191) NOT NULL,
    status VARCHAR(191) NOT NULL,
    UNIQUE KEY friendship_user_friend (userId, friendId),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (friendId) REFERENCES User(id) ON DELETE CASCADE
  )`,
    `CREATE TABLE IF NOT EXISTS \`Like\` (
    id VARCHAR(191) PRIMARY KEY,
    postId VARCHAR(191) NOT NULL,
    userId VARCHAR(191) NOT NULL,
    UNIQUE KEY like_post_user (postId, userId),
    FOREIGN KEY (postId) REFERENCES Post(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
    `CREATE TABLE IF NOT EXISTS Comment (
    id VARCHAR(191) PRIMARY KEY,
    content TEXT NOT NULL,
    postId VARCHAR(191) NOT NULL,
    userId VARCHAR(191) NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (postId) REFERENCES Post(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`
];

async function setup() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        for (const query of queries) {
            console.log('Executing query...');
            await connection.execute(query);
            console.log('Query success.');
        }

        console.log('All tables created successfully.');
    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

setup();
