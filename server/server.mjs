import { createServer } from 'node:http';
import { readFile, appendFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataDir = join(root, 'data');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const claimedTokens = new Set();

async function findInvitee(clientId, token) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clientId) || !/^[a-f0-9]{32}$/.test(token)) return null;
  const rows = JSON.parse(await readFile(join(dataDir, 'invitees', `${clientId}.json`), 'utf8'));
  return rows.find(row => row.token === token) || null;
}

async function markInviteeUsed(clientId, token, receivedAt) {
  const registryPath = join(dataDir, 'invitees', `${clientId}.json`);
  const invitees = JSON.parse(await readFile(registryPath, 'utf8'));
  const invitee = invitees.find(row => row.token === token);
  if (!invitee || invitee.usedAt) return false;
  invitee.usedAt = receivedAt;
  const temporaryPath = `${registryPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(invitees, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, registryPath);
  return true;
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'GET' && (req.url || '').startsWith('/api/invite?')) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const clientId = url.searchParams.get('client') || '';
      const token = url.searchParams.get('token') || '';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clientId)) throw new Error('Identificatorul invitației nu este valid.');
      const client = JSON.parse(await readFile(join(root, 'clients', `${clientId}.json`), 'utf8'));
      if (!client.features.personalizedLinks) throw new Error('Linkurile personalizate nu sunt activate.');
      const invitee = await findInvitee(clientId, token);
      if (!invitee) throw new Error('Linkul invitației nu este valid.');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify({ alreadySubmitted: Boolean(invitee.usedAt || claimedTokens.has(`${clientId}:${token}`)), invitee: { id: invitee.id, name: invitee.name, maxGuests: invitee.maxGuests } }));
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: error.message || 'Invitația nu a fost găsită.' }));
    }
    return;
  }
  if (req.method === 'POST' && req.url === '/api/rsvp') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw);
        if (typeof body.clientId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.clientId)) throw new Error('Invitația nu este identificată corect.');
        let client;
        try { client = JSON.parse(await readFile(join(root, 'clients', `${body.clientId}.json`), 'utf8')); }
        catch { throw new Error('Invitația nu a fost găsită.'); }
        let invitee = null;
        if (client.features.personalizedLinks) {
          invitee = await findInvitee(body.clientId, body.guestToken || '');
          if (!invitee) throw new Error('Deschide linkul personal primit pentru această invitație.');
          if (invitee.usedAt || claimedTokens.has(`${body.clientId}:${body.guestToken}`)) throw Object.assign(new Error('Confirmarea a fost deja înregistrată. Pentru modificări, contactează mirii.'), { statusCode: 409 });
          if (body.guests > invitee.maxGuests) throw new Error(`Această invitație permite maximum ${invitee.maxGuests} persoane.`);
        }
        if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 120) throw new Error('Introdu un nume valid.');
        if (!client.features.rsvp) throw new Error('Confirmarea RSVP nu este activă pentru această invitație.');
        if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > client.rsvp.maxGuests) throw new Error('Numărul de persoane nu este valid.');
        if (typeof body.attending !== 'boolean') throw new Error('Alege dacă participi.');
        if (typeof body.message !== 'string' || body.message.length > 1000) throw new Error('Mesajul este prea lung.');
        if (typeof body.dietary !== 'string' || body.dietary.length > 500) throw new Error('Preferințele alimentare sunt prea lungi.');
        if (!client.features.dietaryNeeds && body.dietary) throw new Error('Preferințele alimentare nu sunt activate pentru această invitație.');
        if (!Array.isArray(body.menus)) throw new Error('Opțiunile de meniu nu sunt valide.');
        if (client.features.menuCounts && body.attending && (body.menus.length !== body.guests || body.menus.some(item => !client.rsvp.menuOptions.includes(item)))) throw new Error('Verifică selecția meniurilor.');
        if ((!body.attending || !client.features.menuCounts) && body.menus.length !== 0) throw new Error('Nu sunt necesare opțiuni de meniu pentru acest răspuns.');
        const record = { ...body, name: invitee ? invitee.name : body.name.trim(), inviteeId: invitee?.id || null, guestToken: undefined, message: body.message.trim(), receivedAt: new Date().toISOString() };
        const tokenKey = invitee ? `${body.clientId}:${body.guestToken}` : null;
        if (tokenKey && claimedTokens.has(tokenKey)) throw Object.assign(new Error('Confirmarea a fost deja înregistrată. Pentru modificări, contactează mirii.'), { statusCode: 409 });
        if (tokenKey) claimedTokens.add(tokenKey);
        let sheetStatus = 'not_configured';
        let emailStatus = 'not_configured';
        try {
          let integrations = {};
          try { integrations = JSON.parse(await readFile(join(dataDir, 'integrations.json'), 'utf8')); }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
          // Hosted deployments keep credentials in environment variables; local
          // development can continue using the private integrations.json file.
          const integration = integrations[body.clientId] || (
            body.clientId === process.env.RSVP_CLIENT_ID
              ? { url: process.env.GOOGLE_APPS_SCRIPT_URL, secret: process.env.GOOGLE_APPS_SCRIPT_SECRET }
              : null
          );
          if (integration?.url && integration?.secret) {
            const integrationUrl = new URL(integration.url);
            if (integrationUrl.protocol !== 'https:' || integrationUrl.hostname !== 'script.google.com') throw new Error('URL-ul Google Apps Script nu este valid.');
            const sheetResponse = await fetch(integration.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...record, secret: integration.secret, notificationEmails: integration.notificationEmails || [] }),
              signal: AbortSignal.timeout(15000)
            });
            const sheetResult = await sheetResponse.json();
            sheetStatus = sheetResponse.ok && sheetResult.sheetSaved ? 'sent' : 'failed';
            emailStatus = sheetResponse.ok && sheetResult.emailSent ? 'sent' : 'failed';
          }
        } catch (error) {
          sheetStatus = 'failed';
          emailStatus = 'failed';
          console.error('Nu am putut trimite răspunsul către Google Sheets/e-mail:', error.message);
        }

        if (sheetStatus !== 'sent') {
          if (tokenKey) claimedTokens.delete(tokenKey);
          const error = sheetStatus === 'not_configured'
            ? 'Confirmarea nu a fost salvată: Google Sheets nu este conectat încă.'
            : 'Nu am putut salva confirmarea în Google Sheets. Verifică datele și încearcă din nou.';
          res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error, sheetStatus, emailStatus }));
          return;
        }

        // Google Sheets is the source of truth; keep this local file as a best-effort backup.
        try {
          await mkdir(dataDir, { recursive: true });
          await appendFile(join(dataDir, 'rsvps.json'), `${JSON.stringify(record)}\n`, 'utf8');
        } catch (error) {
          console.error('Confirmarea este în Google Sheets, dar copia locală nu a putut fi scrisă:', error.message);
        }

        let lockStatus = 'not_required';
        if (tokenKey) {
          try { lockStatus = await markInviteeUsed(body.clientId, body.guestToken, record.receivedAt) ? 'locked' : 'failed'; }
          catch (error) { console.error('Nu am putut bloca linkul RSVP după salvarea în Google Sheets:', error.message); lockStatus = 'failed'; }
        }
        if (emailStatus !== 'sent') console.error(`RSVP salvat în Google Sheets pentru ${body.clientId}, dar e-mailul de notificare nu a fost trimis.`);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ ok: true, sheetStatus, emailStatus, lockStatus }));
      } catch (error) {
        res.writeHead(error.statusCode || 400, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: error.message || 'Cerere invalidă.' }));
      }
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  if (requested === '/data' || requested.startsWith('/data/')) { res.writeHead(404).end(); return; }
  const relative = requested === '/' ? 'index.html' : normalize(requested.slice(1));
  const file = join(root, relative);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pagina nu a fost găsită.'); }
});

server.listen(port, () => console.log(`Invitația rulează la http://localhost:${port}`));
