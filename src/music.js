export function initMusic(music) {
  if (!music.src) return;
  const audio = document.querySelector('[data-music]'); const toggle = document.querySelector('[data-music-toggle]');
  audio.src = music.src; toggle.hidden = false; toggle.setAttribute('aria-label', music.label);
  const startPlayback = async () => {
    try {
      await audio.play();
      toggle.classList.add('is-playing');
      toggle.title = 'Oprește muzica';
      toggle.setAttribute('aria-label', 'Oprește muzica');
    } catch {
      toggle.title = 'Atinge pentru a porni muzica';
      toggle.setAttribute('aria-label', 'Pornește muzica');
    }
  };
  audio.addEventListener('pause', () => {
    toggle.classList.remove('is-playing');
    toggle.title = 'Pornește muzica';
    toggle.setAttribute('aria-label', 'Pornește muzica');
  });
  toggle.addEventListener('click', async () => {
    if (audio.paused) await startPlayback();
    else audio.pause();
  });
  // Încercarea de redare automată funcționează doar în browserele care o permit.
  // Dacă browserul o blochează, butonul fix rămâne disponibil pentru pornire manuală.
  startPlayback();
}
