const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app/api');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('userId: session.user.id,')) {
    content = content.replace(/userId:\s*session\.user\.id,/g, 'userId: session.user?.id as string,');
    fs.writeFileSync(file, content);
    changedCount++;
  }
});
console.log(`Replaced in ${changedCount} files.`);
