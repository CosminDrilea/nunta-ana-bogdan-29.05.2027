# Integrarea RSVP Ana și Bogdan

Scriptul adaugă fiecare răspuns în foaia Google **Ana&Bogdan 29.05.2027** și trimite detaliile la `bogdananavornicu@gmail.com`. Notificarea pleacă numai după ce scriptul confirmă că rândul a fost salvat în foaie.

## Configurare simplă în Apps Script

1. Deschide foaia **Ana&Bogdan 29.05.2027**, apoi mergi la **Extensii → Apps Script**.
2. Înlocuiește conținutul `Code.gs` cu fișierul local `integrations/google-sheets/Code.gs`.
3. Înlocuiește manifestul `appsscript.json` cu cel local din `integrations/google-sheets/appsscript.json`.
4. Pune în `WEBHOOK_SECRET` valoarea privată `secret` din `data/integrations.json`, pentru clientul `fam-vornicu`. Păstrează aceeași valoare în ambele locuri și nu o pune în linkul invitației sau în GitHub.
5. Salvează și rulează `authorizeIntegrations`. Google va cere două permisiuni: **citirea și modificarea foilor Google din cont** și **trimiterea e-mailurilor din contul conectat**. Prima permisiune este largă și poate permite scriptului să acceseze orice foaie din cont. Aprob-o doar dacă accepți acest nivel de acces.
6. După autorizare, publică **Deploy → New deployment → Web app**, executare ca proprietarul scriptului și acces „Anyone”. Acesta este un endpoint public; secretul trebuie să rămână privat. Înainte de publicare, verifică setările și codul.
7. Copiază URL-ul care se termină în `/exec` în `data/integrations.json`, la `fam-vornicu.url`, apoi repornește serverul invitației.

Nu considera RSVP-ul activ până când o confirmare de probă apare în foaie și sosește e-mailul. Proba adaugă un rând real; folosește un nume de test clar și șterge rândul după verificare dacă dorești.

## Accesul clientului la tabel

După ce verifici integrarea, apasă **Distribuie**, introdu adresa Google a clientului și alege rolul **Cititor** dacă dorește doar să consulte și să descarce tabelul pentru Excel. Clientul deschide invitația din e-mail fiind conectat la contul lui Google. Nu îi da parola contului tău și nu publica foaia cu acces „oricine are linkul”.

## Coloanele foii

Nr. crt. · Nume și prenume · Data confirmării · Răspuns · Nr. persoane · Meniu normal · Meniu vegetarian · Meniu vegan · Meniu copii · Preferințe alimentare / alergii · Mesaj pentru miri · Observații.
