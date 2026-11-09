# Invitația Ana și Bogdan

Invitația este publicată din GitHub Pages. Confirmările RSVP sunt procesate de Google Apps Script, care salvează răspunsul în Google Sheets și trimite notificarea prin e-mail. Repository-ul păstrează codul complet, iar pagina publică primește numai fișierele necesare invitației.

## Publicare

1. Completează `rsvp.appsScriptUrl` în `clients/fam-vornicu.json` cu URL-ul Web App Apps Script, cel care se termină în `/exec`.
2. În repository-ul GitHub, deschide **Settings → Pages** și selectează **GitHub Actions** ca sursă de publicare.
3. Încarcă modificările pe branch-ul `main`. Workflow-ul din `.github/workflows/pages.yml` construiește folderul public `dist` cu invitația, fotografiile și fișierele UI. Codul Apps Script și fișierele private nu sunt publicate pe site.
4. Deschide fila **Actions** din GitHub și așteaptă ca „Publish wedding invitation” să se termine cu succes. Linkul apare apoi la **Settings → Pages**.

Linkul paginii va avea forma `https://cosmindrilea.github.io/nunta-ana-bogdan-29.05.2027/`.

## Configurarea RSVP

Fișierul `integrations/google-sheets/Code.gs` se copiază în proiectul Apps Script legat de foaia Anei și a lui Bogdan. Adaugă și fișierul HTML `RsvpBridge.html` din același folder. În Apps Script, publică o versiune Web App cu execuție în contul proprietarului și acces pentru oricine, apoi pune URL-ul `/exec` în `clients/fam-vornicu.json`.

Apps Script confirmă salvarea rândului înainte ca invitația să afișeze mulțumirea și să blocheze formularul în browserul folosit. Dacă trimiterea e-mailului eșuează, răspunsul rămâne salvat în Sheets, iar pagina afișează această diferență.

Nu publica `data/integrations.json` și nu pune cheia locală în fișierele publice. Workflow-ul Pages nu publică folderele `data`, `server` sau `integrations`.

## Rulare locală

Pentru previzualizarea locală, instalează Node.js 20 sau o versiune mai nouă și rulează `npm.cmd start`, apoi deschide `http://localhost:3000`. Serverul local este doar pentru dezvoltare; publicarea invitației folosește GitHub Pages și Apps Script.
