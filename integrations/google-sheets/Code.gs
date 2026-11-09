const WEBHOOK_SECRET = 'PASTE_THE_PRIVATE_SECRET_HERE';
const SPREADSHEET_ID = '1zL2dhbC81mZNMJh415Yf1Oabz0ZgMQ7Va-M0HZQFscQ';
const SHEET_NAME = 'Ana&Bogdan 29.05.2027';
const NOTIFICATION_EMAIL = 'bogdananavornicu@gmail.com';
const MENU_TYPES = ['Normal', 'Vegetarian', 'Vegan', 'Copii'];
const HEADERS = [
  'Nr. crt.', 'Nume și prenume', 'Data confirmării', 'Răspuns', 'Nr. persoane',
  'Meniu normal', 'Meniu vegetarian', 'Meniu vegan', 'Meniu copii',
  'Preferințe alimentare / alergii', 'Mesaj pentru miri', 'Observații'
];

function authorizeIntegrations() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Fila „' + SHEET_NAME + '” nu a fost găsită în foaia Google.');
  MailApp.getRemainingDailyQuota();
  return 'Scriptul poate accesa foaia și trimite e-mailuri.';
}

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

  const menuCounts = Object.fromEntries(MENU_TYPES.map(type => [type, 0]));
  (Array.isArray(data.menus) ? data.menus : []).forEach(type => {
    if (Object.prototype.hasOwnProperty.call(menuCounts, type)) menuCounts[type] += 1;
  });
  const confirmedAt = Utilities.formatDate(new Date(data.receivedAt), 'Europe/Bucharest', 'dd.MM.yyyy HH:mm:ss');
  let rowNumber = null;
  let sheetError = '';
  let emailSent = false;
  let emailError = '';

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('Fila „' + SHEET_NAME + '” nu a fost găsită.');
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
      rowNumber = Math.max(sheet.getLastRow(), 1);
      const row = [
        rowNumber, safeCell(data.name), confirmedAt, data.attending ? 'Participă' : 'Nu participă', Number(data.guests),
        menuCounts.Normal, menuCounts.Vegetarian, menuCounts.Vegan, menuCounts.Copii,
        safeCell(data.dietary), safeCell(data.message), ''
      ];
      sheet.appendRow(row);
      SpreadsheetApp.flush();
      const savedRow = sheet.getRange(sheet.getLastRow(), 1, 1, row.length).getValues()[0];
      if (savedRow[0] !== row[0] || savedRow[1] !== row[1] || savedRow[2] !== row[2]) {
        throw new Error('Google Sheets nu a confirmat salvarea rândului.');
      }
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    sheetError = error.message || 'Nu am putut scrie în tabel.';
    return json({ ok: false, sheetSaved: false, rowNumber, sheetError, emailSent: false, emailError: 'E-mailul nu a fost trimis deoarece răspunsul nu a fost salvat în Google Sheets.' });
  }

  try {
    const emailBody = [
      'A sosit o confirmare nouă pentru invitația de nuntă.', '',
      'Nr. crt.: ' + rowNumber,
      'Nume și prenume: ' + (data.name || ''),
      'Data confirmării: ' + confirmedAt,
      'Răspuns: ' + (data.attending ? 'Participă' : 'Nu participă'),
      'Număr persoane: ' + (Number(data.guests) || 0),
      'Meniu normal: ' + menuCounts.Normal,
      'Meniu vegetarian: ' + menuCounts.Vegetarian,
      'Meniu vegan: ' + menuCounts.Vegan,
      'Meniu copii: ' + menuCounts.Copii,
      'Preferințe alimentare / alergii: ' + (data.dietary || '—'),
      'Mesaj pentru miri: ' + (data.message || '—')
    ].join('\n');
    MailApp.sendEmail(NOTIFICATION_EMAIL, 'Confirmare RSVP nouă — ' + (data.name || 'invitat'), emailBody);
    emailSent = true;
  } catch (error) {
    emailError = error.message || 'Nu am putut trimite e-mailul.';
  }

  return json({ ok: true, sheetSaved: true, rowNumber, sheetError: '', emailSent, emailError });
}

function safeCell(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
