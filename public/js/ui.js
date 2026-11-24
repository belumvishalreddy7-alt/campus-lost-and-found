/* Shared UI helpers: navigation shell, toasts, formatting and card rendering. */
import { session } from './api.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const badge = (kind, label) => `<span class="badge badge-${kind}">${escapeHtml(label || kind)}</span>`;

export function toast(message, type = 'info', timeout = 4200) {
  let stack = $('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .2s ease';
    setTimeout(() => el.remove(), 220);
  }, timeout);
}

export function alertBox(message, type = 'error', extraHtml = '') {
  return `<div class="alert alert-${type}" role="alert">${escapeHtml(message)}${extraHtml}</div>`;
}

export function renderFieldErrors(error, form) {
  $$('.field-error', form).forEach((node) => (node.textContent = ''));
  $$('[aria-invalid]', form).forEach((node) => node.removeAttribute('aria-invalid'));
  const errors = error?.data?.errors;
  if (!errors) return false;
  Object.entries(errors).forEach(([field, message]) => {
    const target = form.querySelector(`[data-error-for="${field}"]`);
    if (target) target.textContent = message;
    const input = form.querySelector(`[name="${field}"]`);
    if (input) input.setAttribute('aria-invalid', 'true');
  });
  return true;
}

/** Highlight the current page in the nav and show the right links for the role. */
export function initShell() {
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const path = window.location.pathname.replace(/\/index\.html$/, '/') || '/';
  $$('#site-nav a[href]').forEach((link) => {
    const href = new URL(link.getAttribute('href'), window.location.origin).pathname;
    if (href === path) link.classList.add('active');
  });

  const loggedIn = session.isLoggedIn;
  $$('[data-auth]').forEach((el) => (el.hidden = !loggedIn));
  $$('[data-guest]').forEach((el) => (el.hidden = loggedIn));
  $$('[data-admin]').forEach((el) => (el.hidden = !session.isAdmin));

  const userChip = $('[data-user-name]');
  if (userChip) {
    userChip.textContent = loggedIn ? session.user?.fullName || session.user?.username || 'Account' : '';
    userChip.hidden = !loggedIn;
  }

  const logoutBtn = $('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const { Auth } = await import('./api.js');
      await Auth.logout();
      session.clear();
      toast('You have been logged out', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    });
  }
}

/** Send the visitor to the login page, remembering where they wanted to go. */
export function requireLogin(redirectTo = window.location.pathname) {
  if (session.isLoggedIn) return true;
  window.location.href = `/login.html?next=${encodeURIComponent(redirectTo)}`;
  return false;
}

export function itemCard(item) {
  const initials = (item.category || 'Item').slice(0, 2).toUpperCase();
  const image = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">`
    : `<span aria-hidden="true">${escapeHtml(initials)}</span>`;
  return `
    <article class="item-card">
      <div class="item-thumb">${image}</div>
      <div class="item-body">
        <div class="item-meta">
          ${badge(item.type, item.type === 'lost' ? 'Lost' : 'Found')}
          ${badge(item.status, item.status)}
        </div>
        <h3><a href="/item.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></h3>
        <p class="item-desc">${escapeHtml(item.description)}</p>
        <div class="item-meta">
          <span>📍 ${escapeHtml(item.location)}</span>
          <span>🗓 ${formatDate(item.date)}</span>
        </div>
        <div class="card-foot">
          <small>${escapeHtml(item.category)}</small>
          <a class="btn btn-outline btn-sm" href="/item.html?id=${encodeURIComponent(item.id)}">View details</a>
        </div>
      </div>
    </article>`;
}

export function emptyState(title, message, actionHtml = '') {
  return `<div class="empty"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>${actionHtml}</div>`;
}

export function skeletonGrid(count = 6) {
  return Array.from({ length: count }, () => '<div class="skeleton"></div>').join('');
}
