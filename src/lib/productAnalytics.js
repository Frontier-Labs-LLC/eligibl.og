import { useEffect } from 'react';
import { pageview, track } from '@vercel/analytics';
import { recordClick, recordPageView } from './visitorCount';

function reportVercel(fn) {
  try {
    fn();
  } catch {
    // The check works without Vercel's script.
  }
}

/** Count the screen in our own store, and send the same path to Vercel. */
export function viewPage(page) {
  recordPageView(page);
  reportVercel(() => pageview({ path: `/${page}` }));
}

export function trackClick(page, target, x, y) {
  recordClick({ page, target, x, y });
  reportVercel(() => track('click', { page, target: target.slice(0, 48) }));
}

/**
 * Count this screen, and every click on a button or link while it is open.
 * Clicks are labeled by data-track, then the accessible name. Typed answers
 * are not controls, so they are not counted.
 */
export function usePageAnalytics(page) {
  useEffect(() => {
    viewPage(page);

    function onClick(event) {
      const node = event.target instanceof Element
        ? event.target.closest('a, button, [data-track]')
        : null;
      if (!node) return;
      const raw = node.getAttribute('data-track')
        || node.getAttribute('aria-label')
        || node.textContent
        || '';
      const target = raw.replace(/\s+/g, ' ').trim();
      if (!target) return;
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      const x = Math.round((event.clientX / width) * 100);
      const y = Math.round((event.clientY / height) * 100);
      trackClick(page, target, x, y);
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [page]);
}
