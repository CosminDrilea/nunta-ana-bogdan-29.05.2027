const danceInviteText = config => {
  const time = config.gift.danceTime?.trim();
  return `Vă rugăm să fiți alături de noi la dansul mirilor${time ? ` – ora ${time}` : ''}, un moment special pe care dorim să îl trăim împreună cu voi.`;
};

export function showThankYou(config) {
  const layout = document.querySelector('.rsvp__layout');
  const panel = document.querySelector('[data-thank-you]');
  if (!layout || !panel) return;
  layout.hidden = true;
  panel.hidden = false;

  const deadline = document.querySelector('[data-thank-deadline]');
  const deadlineText = config.event.rsvpDeadline?.trim();
  if (deadline && deadlineText && !/^(data stabilită|nespecificată|—)$/i.test(deadlineText)) {
    deadline.textContent = `Confirmare până pe data de ${deadlineText}`;
    deadline.hidden = false;
  }

  const dance = document.querySelector('[data-thank-dance]');
  if (dance) {
    dance.textContent = danceInviteText(config);
    dance.hidden = !config.features.gift;
  }
}
