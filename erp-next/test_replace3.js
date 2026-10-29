const fs = require('fs');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if(file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}
const files = walk('src');
let changedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let ori = content;
    
    if (content.includes('http://localhost:5454')) {
        // Backtick URLs: \http://localhost:5454/api... -> \${API_BASE_URL}/...
        content = content.replace(/\http:\/\/localhost:5454(.*?)\/g, '\${API_BASE_URL}\');
        
        // String literal URLs: "http://localhost:5454/api... -> API_BASE_URL + "/...
        content = content.replace(/\"http:\/\/localhost:5454(.*?)\"/g, 'API_BASE_URL + \"\"');
        
        // Single quote URLs
        content = content.replace(/\'http:\/\/localhost:5454(.*?)\'/g, 'API_BASE_URL + \'\'');
        
        if (content !== ori) {
            if (!content.includes('import { API_BASE_URL }')) {
                // Find last import
                const lines = content.split('\n');
                let lastImportIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('import')) {
                        lastImportIndex = i;
                    }
                }
                if (lastImportIndex !== -1) {
                    lines.splice(lastImportIndex + 1, 0, 'import { API_BASE_URL } from "@/lib/constants";');
                } else {
                    lines.unshift('import { API_BASE_URL } from "@/lib/constants";');
                }
                content = lines.join('\n');
            }
            fs.writeFileSync(file, content, 'utf8');
            changedCount++;
            console.log('Fixed', file);
        }
    }
});
console.log('\nTotal changed files:', changedCount);
