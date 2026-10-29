const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir("./src", function (filePath) {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    let content = fs.readFileSync(filePath, "utf8");

    // Look for occurrences of "${API_BASE_URL}..." including the quotes
    if (content.includes('"${API_BASE_URL}')) {
      // Find and replace
      let newContent = content.replace(
        /"\$\{API_BASE_URL\}(.*?)"/g,
        "`${API_BASE_URL}$1`",
      );
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, "utf8");
        console.log("Fixed:", filePath);
      }
    }

    // Also look for occurrences with single quotes '${API_BASE_URL}...'
    if (content.includes("'${API_BASE_URL}")) {
      let newContent = content.replace(
        /'\$\{API_BASE_URL\}(.*?)'/g,
        "`${API_BASE_URL}$1`",
      );
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, "utf8");
        console.log("Fixed (single quotes):", filePath);
      }
    }
  }
});
