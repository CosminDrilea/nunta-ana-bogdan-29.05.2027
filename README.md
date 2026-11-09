# Invitația Ana și Bogdan

Invitație digitală pentru nunta Anei și a lui Bogdan, din 29 mai 2027. Proiectul este în curs de personalizare; locațiile și celelalte detalii care nu sunt stabilite încă vor fi completate ulterior.

## Pornire locală

Este necesar Node.js 20 sau o versiune mai nouă.

1. Deschide folderul proiectului în VS Code.
2. Deschide terminalul integrat și rulează `npm.cmd start`.
3. Deschide `http://localhost:3000` în browser.

## Personalizare

- Datele invitației sunt în `clients/fam-vornicu.json`.
- Fotografiile și melodia sunt în `assets`.
- Interfața este în `src` și `styles.css`.
- Funcțiile invitației, inclusiv RSVP-ul, sunt controlate din configurația clientului.

## RSVP

Formularul trimite răspunsurile către serverul proiectului. Pentru folosirea online, conectarea la Google Sheets și e-mail se configurează separat în setările private ale serviciului de găzduire. Cheile și datele de conectare nu se păstrează în repository.