const fs = require('fs');
let c = fs.readFileSync('src/pages/tickets.js', 'utf8');
c = c.replace(/\\\$/g, '$');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('src/pages/tickets.js', c);
