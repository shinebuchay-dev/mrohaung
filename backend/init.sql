-- ============================================
-- Database Initialization Script
-- ============================================
-- This script runs automatically when the MySQL container starts for the first time

-- Create database if not exists (already done by MYSQL_DATABASE env var)
-- CREATE DATABASE IF NOT EXISTS social_media;

-- Use the database
USE social_media;

-- Set timezone
SET time_zone = '+00:00';

-- Optional: Create initial tables or seed data here
-- Example:
-- CREATE TABLE IF NOT EXISTS users (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     username VARCHAR(255) NOT NULL UNIQUE,
--     email VARCHAR(255) NOT NULL UNIQUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Grant privileges (optional, user already has privileges from env vars)
-- GRANT ALL PRIVILEGES ON social_media.* TO 'user'@'%';
-- FLUSH PRIVILEGES;

SELECT 'Database initialized successfully!' as message;
