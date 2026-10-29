const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
                walk(filePath, results);
            }
        } else {
            results.push(filePath);
        }
    });
    return results;
}

const backendDir = path.resolve(__dirname, '..');
const files = walk(backendDir);
const matches = [];

files.forEach(file => {
    if (file.endsWith('.js')) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.toLowerCase().includes('from products') || line.toLowerCase().includes('join products')) {
                matches.push({ file: path.relative(backendDir, file), line: idx + 1, content: line.trim() });
            }
        });
    }
});

console.log('Matches found:', matches.length);
matches.forEach(m => {
    console.log(`[${m.file}:${m.line}] ${m.content}`);
});
