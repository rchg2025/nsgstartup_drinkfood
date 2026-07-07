const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/api/categories/route.ts',
  'src/app/api/products/route.ts',
  'src/app/api/toppings/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/campaigns/route.ts'
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace export const revalidate = ... with export const dynamic = "force-dynamic"
  const revalidateRegex = /export\s+const\s+revalidate\s*=\s*\d+;[^\n]*\n/g;
  if (revalidateRegex.test(content)) {
    content = content.replace(revalidateRegex, 'export const dynamic = "force-dynamic";\n');
    changed = true;
  } else if (!content.includes('export const dynamic = "force-dynamic";')) {
    // If neither exists, insert force-dynamic after imports
    content = content.replace(/(import .*;\n)+/, (match) => match + '\nexport const dynamic = "force-dynamic";\n');
    changed = true;
  }

  // Remove Cache-Control headers
  const cacheHeaderRegex = /\s*res\.headers\.set\s*\(\s*['"]Cache-Control['"]\s*,\s*['"][^'"]*['"]\s*\);/g;
  if (cacheHeaderRegex.test(content)) {
    content = content.replace(cacheHeaderRegex, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}
