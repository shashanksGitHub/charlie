/**
 * Script to fix all null reference errors in suite-network-page.tsx
 * This will replace all unsafe card styling code with safe alternatives
 */

const fs = require('fs');
const path = require('path');

const filePath = 'client/src/pages/suite-network-page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all unsafe getCurrentCardRef()!.current!.style operations
content = content.replace(
  /getCurrentCardRef\(\)!\.current!\.style\.transform = "";/g,
  'safeStyleCard((element) => { element.style.transform = ""; });'
);

content = content.replace(
  /getCurrentCardRef\(\)!\.current!\.style\.transition =\s*"transform 0\.3s ease-out";/g,
  'safeStyleCard((element) => { element.style.transition = "transform 0.3s ease-out"; });'
);

content = content.replace(
  /getCurrentCardRef\(\)!\.current!\.style\.transform = `[\s\S]*?`;/g,
  (match) => {
    const transformValue = match.match(/`([\s\S]*?)`/)[1];
    return `safeStyleCard((element) => { element.style.transform = \`${transformValue}\`; });`;
  }
);

// Replace the problematic setTimeout blocks
content = content.replace(
  /setTimeout\(\(\) => \{\s*if \(getCurrentCardRef\(\)\) \{\s*getCurrentCardRef\(\)!\.current!\.style\.transition = "";\s*\}\s*\}, 300\);/g,
  'setTimeout(() => { safeStyleCard((el) => { el.style.transition = ""; }); }, 300);'
);

// Write the fixed content back
fs.writeFileSync(filePath, content);
console.log('Fixed all null reference errors in card styling code');