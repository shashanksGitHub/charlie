const fs = require('fs');

const filePath = 'client/src/components/profile/meet-profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove all size="sm" attributes from Switch components
content = content.replace(/(<Switch[^>]*?)size="sm"/g, '$1');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Switch components');
