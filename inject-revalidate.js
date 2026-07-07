const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/api/categories/route.ts',
  'src/app/api/categories/[id]/route.ts',
  'src/app/api/products/route.ts',
  'src/app/api/products/[id]/route.ts',
  'src/app/api/toppings/route.ts',
  'src/app/api/toppings/[id]/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/campaigns/route.ts',
  'src/app/api/campaigns/[id]/route.ts'
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import if not exists
  if (!content.includes('import { revalidatePath } from "next/cache";')) {
    content = content.replace(/(import .*;\n)+/, (match) => match + 'import { revalidatePath } from "next/cache";\n');
    changed = true;
  }

  // Inject revalidatePath before return NextResponse.json(..., { status: 200/201 }) or just return NextResponse.json(...)
  // but only inside POST, PUT, DELETE, PATCH functions
  // A simple regex approach:
  const functionRegex = /export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)\b[\s\S]*?(?=\nexport\s+async\s+function|$)/g;
  
  content = content.replace(functionRegex, (funcContent) => {
    // We can replace the last return NextResponse.json... in the function if it's inside a try block
    return funcContent.replace(/(\s*)(return NextResponse\.json\([^,]+(?:,\s*\{\s*status:\s*(?:200|201)\s*\}\s*)?\);|return new NextResponse\(null,\s*\{\s*status:\s*204\s*\}\);)/g, (match, space, ret) => {
      // Avoid injecting if already injected or if the return contains error
      if (funcContent.includes("revalidatePath('/api/public/menu-data')")) return match; 
      if (match.includes('error')) return match;
      return `${space}revalidatePath('/api/public/menu-data');${match}`;
    });
  });

  if (changed || content.includes("revalidatePath('/api/public/menu-data')")) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}
