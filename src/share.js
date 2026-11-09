export function initShare(config) {
  const button = document.querySelector('[data-share]');
  const status = document.querySelector('[data-share-status]');
  if (config.features.personalizedLinks) return;
  const link = new URL(window.location.href);
  link.searchParams.set('client', config.clientId);
  link.hash = '';
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: config.event.pageTitle, text: `Invitație la nunta ${config.couple.firstNameA} & ${config.couple.firstNameB}`, url: link.href });
        status.textContent = 'Invitația a fost distribuită.';
        return;
      }
      await navigator.clipboard.writeText(link.href);
      status.textContent = 'Linkul invitației a fost copiat.';
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = `Copiază acest link: ${link.href}`;
    }
  });
}
