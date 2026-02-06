const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

// Port detection from Hostinger
const port = process.env.PORT || 3000;
const startMode = process.env.START_MODE || 'frontend';

console.log(`Starting Mrohaung Server in ${startMode} mode...`);
console.log(`Listening on port: ${port}`);

if (startMode === 'backend') {
    // Load Backend
    console.log('Loading Backend (API)...');
    require('./backend/index.js');
} else {
    // Load Frontend (Next.js)
    console.log('Loading Frontend (Next.js)...');
    try {
        const next = require('next');
        const app = next({ dev: false, dir: path.join(__dirname, 'web') });
        const handle = app.getRequestHandler();

        app.prepare().then(() => {
            createServer((req, res) => {
                const parsedUrl = parse(req.url, true);
                handle(req, res, parsedUrl);
            }).listen(port, (err) => {
                if (err) {
                    console.error('Error starting frontend server:', err);
                    process.exit(1);
                }
                console.log(`> Frontend (Next.js) is ready on port ${port}`);
            });
        }).catch(err => {
            console.error('Next.js app preparation failed:', err);
            process.exit(1);
        });
    } catch (err) {
        console.error('Failed to load next module. Make sure dependencies are installed.', err);
        process.exit(1);
    }
}
