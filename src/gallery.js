export function initGallery() {
  const grid = document.querySelector('[data-gallery]');
  const viewport = grid?.closest('.gallery__viewport');
  const dialog = document.querySelector('[data-gallery-lightbox]');
  const enlargedImage = document.querySelector('[data-gallery-lightbox-image]');
  const counter = document.querySelector('[data-gallery-counter]');
  const previousButton = document.querySelector('[data-gallery-prev]');
  const nextButton = document.querySelector('[data-gallery-next]');
  const lightboxPrevious = document.querySelector('[data-lightbox-prev]');
  const lightboxNext = document.querySelector('[data-lightbox-next]');
  const closeButton = document.querySelector('[data-gallery-close]');
  if (!grid || !viewport || !dialog || !enlargedImage) return;

  const items = [...grid.querySelectorAll('.gallery__item')];
  if (!items.length) return;

  let carouselIndex = 0;
  let photoIndex = 0;
  let savedScrollY = 0;
  let autoTimer = null;
  let inView = false;
  let paused = false;

  const visibleCount = () => window.matchMedia('(max-width: 580px)').matches ? 1
    : window.matchMedia('(max-width: 850px)').matches ? 2 : 3;

  function updateCarousel() {
    const maxIndex = Math.max(0, items.length - visibleCount());
    carouselIndex = Math.min(carouselIndex, maxIndex);
    const itemWidth = items[0].getBoundingClientRect().width;
    const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
    grid.style.transform = `translate3d(${-carouselIndex * (itemWidth + gap)}px, 0, 0)`;
    if (previousButton) previousButton.disabled = maxIndex === 0;
    if (nextButton) nextButton.disabled = maxIndex === 0;
    syncAutoplay();
  }

  function moveCarousel(direction) {
    const maxIndex = Math.max(0, items.length - visibleCount());
    if (!maxIndex) return;
    carouselIndex = direction > 0
      ? (carouselIndex >= maxIndex ? 0 : carouselIndex + 1)
      : (carouselIndex <= 0 ? maxIndex : carouselIndex - 1);
    updateCarousel();
  }

  function stopAutoplay() {
    if (autoTimer) window.clearInterval(autoTimer);
    autoTimer = null;
  }

  function syncAutoplay() {
    const hasHiddenPhotos = items.length > visibleCount();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (inView && !paused && hasHiddenPhotos && !reducedMotion && !autoTimer) {
      autoTimer = window.setInterval(() => moveCarousel(1), 4200);
    } else if ((!inView || paused || !hasHiddenPhotos || reducedMotion) && autoTimer) {
      stopAutoplay();
    }
  }

  function showPhoto(index) {
    photoIndex = (index + items.length) % items.length;
    const image = items[photoIndex].querySelector('img');
    if (!image) return;
    enlargedImage.src = image.currentSrc || image.src;
    enlargedImage.alt = image.alt;
    if (counter) counter.textContent = `${photoIndex + 1} / ${items.length}`;
  }

  function openPhoto(index) {
    savedScrollY = window.scrollY;
    paused = true;
    stopAutoplay();
    showPhoto(index);
    dialog.showModal();
    closeButton?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
  }

  function closePhoto() {
    if (dialog.open) dialog.close();
    window.requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('.gallery__zoom');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openPhoto(items.indexOf(button.closest('.gallery__item')));
  });
  previousButton?.addEventListener('click', () => moveCarousel(-1));
  nextButton?.addEventListener('click', () => moveCarousel(1));
  lightboxPrevious?.addEventListener('click', () => showPhoto(photoIndex - 1));
  lightboxNext?.addEventListener('click', () => showPhoto(photoIndex + 1));
  closeButton?.addEventListener('click', closePhoto);
  dialog.addEventListener('click', event => { if (event.target === dialog) closePhoto(); });
  dialog.addEventListener('close', () => {
    paused = false;
    syncAutoplay();
    window.requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
  });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowRight') showPhoto(photoIndex + 1);
    if (event.key === 'ArrowLeft') showPhoto(photoIndex - 1);
  });

  const carousel = grid.closest('.gallery__carousel');
  carousel?.addEventListener('focusin', () => { paused = true; stopAutoplay(); });
  carousel?.addEventListener('focusout', event => {
    if (!carousel.contains(event.relatedTarget)) { paused = false; syncAutoplay(); }
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncAutoplay();
    }, { threshold: 0.25 });
    observer.observe(carousel || viewport);
  }
  window.addEventListener('resize', updateCarousel);
  updateCarousel();
}
