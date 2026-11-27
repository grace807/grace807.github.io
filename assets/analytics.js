/* GA4 for this static site. Local/preview hosts are silent unless explicitly debugging. */
(() => {
  'use strict';
  if (window.siteAnalytics) return;
  const script = document.querySelector('script[data-analytics]');
  const settings = script?.dataset || {};
  const location = new URL(window.location.href);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const debug = location.searchParams.get('analytics_debug') === '1';
  let hosts = [];
  try { hosts = JSON.parse(settings.allowedHosts || '[]'); } catch { /* Disabled below. */ }
  const id = settings.measurementId || '';
  const enabled = /^G-[A-Z0-9]+$/.test(id) && ['https:', 'http:'].includes(location.protocol)
    && ((local && debug) || (!local && Array.isArray(hosts) && hosts.includes(location.hostname)));
  window.siteAnalytics = {enabled, debug, track: () => {}};
  if (!enabled) return;

  // Fixed slugs only; never send arbitrary text, email addresses, or whole link URLs.
  const slug = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._~/-]{0,99}$/.test(value) ? value : '';
  const campaignFields = {
    utm_source: 'campaign_source', utm_medium: 'campaign_medium', utm_campaign: 'campaign_name',
    utm_content: 'campaign_content', utm_term: 'campaign_term', utm_id: 'campaign_id',
  };
  const pageURL = new URL(location.origin + location.pathname);
  const campaign = {};
  const hasCampaign = Object.keys(campaignFields).some(key => location.searchParams.has(key));
  if (hasCampaign) {
    for (const [key, field] of Object.entries(campaignFields)) {
      const value = slug(location.searchParams.get(key));
      campaign[field] = value;
      if (value) pageURL.searchParams.set(key, value);
    }
  }
  let referrer = '';
  try {
    const url = new URL(document.referrer);
    if (['http:', 'https:'].includes(url.protocol)) referrer = url.origin + url.pathname;
  } catch { /* Direct visit. */ }
  const common = {page_id: slug(settings.pageId), page_section: slug(settings.pageSection)};
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const gtag = window.gtag;
  gtag('js', new Date());
  gtag('config', id, {
    ...common, ...campaign,
    page_location: pageURL.href, page_referrer: referrer,
    send_page_view: true,
    allow_google_signals: false, allow_ad_personalization_signals: false,
    ...(debug ? {debug_mode: true} : {}),
  });
  const events = new Set(['navigation_click', 'project_open', 'project_view', 'publication_link_click',
    'profile_link_click', 'news_link_click', 'cv_open', 'cv_download', 'publication_filter', 'section_toggle', 'scroll_depth']);
  const parameters = new Set(['content_id', 'content_type', 'link_id', 'filter_category', 'section_id', 'section_state']);
  window.siteAnalytics.track = (name, values = {}) => {
    if (!events.has(name)) return;
    const safe = {...common};
    for (const [key, value] of Object.entries(values)) {
      if (parameters.has(key) && slug(value)) safe[key] = value;
      if (key === 'percent_scrolled' && [25, 50, 75, 90].includes(value)) safe[key] = value;
    }
    gtag('event', name, {...safe, send_to: id, ...(debug ? {debug_mode: true} : {})});
  };
  const track = window.siteAnalytics.track;
  const tag = document.createElement('script');
  tag.async = true;
  tag.referrerPolicy = 'origin';
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(tag);

  if (settings.pageId?.startsWith('research/')) {
    track('project_view', {content_id: settings.pageId.slice('research/'.length), content_type: settings.pageSection === 'ongoing' ? 'ongoing' : 'publication'});
  }
  document.addEventListener('click', event => {
    const target = event.target.closest?.('[data-track-event]');
    if (!target || event.defaultPrevented || event.button > 0) return;
    const values = {};
    for (const [key, value] of Object.entries(target.dataset)) {
      if (key.startsWith('track') && key !== 'trackEvent') {
        values[key.slice(5).replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()).slice(1)] = value;
      }
    }
    track(target.dataset.trackEvent, values);
  });
  for (const details of document.querySelectorAll('details[data-section-id]')) {
    let wasOpen = details.open;
    details.addEventListener('toggle', () => {
      if (details.open === wasOpen) return;
      wasOpen = details.open;
      track('section_toggle', {section_id: details.dataset.sectionId, section_state: wasOpen ? 'open' : 'closed'});
    });
  }
  const reached = new Set();
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (available <= 0 || window.scrollY <= 0) return;
      const progress = window.scrollY / available * 100;
      for (const threshold of [25, 50, 75, 90]) {
        if (progress >= threshold && !reached.has(threshold)) {
          reached.add(threshold);
          track('scroll_depth', {percent_scrolled: threshold});
        }
      }
    });
  }, {passive: true});
})();
