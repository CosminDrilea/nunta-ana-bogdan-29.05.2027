import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const clientId = process.argv[2] || '';
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clientId)) {
  console.error('Folosește: node scripts/create-invite-links.mjs identificator-client');
  process.exit(1);
}

let config;
try { config = JSON.parse(await readFile(join(root, 'clients', `${clientId}.json`), 'utf8')); }
catch { console.error(`Nu am găsit clients/${clientId}.json.`); process.exit(1); }
if (!config.features.personalizedLinks) {
  console.error(`Activează "personalizedLinks": true în clients/${clientId}.json și încearcă din nou.`);
  process.exit(1);
}

const registryDir = join(root, 'data', 'invitees');
const registryPath = join(registryDir, `${clientId}.json`);
let invitees = [];
try { invitees = JSON.parse(await readFile(registryPath, 'utf8')); } catch {}
const terminal = createInterface({ input, output });
const baseUrl = (process.env.INVITATION_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const added = [];

try {
  console.log(`Creez linkuri personalizate pentru ${clientId}. Toate vor folosi limita generală de ${config.rsvp.maxGuests} persoane. Lasă numele gol pentru a termina.`);
  while (true) {
    const name = (await terminal.question('Numele invitatului sau al grupului: ')).trim();
    if (!name) break;
    const invitee = { id: randomBytes(8).toString('hex'), token: randomBytes(16).toString('hex'), name, maxGuests: config.rsvp.maxGuests };
    invitees.push(invitee);
    added.push({ name, url: `${baseUrl}/?client=${encodeURIComponent(clientId)}&guest=${invitee.token}` });
  }
} finally { terminal.close(); }

if (added.length) {
  await mkdir(registryDir, { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(invitees, null, 2)}\n`, 'utf8');
  console.log('\nLinkuri create:');
  for (const item of added) console.log(`\n${item.name}\n${item.url}`);
  console.log('\nPăstrează linkurile private și trimite fiecărui invitat doar linkul lui.');
} else console.log('Nu au fost create linkuri noi.');
