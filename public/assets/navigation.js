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
  {
    label: '📋 OpenAPI',
    href: '/openapi.json',
    target: '_blank',
    rel: 'noopener noreferrer',
    highlight: false
  }
];

const BASE_CLASSES = 'block py-2 px-3 rounded md:p-0';
const DEFAULT_CLASSES =
  'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent';
const ACTIVE_CLASSES = 'text-white bg-blue-700 md:bg-transparent md:text-blue-700 dark:text-white md:dark:text-blue-500';

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

function isActive(item, currentPath) {
  if (item.highlight === false) {
    return false;
  }
  if (Array.isArray(item.match)) {
    return item.match.includes(currentPath);
  }
  return item.href === currentPath;
}

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

document.addEventListener('DOMContentLoaded', () => {
  const navLists = document.querySelectorAll('[data-nav="primary"]');
  if (!navLists.length) return;

  const currentPath = normalisePath(window.location.pathname.replace(/index\.html$/, '/') || '/');

  navLists.forEach((navList) => {
    navList.innerHTML = '';
    NAV_ITEMS.forEach((item) => {
      const linkNode = buildNavLink(item, currentPath);
      navList.appendChild(linkNode);
    });
  });
});
