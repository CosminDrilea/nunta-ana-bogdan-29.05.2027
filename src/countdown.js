export function initCountdown(target) {
  const date = new Date(target);
  const units = document.querySelector('[data-countdown]');
  if (!target || Number.isNaN(date.getTime())) {
    units.hidden = true;
    const note = document.createElement('p');
    note.className = 'countdown__placeholder';
    note.textContent = 'Completează data evenimentului pentru a activa numărătoarea inversă.';
    units.parentElement.append(note);
    return;
  }
  const update = () => {
    const remaining = Math.max(0, date.getTime() - Date.now());
    const values = { days: Math.floor(remaining / 86400000), hours: Math.floor(remaining / 3600000) % 24, minutes: Math.floor(remaining / 60000) % 60, seconds: Math.floor(remaining / 1000) % 60 };
    Object.entries(values).forEach(([key, value]) => { const node = document.querySelector(`[data-time="${key}"]`); if (node) node.textContent = String(value).padStart(2, '0'); });
  };
  update(); setInterval(update, 1000);
}
