
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Standard Electron userData paths
let userData;
if (process.platform === 'darwin') {
    userData = path.join(os.homedir(), 'Library', 'Application Support', 'inventoriman');
} else if (process.platform === 'win32') {
    userData = path.join(process.env.APPDATA, 'inventoriman');
} else {
    userData = path.join(os.homedir(), '.config', 'inventoriman');
}

const dbPath = path.join(userData, 'inventoriman.db');
console.log('Checking DB at:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });
    const staff = db.prepare('SELECT name, pin, role FROM staff').all();
    console.log('Found staff:', staff);
} catch (err) {
    console.error('Error reading DB:', err.message);
}
