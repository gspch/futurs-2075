// Copie les PDF de docs/ dans web/public/pdf/ pour qu'ils soient téléchargeables depuis le site.
import fs from 'node:fs';
fs.mkdirSync('web/public/pdf', { recursive: true });
for (const f of fs.readdirSync('docs')) if (f.endsWith('.pdf')) fs.copyFileSync(`docs/${f}`, `web/public/pdf/${f}`);
