const fs = require('fs');
const path = require('path');

const EXTs = ['.tsx', '.ts', '.jsx', '.js'];
const TARGET_DIRS = [
    path.join(__dirname, 'web', 'components'),
    path.join(__dirname, 'web', 'app'),
];

// Mappings for light/dark mode
const colorMaps = [
    { regex: /bg-\[\#0f172a\]/g, replacement: 'bg-slate-50 dark:bg-[#0f172a]' },
    { regex: /bg-\[\#1e293b\]/g, replacement: 'bg-white dark:bg-[#1e293b]' },
    { regex: /text-\[\#94a3b8\]/g, replacement: 'text-slate-500 dark:text-[#94a3b8]' },
    { regex: /text-\[\#64748b\]/g, replacement: 'text-slate-500 dark:text-[#64748b]' },
    { regex: /border-\[\#334155\]/g, replacement: 'border-slate-200 dark:border-[#334155]' },
    { regex: /border-\[\#1e293b\]/g, replacement: 'border-slate-200 dark:border-[#1e293b]' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (EXTs.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            for (const map of colorMaps) {
                content = content.replace(map.regex, map.replacement);
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

for (const dir of TARGET_DIRS) {
    if (fs.existsSync(dir)) {
        processDirectory(dir);
    }
}
console.log('Update complete.');
