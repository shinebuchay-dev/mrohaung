/**
 * MROHAUNG ROOT ENTRY POINT
 * This file is designed for Hostinger Node.js App Manager.
 * It strictly loads the backend API since the frontend is served statically by Apache.
 */

const path = require('path');

// Port is provided by Hostinger
const port = process.env.PORT || 5000;

console.log('--- Mrohaung Server Initiation ---');
console.log(`Target Port: ${port}`);
console.log('Mode: Backend (API Only)');

// Ensure environment variables are loaded
require('dotenv').config();

// Load the backend server
try {
    console.log('Loading Backend Service...');
    require('./backend/index.js');
    console.log('✅ Backend Service Loaded Successfully.');
} catch (err) {
    console.error('❌ CRITICAL ERROR: Failed to load backend service.');
    console.error(err);
    process.exit(1);
}
