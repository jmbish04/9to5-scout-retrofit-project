/**
 * @typedef {object} NavItem
 * @property {string} label - The text to display for the navigation link.
 * @property {string} href - The URL the navigation link points to.
 * @property {string[]} [match] - An array of paths that should also be considered a match for this item.
 * @property {string} [target] - The target attribute for the link (e.g., '_blank').
 * @property {string} [rel] - The rel attribute for the link (e.g., 'noopener noreferrer').
 * @property {boolean} [highlight=true] - Whether to highlight the link when it's active.
 */

/**
 * An array of navigation items to be displayed in the navigation bar.
 * @type {NavItem[]}
 */
const NAV_ITEMS = [
  { label: 'Home', href: '/', match: ['/', '/index.html'] },
  { label: 'Getting Started', href: '/getting-started.html' },
  { label: 'API Reference', href: '/api-reference.html' },
  { label: 'Email Integration', href: '/email-integration.html' },
  { label: 'Job History', href: '/job-history-management.html' },
  { label: 'AI Agents', href: '/agent-workflow-config.html' },
  { label: 'Operations Dashboard', href: '/operations-dashboard.html' },
  { label: 'Logs Explorer', href: '/logs.html' },
  { label: 'WebSocket Debugger', href: '/ws-debug.html' },
  // { label: 'Cover Letter Template', href: '/templates/cover_letter_template.html' },
  // { label: 'Resume Template', href: '/templates/resume_template.html' },
  // { label: 'Email Template', href: '/templates/email_template.html' },
  {
    label: '📋 OpenAPI',
    href: '/openapi.json',
    target: '_blank',
    rel: 'noopener noreferrer',
    highlight: false
  }
];

/**
 * Base classes for all navigation links.
 * @type {string}
 */
const BASE_CLASSES = 'block py-2 px-3 rounded md:p-0';

/**
 * Default classes for inactive navigation links.
 * @type {string}
 */
const DEFAULT_CLASSES =
  'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent';

/**
 * Classes for the currently active navigation link.
 * @type {string}
 */
const ACTIVE_CLASSES = 'text-white bg-blue-700 md:bg-transparent md:text-blue-700 dark:text-white md:dark:text-blue-500';

/**
 * Normalises a pathname for consistent matching.
 * - Ensures the path starts with a '/'.
 * - Removes a trailing '/' if it exists.
 * - Returns '/' for an empty path.
 * @param {string} pathname - The pathname to normalise.
 * @returns {string} The normalised pathname.
 */
function normalisePath(pathname) {
  if (!pathname) return '/';
  let path = pathname;
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (path === '') {
    return '/';
  }
  return path;
}

/**
 * Determines if a navigation item should be considered active.
 * @param {NavItem} item - The navigation item to check.
 * @param {string} currentPath - The current normalised path.
 * @returns {boolean} True if the item is active, false otherwise.
 */
function isActive(item, currentPath) {
  if (item.highlight === false) {
    return false;
  }
  if (Array.isArray(item.match)) {
    return item.match.includes(currentPath);
  }
  return item.href === currentPath;
}

/**
 * Builds a single navigation link element.
 * @param {NavItem} item - The navigation item data.
 * @param {string} currentPath - The current normalised path.
 * @returns {HTMLLIElement} The list item element containing the navigation link.
 */
function buildNavLink(item, currentPath) {
  const li = document.createElement('li');
  const anchor = document.createElement('a');
  anchor.href = item.href;
  anchor.textContent = item.label;
  anchor.className = `${BASE_CLASSES} ${DEFAULT_CLASSES}`;
  if (item.target) {
    anchor.target = item.target;
  }
  if (item.rel) {
    anchor.rel = item.rel;
  }

  if (isActive(item, currentPath)) {
    anchor.className = `${BASE_CLASSES} ${ACTIVE_CLASSES}`;
    anchor.setAttribute('aria-current', 'page');
  }

  li.appendChild(anchor);
  return li;
}

/**
 * This event listener triggers when the initial HTML document has been completely loaded and parsed.
 * It finds all navigation list elements and populates them with the navigation links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const navLists = document.querySelectorAll('[data-nav="primary"]');
  if (!navLists.length) return;

  const currentPath = normalisePath(window.location.pathname.replace(/index\.html$/, '/') || '/');
  console.log(`[NAV] Current Path: ${currentPath}`);

  navLists.forEach((navList) => {
    navList.replaceChildren();
    console.log('[NAV] Processing navigation items...');
    NAV_ITEMS.forEach((item) => {
      console.log(`[NAV]  - ${item.label}: ${item.href}`);
      const linkNode = buildNavLink(item, currentPath);
      navList.appendChild(linkNode);
    });
    console.log('[NAV] Navigation processing complete.');
  });
});
