import { showThankYou } from './thank-you.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function initRsvp(config, invitee = null) {
  const form = document.querySelector('[data-rsvp-form]');
  const count = form.querySelector('[data-guest-count]');
  const menus = form.querySelector('[data-menu-fields]');
  const status = form.querySelector('[data-form-status]');
  const localLockKey = `invitation-rsvp:${config.clientId}`;
  const previewLockKey = `invitation-rsvp-preview:${config.clientId}`;
  const isLocalSimulation = new URLSearchParams(location.search).get('preview') === 'rsvp'
    && ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!config.features.personalizedLinks) {
    try {
      if (localStorage.getItem(isLocalSimulation ? previewLockKey : localLockKey)) {
        showThankYou(config);
        return;
      }
    } catch {}
  }
  let menuTouched = false;
  const maxGuests = invitee?.maxGuests ?? config.rsvp.maxGuests;
  for (let i = 1; i <= maxGuests; i++) count.add(new Option(String(i), String(i)));
  if (invitee) {
    form.elements.name.value = invitee.name;
    form.elements.name.readOnly = true;
  }
  const drawMenus = () => {
    const attending = form.elements.attending.value === 'yes';
    menus.hidden = !attending || !config.features.menuCounts;
    if (!attending || !config.features.menuCounts) { menus.innerHTML = ''; return; }
    const guestCount = Number(count.value);
    menus.innerHTML = `${config.rsvp.menuOptions.map((option, index) => `<label>${escapeHtml(option)}<input type="number" name="menu_count_${index}" min="0" max="${guestCount}" step="1" value="0" required inputmode="numeric" aria-label="Număr meniuri ${escapeHtml(option)}" /></label>`).join('')}<p class="menu-total-status" data-menu-status role="status" aria-live="polite"></p>`;
    menuTouched = false;
    menus.querySelectorAll('input[type="number"]').forEach(input => input.addEventListener('input', () => { menuTouched = true; validateMenuCounts(); }));
    validateMenuCounts();
  };
  function validateMenuCounts() {
    if (menus.hidden) return true;
    const total = [...menus.querySelectorAll('input[type="number"]')].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    const guestCount = Number(count.value);
    const message = menus.querySelector('[data-menu-status]');
    if (!message) return true;
    const valid = total === guestCount;
    message.textContent = valid || !menuTouched ? '' : `Ai ales ${total} meniuri pentru ${guestCount} persoane. Totalul meniurilor trebuie să fie egal cu numărul de persoane.`;
    message.classList.toggle('is-error', !valid);
    return valid;
  }
  count.addEventListener('change', drawMenus);
  form.elements.attending.addEventListener('change', drawMenus);
  drawMenus();
  form.addEventListener('invalid', event => {
    const field = event.target;
    const messages = { name: 'Te rugăm să completezi numele.', guests: 'Selectează numărul de persoane.', attending: 'Alege dacă participați.' };
    const message = messages[field.name] || (field.name.startsWith('menu_count_') ? 'Introdu un număr valid pentru fiecare tip de meniu.' : 'Verifică acest câmp.');
    field.setCustomValidity(message);
    status.textContent = message;
  }, true);
  form.addEventListener('input', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    status.textContent = '';
  });
  form.addEventListener('change', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    status.textContent = '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    menuTouched = true;
    if (form.elements.attending.value === 'yes' && config.features.menuCounts && !validateMenuCounts()) {
      status.textContent = 'Corectează numărul meniurilor înainte de trimitere.';
      return;
    }
    if (isLocalSimulation) {
      try { localStorage.setItem(previewLockKey, 'submitted'); } catch {}
      showThankYou(config);
      return;
    }
    const data = new FormData(form);
    const payload = { clientId: config.clientId, guestToken: new URLSearchParams(location.search).get('guest') || '', name: data.get('name').trim(), guests: Number(data.get('guests')), attending: data.get('attending') === 'yes', menus: [], dietary: data.get('dietary')?.trim() || '', message: data.get('message').trim() };
    if (payload.attending && config.features.menuCounts) {
      config.rsvp.menuOptions.forEach((option, index) => {
        const quantity = Number(data.get(`menu_count_${index}`)) || 0;
        for (let i = 0; i < quantity; i++) payload.menus.push(option);
      });
    }
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; status.textContent = 'Se trimite…';
    try {
      const response = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nu am putut trimite răspunsul.');
      if (result.sheetStatus !== 'sent') {
        throw new Error(result.error || 'Confirmarea nu a fost salvată în Google Sheets. Încearcă din nou.');
      }
      status.textContent = result.emailStatus === 'sent'
        ? 'Confirmarea a fost trimisă. Vă mulțumim pentru răspunsul vostru.'
        : 'Răspunsul a fost înregistrat, dar notificarea către miri nu a putut fi trimisă.';
      if (config.features.personalizedLinks) {
        showThankYou(config);
      } else {
        try { localStorage.setItem(localLockKey, 'submitted'); } catch {}
        showThankYou(config);
      }
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? 'Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou.'
        : error.message;
    }
    finally { button.disabled = false; }
  });
}
