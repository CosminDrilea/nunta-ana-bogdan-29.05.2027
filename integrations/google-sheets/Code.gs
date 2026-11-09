const WEBHOOK_SECRET = 'PASTE_THE_PRIVATE_SECRET_HERE';
const SPREADSHEET_ID = '1zL2dhbC81mZNMJh415Yf1Oabz0ZgMQ7Va-M0HZQFscQ';
const SHEET_NAME = 'Ana&Bogdan 29.05.2027';
const NOTIFICATION_EMAIL = 'bogdananavornicu@gmail.com';
const MENU_TYPES = ['Normal', 'Vegetarian', 'Vegan', 'Copii'];
const MAX_GUESTS = 6;
const HEADERS = [
  'Nr. crt.', 'Nume și prenume', 'Data confirmării', 'Răspuns', 'Nr. persoane',
  'Meniu normal', 'Meniu vegetarian', 'Meniu vegan', 'Meniu copii',
  'Preferințe alimentare / alergii', 'Mesaj pentru miri', 'Observații'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('RsvpBridge')
    .setTitle('Confirmare RSVP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function authorizeIntegrations() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Fila „' + SHEET_NAME + '” nu a fost găsită în foaia Google.');
  MailApp.getRemainingDailyQuota();
  return 'Scriptul poate accesa foaia și trimite e-mailuri.';
}

// Folosit de serverul local. Secretul nu este inclus în pagina GitHub Pages.
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
    if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'PASTE_THE_PRIVATE_SECRET_HERE' || data.secret !== WEBHOOK_SECRET) {
      return json({ ok: false, error: 'Secret nevalid.' });
    }
  } catch (error) {
    return json({ ok: false, error: 'Cererea nu conține date JSON valide.' });
  }
  return json(processRsvp_(data));
}

// Apelată din pagina iframe Apps Script, după verificarea originii în RsvpBridge.html.
function submitRsvpFromBridge(data) {
  return processRsvp_(data);
}

function processRsvp_(data) {
  const validation = validateRsvp_(data);
  if (validation) return { ok: false, sheetSaved: false, emailSent: false, error: validation };

  const menuCounts = Object.fromEntries(MENU_TYPES.map(type => [type, 0]));
  data.menus.forEach(type => { menuCounts[type] += 1; });
  const receivedAt = new Date();
  const confirmedAt = Utilities.formatDate(receivedAt, 'Europe/Bucharest', 'dd.MM.yyyy HH:mm:ss');
  let rowNumber;

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('Fila „' + SHEET_NAME + '” nu a fost găsită.');
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
      rowNumber = sheet.getLastRow() + 1;
      const row = [
        rowNumber, safeCell(data.name.trim()), confirmedAt, data.attending ? 'Participă' : 'Nu participă', Number(data.guests),
        menuCounts.Normal, menuCounts.Vegetarian, menuCounts.Vegan, menuCounts.Copii,
        safeCell(data.dietary || ''), safeCell(data.message || ''), ''
      ];
      sheet.appendRow(row);
      SpreadsheetApp.flush();
      const savedRow = sheet.getRange(rowNumber, 1, 1, row.length).getValues()[0];
      if (savedRow[0] !== rowNumber || savedRow[1] !== safeCell(data.name.trim()) || savedRow[2] !== confirmedAt) {
        throw new Error('Google Sheets nu a confirmat salvarea rândului.');
      }
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { ok: false, sheetSaved: false, emailSent: false, error: error.message || 'Nu am putut scrie în tabel.' };
  }

  let emailSent = false;
  let emailError = '';
  try {
    const emailBody = [
      'A sosit o confirmare nouă pentru invitația de nuntă.', '',
      'Nr. crt.: ' + rowNumber,
      'Nume și prenume: ' + data.name.trim(),
      'Data confirmării: ' + confirmedAt,
      'Răspuns: ' + (data.attending ? 'Participă' : 'Nu participă'),
      'Număr persoane: ' + Number(data.guests),
      'Meniu normal: ' + menuCounts.Normal,
      'Meniu vegetarian: ' + menuCounts.Vegetarian,
      'Meniu vegan: ' + menuCounts.Vegan,
      'Meniu copii: ' + menuCounts.Copii,
      'Preferințe alimentare / alergii: ' + (data.dietary || '—'),
      'Mesaj pentru miri: ' + (data.message || '—')
    ].join('\n');
    MailApp.sendEmail(NOTIFICATION_EMAIL, 'Confirmare RSVP nouă — ' + data.name.trim(), emailBody);
    emailSent = true;
  } catch (error) {
    emailError = error.message || 'Nu am putut trimite e-mailul.';
  }

  return { ok: true, sheetSaved: true, rowNumber, emailSent, emailError };
}

function validateRsvp_(data) {
  if (!data || data.clientId !== 'fam-vornicu') return 'Invitația nu a fost identificată corect.';
  if (data.website) return 'Cerere invalidă.';
  const elapsed = Date.now() - Number(data.formStartedAt);
  if (!Number.isFinite(elapsed) || elapsed < 1500 || elapsed > 3600000) return 'Formularul a expirat. Reîncarcă invitația și încearcă din nou.';
  if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120) return 'Introdu un nume valid.';
  if (!Number.isInteger(Number(data.guests)) || Number(data.guests) < 1 || Number(data.guests) > MAX_GUESTS) return 'Numărul de persoane nu este valid.';
  if (typeof data.attending !== 'boolean') return 'Alege dacă participați.';
  if (typeof data.dietary !== 'string' || data.dietary.length > 500) return 'Preferințele alimentare sunt prea lungi.';
  if (typeof data.message !== 'string' || data.message.length > 1000) return 'Mesajul este prea lung.';
  if (!Array.isArray(data.menus) || data.menus.some(type => !MENU_TYPES.includes(type))) return 'Opțiunile de meniu nu sunt valide.';
  if (data.attending && data.menus.length !== Number(data.guests)) return 'Numărul meniurilor trebuie să fie egal cu numărul persoanelor.';
  if (!data.attending && data.menus.length) return 'Nu sunt necesare meniuri pentru acest răspuns.';
  return '';
}

function safeCell(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
