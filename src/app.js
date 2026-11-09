import { config } from './config.js';
import { renderInvitation } from './render.js';
import { initCountdown } from './countdown.js';
import { initRsvp } from './rsvp.js';
import { initMusic } from './music.js';
import { initCalendar } from './calendar.js';
import { initShare } from './share.js';
import { showThankYou } from './thank-you.js';
import { initGallery } from './gallery.js';

document.documentElement.style.setProperty('--paper', config.theme.background);
document.documentElement.style.setProperty('--ink', config.theme.ink);
document.documentElement.style.setProperty('--accent', config.theme.accent);
const isLocalRsvpPreview = new URLSearchParams(location.search).get('preview') === 'rsvp'
  && ['localhost', '127.0.0.1'].includes(location.hostname);
if (isLocalRsvpPreview) document.querySelector('[data-preview-note]')?.removeAttribute('hidden');
renderInvitation(config);
if (config.features.gallery) initGallery();
if (config.features.countdown) initCountdown(config.event.date);
if (config.features.rsvp) {
  let invitee = null;
  const guestToken = new URLSearchParams(location.search).get('guest');
  if (config.features.personalizedLinks) {
    const guestMessage = document.querySelector('[data-guest-message]');
    const form = document.querySelector('[data-rsvp-form]');
    if (!guestToken) {
      form.hidden = true;
      guestMessage.textContent = 'Pentru confirmare, deschide linkul personal primit împreună cu invitația.';
    } else {
      try {
        const response = await fetch(`/api/invite?client=${encodeURIComponent(config.clientId)}&token=${encodeURIComponent(guestToken)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Linkul invitației nu este valid.');
        invitee = result.invitee;
        if (result.alreadySubmitted) {
          showThankYou(config);
        } else {
          guestMessage.textContent = `Poți confirma pentru maximum ${config.rsvp.maxGuests} persoane.`;
        }
      } catch (error) {
        form.hidden = true;
        guestMessage.textContent = error.message;
      }
    }
  }
  initRsvp(config, invitee);
  if (new URLSearchParams(location.search).get('preview') === 'thank-you') {
    showThankYou(config);
  }
}
if (config.features.music) initMusic(config.music);
if (config.features.calendar) initCalendar(config);
if (config.features.share) initShare(config);
