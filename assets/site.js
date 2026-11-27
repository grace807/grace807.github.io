// Keep the sticky profile and anchor targets clear of the navigation bar.
const header = document.querySelector('.topbar');
if (header) {
  const menuButton = header.querySelector('.menu-toggle');
  const nav = header.querySelector('nav');
  menuButton.hidden = false;
  const menuIsOpen = () => menuButton.getAttribute('aria-expanded') === 'true';
  const closeMenu = () => menuButton.setAttribute('aria-expanded', 'false');
  menuButton.addEventListener('click', () => menuButton.setAttribute('aria-expanded', String(!menuIsOpen())));
  window.matchMedia('(max-width: 760px)').addEventListener('change', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuIsOpen()) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });
  // Close before a link navigates or the CV dialog records its return-focus target.
  nav.addEventListener('click', event => {
    if (menuIsOpen() && event.target.closest('a, button')) {
      menuButton.focus();
      closeMenu();
    }
  }, true);
  const measureHeader = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  measureHeader();
  if ('ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
  else window.addEventListener('resize', measureHeader);
}

// Fade the native page scrollbar after scrolling; leave wheel, touch, and keys native.
const scrollRoot = document.documentElement;
scrollRoot.classList.add('auto-hide-scrollbar');
let scrollbarHideTimer;
window.addEventListener('scroll', () => {
  scrollRoot.classList.add('is-scrolling');
  window.clearTimeout(scrollbarHideTimer);
  scrollbarHideTimer = window.setTimeout(() => scrollRoot.classList.remove('is-scrolling'), 800);
}, {passive: true});

const emailLink = document.querySelector('.profile-email');
if (emailLink) {
  const addressField = document.querySelector('.email-feedback input');
  const status = document.querySelector('.email-feedback [role="status"]');
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = emailLink.className;
  Object.assign(copyButton.dataset, emailLink.dataset);
  copyButton.setAttribute('aria-label', 'Copy email address');
  copyButton.append(...emailLink.childNodes);
  copyButton.querySelector('.profile-link-name').textContent = 'Copy email';
  emailLink.replaceWith(copyButton);

  let messageTimer;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(addressField.value);
    } catch {
      window.clearTimeout(messageTimer);
      status.textContent = 'Copy the address below.';
      addressField.hidden = false;
      addressField.focus();
      addressField.select();
      return;
    }
    addressField.hidden = true;
    status.textContent = 'Email copied';
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => { status.textContent = ''; }, 3000);
  });
}

const filters = document.querySelector('.filters');
if (filters) {
  filters.hidden = false;
  const groups = [...document.querySelectorAll('.publication-group')];
  const buttons = [...filters.querySelectorAll('button')];
  const updateFilterStatus = () => {
    const count = groups.filter(group => !group.hidden && group.open).reduce((n, group) => n + group.querySelectorAll('.publication').length, 0);
    document.querySelector('#filter-status').textContent = `${count} entries shown.`;
  };
  const applyFilter = (category) => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    for (const group of groups) {
      group.hidden = category !== 'all' && group.dataset.category !== category;
      if (category !== 'all' && !group.hidden) group.open = true;
    }
    updateFilterStatus();
  };
  for (const group of groups) group.addEventListener('toggle', updateFilterStatus);
  updateFilterStatus();
  for (const button of buttons) button.addEventListener('click', () => {
    const changed = button.getAttribute('aria-pressed') !== 'true';
    applyFilter(button.dataset.filter);
    if (changed) window.siteAnalytics?.track('publication_filter', {filter_category: button.dataset.filter});
  });
  // Reveal a citation even if its category was filtered out or collapsed.
  const revealCitation = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const group = target?.closest('.publication-group');
    if (!group) return;
    if (group.hidden) applyFilter('all');
    group.open = true;
    updateFilterStatus();
    requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  };
  window.addEventListener('hashchange', revealCitation);
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash && url.hash === location.hash) revealCitation();
  });
  if (location.hash) revealCitation();
}
const cvDialog = document.querySelector('#cv-dialog');
if (cvDialog) {
  const triggers = [...document.querySelectorAll('[data-cv-open]')];
  for (const trigger of triggers) {
    trigger.addEventListener('click', () => {
      cvDialog.showModal();
      window.siteAnalytics?.track('cv_open', {content_id: 'cv'});
      for (const button of triggers) button.setAttribute('aria-expanded', 'true');
    });
  }
  cvDialog.addEventListener('close', () => {
    for (const button of triggers) button.setAttribute('aria-expanded', 'false');
  });
}
