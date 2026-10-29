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
        let lines = content.split('\n');
        let needsImport = false;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('http://localhost:5454')) {
                needsImport = true;
                lines[i] = lines[i].replace(/\http:\/\/localhost:5454(.*?)\/g, '\${API_BASE_URL}\');
                lines[i] = lines[i].replace(/\"http:\/\/localhost:5454(.*?)\"/g, 'API_BASE_URL + \"\"');
                lines[i] = lines[i].replace(/\'http:\/\/localhost:5454(.*?)\'/g, 'API_BASE_URL + \'\'');
            }
        }
        
        let hasImport = content.includes('import { API_BASE_URL }');
        if (needsImport && !hasImport && !file.includes('constants.ts')) {
            let lastImportIndex = -1;
            for(let i=0; i<lines.length; i++) {
                if(lines[i].startsWith('import')) lastImportIndex = i;
            }
            if (lastImportIndex !== -1) {
                lines.splice(lastImportIndex + 1, 0, 'import { API_BASE_URL } from "@/lib/constants";');
            } else {
                lines.unshift('import { API_BASE_URL } from "@/lib/constants";');
            }
        }
        
        let newContent = lines.join('\n');
        if (newContent !== ori) {
            fs.writeFileSync(file, newContent);
            changedCount++;
            console.log('Fixed', file);
        }
    }
});
console.log('\nTotal changed files:', changedCount);
