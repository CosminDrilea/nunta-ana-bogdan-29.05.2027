# Integrarea RSVP Ana și Bogdan

Scriptul adaugă confirmările în foaia **Ana&Bogdan 29.05.2027** și trimite notificările la `bogdananavornicu@gmail.com`. Mesajul de succes din invitație apare numai după ce Apps Script confirmă că rândul a fost salvat.

## Configurare în Apps Script

1. Deschide foaia **Ana&Bogdan 29.05.2027**, apoi mergi la **Extensii → Apps Script**.
2. Înlocuiește conținutul `Code.gs` cu fișierul local `integrations/google-sheets/Code.gs`.
3. Adaugă un fișier HTML nou numit `RsvpBridge` și copiază în el conținutul `integrations/google-sheets/RsvpBridge.html`.
4. Rulează `authorizeIntegrations` și aprobă accesul cerut pentru foaie și trimiterea e-mailurilor.
5. Publică scriptul ca Web App, cu execuție în contul proprietarului și acces „Anyone”. Copiază URL-ul care se termină în `/exec`.
6. Pune acel URL în `appsScriptUrl` din `clients/fam-vornicu.json`, apoi încarcă modificarea pe branch-ul `main`.
7. Dacă actualizezi codul Apps Script, actualizează și deployment-ul cu o versiune nouă.

Cheia locală `WEBHOOK_SECRET` este folosită doar de serverul local. Pagina GitHub Pages nu primește această cheie. Păstrează repository-ul privat dacă în el se află cod cu identificatorul foii sau adresa de notificare.

## Coloanele foii

Nr. crt. · Nume și prenume · Data confirmării · Răspuns · Nr. persoane · Meniu normal · Meniu vegetarian · Meniu vegan · Meniu copii · Preferințe alimentare / alergii · Mesaj pentru miri · Observații.
