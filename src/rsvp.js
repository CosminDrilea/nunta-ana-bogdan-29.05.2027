import { showThankYou } from './thank-you.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function initRsvp(config, invitee = null) {
  const form = document.querySelector('[data-rsvp-form]');
  const count = form.querySelector('[data-guest-count]');
  const menus = form.querySelector('[data-menu-fields]');
  const status = form.querySelector('[data-form-status]');
  const bridge = document.querySelector('[data-rsvp-bridge]');
  const isLocalServer = ['localhost', '127.0.0.1'].includes(location.hostname);
  const appsScriptUrl = config.rsvp.appsScriptUrl?.trim() || '';
  let bridgeReadyResolve;
  const bridgeReady = new Promise(resolve => { bridgeReadyResolve = resolve; });
  const bridgeResponses = new Map();
  if (!isLocalServer && bridge && appsScriptUrl) {
    window.addEventListener('message', event => {
      if (event.source !== bridge.contentWindow || !event.data) return;
      if (event.data.type === 'rsvp-bridge-ready') {
        bridgeReadyResolve();
      } else if (event.data.type === 'rsvp-result') {
        bridgeResponses.get(event.data.requestId)?.(event.data.result);
        bridgeResponses.delete(event.data.requestId);
      }
    });
    bridge.src = appsScriptUrl;
  }
  const sendRsvp = async payload => {
    if (isLocalServer) {
      const response = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nu am putut trimite răspunsul.');
      return result;
    }
    if (!appsScriptUrl || !bridge) throw new Error('Formularul de confirmare nu este conectat încă.');
    await Promise.race([
      bridgeReady,
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('Nu am putut conecta formularul. Încearcă din nou mai târziu.')), 20000))
    ]);
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const response = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        bridgeResponses.delete(requestId);
        reject(new Error('Nu am primit confirmarea salvării. Verifică dacă răspunsul a fost înregistrat înainte să încerci din nou.'));
      }, 20000);
      bridgeResponses.set(requestId, result => { window.clearTimeout(timer); resolve(result); });
    });
    bridge.contentWindow.postMessage({ type: 'rsvp-submit', requestId, payload }, '*');
    return response;
  };
  const localLockKey = `invitation-rsvp:${config.clientId}`;
  const previewLockKey = `invitation-rsvp-preview:${config.clientId}`;
  const isLocalSimulation = new URLSearchParams(location.search).get('preview') === 'rsvp'
    && ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!config.features.personalizedLinks) {
    try {
      const savedState = localStorage.getItem(isLocalSimulation ? previewLockKey : localLockKey);
      if (savedState) {
        let emailSent = null;
        try { emailSent = JSON.parse(savedState).emailSent ?? null; } catch {}
        showThankYou(config, emailSent);
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
  const formStartedAt = Date.now();
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
    const payload = { clientId: config.clientId, guestToken: new URLSearchParams(location.search).get('guest') || '', name: data.get('name').trim(), guests: Number(data.get('guests')), attending: data.get('attending') === 'yes', menus: [], dietary: data.get('dietary')?.trim() || '', message: data.get('message').trim(), website: data.get('website') || '', formStartedAt };
    if (payload.attending && config.features.menuCounts) {
      config.rsvp.menuOptions.forEach((option, index) => {
        const quantity = Number(data.get(`menu_count_${index}`)) || 0;
        for (let i = 0; i < quantity; i++) payload.menus.push(option);
      });
    }
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; status.textContent = 'Se trimite…';
    try {
      const result = await sendRsvp(payload);
      if (!result.ok) throw new Error(result.error || 'Nu am putut trimite răspunsul.');
      if (result.sheetSaved !== true && result.sheetStatus !== 'sent') {
        throw new Error(result.error || 'Confirmarea nu a fost salvată în Google Sheets. Încearcă din nou.');
      }
      const emailSent = result.emailSent === true || result.emailStatus === 'sent';
      status.textContent = emailSent
        ? 'Confirmarea a fost trimisă. Vă mulțumim pentru răspunsul vostru.'
        : 'Răspunsul a fost înregistrat, dar notificarea către miri nu a putut fi trimisă.';
      if (config.features.personalizedLinks) {
        showThankYou(config, emailSent);
      } else {
        try { localStorage.setItem(localLockKey, JSON.stringify({ submitted: true, emailSent })); } catch {}
        showThankYou(config, emailSent);
      }
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? 'Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou.'
        : error.message;
    }
    finally { button.disabled = false; }
  });
}
