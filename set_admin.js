require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/utils/prisma');

async function setAdmin() {
    try {
        const [rows] = await pool.execute('SELECT id, username, email, role FROM User');
        console.log('Total Users:', rows.length);
        console.log('Users:', rows);

        // Find user by username if provided or just the first one
        const targetUsername = process.argv[2];
        let userToUpdate = rows[0];

        if (targetUsername) {
            userToUpdate = rows.find(u => u.username === targetUsername);
        }

        if (userToUpdate) {
            await pool.execute('UPDATE User SET role = "admin" WHERE id = ?', [userToUpdate.id]);
            console.log(`✅ Successfully updated "${userToUpdate.username}" (ID: ${userToUpdate.id}) to ADMIN role.`);
        } else {
            console.log('❌ No user found to update.');
        }
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit();
    }
}

setAdmin();
