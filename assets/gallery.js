(() => {
  const viewer = document.querySelector('.image-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  const figures = Array.from(document.querySelectorAll('.project-figure'));
  const image = viewer.querySelector('img');
  const caption = viewer.querySelector('.viewer-caption');
  const count = viewer.querySelector('.viewer-count');
  const previous = viewer.querySelector('.viewer-prev');
  const next = viewer.querySelector('.viewer-next');
  let group = [];
  let position = 0;
  let opener;
  let readingOffset;
  let closing = false;

  function show(figure) {
    const gallery = figure.closest('.project-gallery');
    group = gallery ? Array.from(gallery.querySelectorAll('.project-figure')) : [figure];
    position = group.indexOf(figure);
    const thumbnail = figure.querySelector('img');
    image.alt = thumbnail.alt;
    image.src = figure.querySelector('a').href;
    caption.replaceChildren(figure.querySelector('.figure-caption').cloneNode(true));
    caption.scrollTop = 0;
    count.textContent = (position + 1) + ' of ' + group.length;
    previous.hidden = next.hidden = group.length < 2;
    if (!viewer.open) {
      readingOffset = window.scrollY;
      viewer.showModal();
    }
  }

  // Opening creates one history entry. Changing images reuses it, so Back
  // always returns directly to the project, including after several images.
  function syncWithHistory() {
    closing = false;
    const index = history.state?.projectImage;
    if (Number.isInteger(index) && figures[index]) {
      opener ??= figures[index].querySelector('a');
      show(figures[index]);
    } else if (viewer.open) {
      viewer.close();
      opener?.focus({preventScroll: true});
      window.scrollTo({top: readingOffset, behavior: 'instant'});
    }
  }

  for (const [index, figure] of figures.entries()) {
    for (const link of figure.querySelectorAll('a')) {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        history.pushState({...history.state, projectImage: index}, '');
        event.preventDefault();
        opener = link;
        show(figure);
      });
    }
  }

  function step(direction) {
    if (closing || group.length < 2) return;
    const figure = group[(position + direction + group.length) % group.length];
    history.replaceState({...history.state, projectImage: figures.indexOf(figure)}, '');
    show(figure);
  }

  function closeViewer() {
    if (closing) return;
    closing = true;
    history.back();
  }

  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  viewer.querySelector('.viewer-close').addEventListener('click', closeViewer);
  viewer.addEventListener('click', event => {
    if (event.target === viewer) closeViewer();
  });
  viewer.addEventListener('cancel', event => {
    event.preventDefault();
    closeViewer();
  });
  viewer.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  const stage = viewer.querySelector('.viewer-stage');
  let start;
  stage.addEventListener('touchstart', event => {
    start = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive: true});
  stage.addEventListener('touchcancel', () => { start = null; });
  stage.addEventListener('touchend', event => {
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.clientX;
    const dy = event.changedTouches[0].clientY - start.clientY;
    start = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  }, {passive: true});
  window.addEventListener('popstate', syncWithHistory);
  syncWithHistory();
})();
