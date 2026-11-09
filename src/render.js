const $ = (selector, root = document) => root.querySelector(selector);
const text = (selector, value) => { const node = $(selector); if (node && value != null) node.textContent = value; };
const fontStacks = {
  'DM Sans': "'DM Sans', Arial, sans-serif",
  'Montserrat': "'Montserrat', Arial, sans-serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
  'Cormorant Garamond': "'Cormorant Garamond', Georgia, serif",
  'Lora': "'Lora', Georgia, serif",
  'Georgia': 'Georgia, serif',
  'Arial': 'Arial, sans-serif'
};
export function renderInvitation(c) {
  document.title = c.event.pageTitle;
  text('[data-couple-names]', `${c.couple.firstNameA} & ${c.couple.firstNameB}`);
  document.querySelectorAll('[data-couple-initials]').forEach(node => {
    const separator = document.createElement('span');
    separator.textContent = '·';
    node.replaceChildren(
      document.createTextNode(c.couple.initialA),
      separator,
      document.createTextNode(c.couple.initialB)
    );
  });
  text('[data-copy="hero.dateLabel"]', c.event.dateLabel);
  const eventDate = c.event.date ? new Date(c.event.date).toLocaleDateString('ro-RO') : c.event.dateLabel;
  text('[data-footer]', `Cu drag, ${c.couple.firstNameA} & ${c.couple.firstNameB} · ${eventDate}`);
  text('[data-copyright]', c.footer?.copyright || '© Design și concept · Cosmin Drilea');
  const giftDetails = $('[data-copy="gift.details"]');
  if (giftDetails) giftDetails.hidden = !c.gift?.details?.trim();
  document.documentElement.style.setProperty('--hero-image', `url("${c.theme.heroImage}")`);
  if (c.theme.heroPosition) document.documentElement.style.setProperty('--hero-position', c.theme.heroPosition);
  const fonts = c.theme.fonts || {};
  document.documentElement.style.setProperty('--font-body', fontStacks[fonts.body] || fontStacks['DM Sans']);
  document.documentElement.style.setProperty('--font-heading', fontStacks[fonts.display] || fontStacks['Playfair Display']);
  document.querySelectorAll('[data-copy]').forEach(node => {
    const value = c[node.dataset.copy.split('.')[0]]?.[node.dataset.copy.split('.')[1]];
    if (value != null) node.innerHTML = value;
  });
  const phone = $('[data-contact-phone]');
  if (phone && c.details?.contactPhone) {
    phone.href = `tel:${c.details.contactPhone.replace(/[^+\d]/g, '')}`;
  }
  for (const [key, buttonConfig] of Object.entries(c.buttons || {})) {
    const button = document.querySelector(`[data-cta="${key}"]`);
    if (!button) continue;
    const label = button?.querySelector('[data-cta-label]');
    if (buttonConfig.label && label) label.textContent = buttonConfig.label;
    if (buttonConfig.target && /^#[\w-]+$/.test(buttonConfig.target)) {
      button.href = buttonConfig.target;
      const targetSection = document.querySelector(buttonConfig.target)?.closest('[data-section]');
      button.hidden = Boolean(targetSection && !c.features[targetSection.dataset.section]);
    }
  }
  const setCallLink = (selector, phoneNumber) => {
    const link = $(selector);
    if (!link) return;
    const phoneValue = String(phoneNumber || '').replace(/[^+\d]/g, '');
    if (phoneValue.replace(/\D/g, '').length >= 7) {
      link.href = `tel:${phoneValue}`;
      link.removeAttribute('aria-disabled');
    } else {
      link.href = '#';
      link.setAttribute('aria-disabled', 'true');
    }
  };
  setCallLink('[data-call-bride]', c.details?.bridePhone);
  setCallLink('[data-call-groom]', c.details?.groomPhone);
  const danceInvite = $('[data-dance-invite]');
  if (danceInvite) {
    const time = c.gift.danceTime?.trim();
    danceInvite.textContent = `Vă rugăm să fiți alături de noi la dansul mirilor${time ? ` – ora ${time}` : ''}, un moment special pe care dorim să îl trăim împreună cu voi.`;
  }
  document.querySelectorAll('[data-section]').forEach(section => {
    const sectionId = section.dataset.section;
    const background = c.theme.sectionBackgrounds?.[sectionId];
    if (background) section.style.backgroundColor = background;
    const image = c.theme.sectionImages?.[sectionId];
    if (image) {
      section.style.setProperty('--section-image', `url("${String(image).replaceAll('"', '\\"')}")`);
      const overlay = c.theme.sectionImageOverlays?.[sectionId];
      if (overlay) section.style.setProperty('--section-image-overlay', overlay);
      section.classList.add('has-background-image');
    }
    if (!c.features[sectionId]) section.hidden = true;
  });
  const events = $('[data-events]');
  events.innerHTML = c.events.map((event, index) => `<article class="event"><span class="event__number">0${index + 1}</span><span class="event__time">${event.time}</span><div><h3>${event.title}</h3><p>${event.venue}</p><small>${event.address}</small></div>${c.features.maps && event.mapUrl ? `<a class="map-link" href="${event.mapUrl}" target="_blank" rel="noreferrer">Deschide harta ↗</a>` : ''}</article>`).join('');
  const gallery = $('[data-gallery]');
  if (gallery && c.features.gallery) gallery.innerHTML = c.gallery.map((src, i) => `<figure class="gallery__item gallery__item--${i + 1}"><button class="gallery__zoom" type="button" aria-label="Mărește fotografia ${i + 1}"><img src="${src}" alt="Fotografie ${i + 1} cu mirii" loading="lazy" /></button></figure>`).join('');
  if (!c.features.menuCounts) $('[data-menu-fields]')?.remove();
  if (!c.features.menuCounts) document.querySelector('[name="attending"]')?.closest('.form-row')?.classList.add('form-row--single');
  if (!c.features.dietaryNeeds) $('[data-dietary-field]')?.remove();
}
