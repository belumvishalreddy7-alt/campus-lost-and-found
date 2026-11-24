/* Item details page: full record, claim submission and claim review for the owner/admin. */
import { Items, Claims, api, session } from './api.js';
import {
  $,
  initShell,
  itemCard,
  escapeHtml,
  formatDate,
  formatDateTime,
  badge,
  toast,
  alertBox,
  emptyState,
} from './ui.js';

initShell();
$('#year').textContent = new Date().getFullYear();

const root = $('#detail-root');
const itemId = new URLSearchParams(window.location.search).get('id');

const currentUserId = session.user?.id || null;
const isAdmin = session.isAdmin;
const ownerId = (item) => (item.postedBy && typeof item.postedBy === 'object' ? item.postedBy.id : item.postedBy);

function duplicateNotice() {
  const stored = sessionStorage.getItem('clf.duplicate');
  if (!stored) return '';
  sessionStorage.removeItem('clf.duplicate');
  return `<div class="alert alert-warning"><strong>Possible duplicate report found.</strong> These recent listings look related:<ul>${stored}</ul></div>`;
}

function claimForm(item) {
  if (!session.isLoggedIn) {
    return `<div class="alert alert-info">Log in to claim this item. <a href="/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}">Log in</a></div>`;
  }
  if (item.type !== 'found') {
    return `<div class="alert alert-info">This is a <strong>lost</strong> report. If you found this item, post a found report or contact the reporter.</div>`;
  }
  if (item.status !== 'open') {
    return `<div class="alert alert-warning">This item is no longer open for claims (status: ${escapeHtml(item.status)}).</div>`;
  }
  if (ownerId(item) === currentUserId) {
    return `<div class="alert alert-info">You reported this item. Claims from other students will appear below.</div>`;
  }
  return `
    <form id="claim-form" class="panel" style="margin-top:1rem">
      <h2>Claim this item</h2>
      <p>Describe the item so the reporter can verify it is yours. Only the reporter or an admin can approve a claim.</p>
      <div class="field">
        <label for="claim-message">Your message</label>
        <textarea id="claim-message" name="message" maxlength="500" placeholder="e.g. The wallet has my library card inside and a small tear on the left corner."></textarea>
        <div class="field-error" data-error-for="message"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" id="claim-btn">Submit claim</button>
      </div>
    </form>`;
}

function claimRows(claims, canDecide) {
  if (!claims.length) return '<p>No claims yet.</p>';
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Claimant</th><th>Message</th><th>Status</th><th>Submitted</th>${canDecide ? '<th>Action</th>' : ''}</tr></thead>
        <tbody>
          ${claims
            .map(
              (claim) => `
            <tr>
              <td>${escapeHtml(claim.claimer?.fullName || claim.claimer?.username || 'Student')}</td>
              <td>${escapeHtml(claim.message || '—')}</td>
              <td>${badge(claim.status, claim.status)}</td>
              <td>${formatDateTime(claim.createdAt)}</td>
              ${
                canDecide
                  ? `<td>${
                      claim.status === 'pending'
                        ? `<button class="btn btn-accent btn-sm" data-decide="approved" data-claim="${claim.id}">Approve</button>
                           <button class="btn btn-outline btn-sm" data-decide="rejected" data-claim="${claim.id}">Reject</button>`
                        : '<small>Decided</small>'
                    }</td>`
                  : ''
              }
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

async function loadClaims(item) {
  const container = $('#claims-panel');
  if (!container) return;
  try {
    const data = await api(`/items/${item.id}/claims`);
    const canDecide = isAdmin || ownerId(item) === currentUserId;
    container.innerHTML = `<h2>Claims on this item</h2>${claimRows(data.claims, canDecide)}`;

    container.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-decide]');
      if (!button) return;
      button.disabled = true;
      try {
        await Claims.decide(button.dataset.claim, button.dataset.decide);
        toast(`Claim ${button.dataset.decide}`, 'success');
        await loadClaims(item);
        load();
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  } catch (error) {
    container.innerHTML = `<h2>Claims on this item</h2>${alertBox(error.message)}`;
  }
}

function render(item, related) {
  const isOwner = ownerId(item) === currentUserId;
  const canManage = isOwner || isAdmin;
  const image = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}">`
    : `<span>No photo provided</span>`;

  root.innerHTML = `
    ${duplicateNotice()}
    <div class="detail-layout">
      <div>
        <div class="detail-image">${image}</div>
      </div>
      <div>
        <div class="item-meta" style="margin-bottom:.5rem">
          ${badge(item.type, item.type === 'lost' ? 'Lost' : 'Found')}
          ${badge(item.status, item.status)}
        </div>
        <h1>${escapeHtml(item.title)}</h1>
        <p>${escapeHtml(item.description)}</p>
        <dl class="detail-list">
          <dt>Category</dt><dd>${escapeHtml(item.category)}</dd>
          <dt>Location</dt><dd>${escapeHtml(item.location)}</dd>
          <dt>${item.type === 'lost' ? 'Lost on' : 'Found on'}</dt><dd>${formatDate(item.date)}</dd>
          <dt>Reported by</dt><dd>${escapeHtml(item.postedBy?.fullName || item.postedBy?.username || 'Student')}</dd>
          <dt>Reported on</dt><dd>${formatDateTime(item.createdAt)}</dd>
          ${item.resolvedAt ? `<dt>Resolved on</dt><dd>${formatDateTime(item.resolvedAt)}</dd>` : ''}
        </dl>
        ${
          canManage
            ? `<div class="form-actions" style="margin-top:1rem">
                 ${item.status !== 'returned' ? `<button class="btn btn-accent btn-sm" id="mark-returned">Mark as returned</button>` : ''}
                 <a class="btn btn-outline btn-sm" href="/dashboard.html">Manage in dashboard</a>
               </div>`
            : ''
        }
        ${claimForm(item)}
      </div>
    </div>
    ${canManage ? '<div class="panel" id="claims-panel" style="margin-top:1.5rem"><h2>Claims on this item</h2><p>Loading claims…</p></div>' : ''}
    ${
      related.length
        ? `<section style="margin-top:2rem"><div class="page-head"><div><h2>Similar listings</h2><p>Other reports in the same category.</p></div></div>
           <div class="item-grid">${related.map(itemCard).join('')}</div></section>`
        : ''
    }
  `;

  const claimFormEl = $('#claim-form');
  if (claimFormEl) {
    claimFormEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('#claim-btn');
      button.disabled = true;
      try {
        await Claims.create({ itemId: item.id, message: claimFormEl.message.value.trim() });
        toast('Claim submitted — the reporter will review it', 'success');
        load();
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  }

  const returnedBtn = $('#mark-returned');
  if (returnedBtn) {
    returnedBtn.addEventListener('click', async () => {
      returnedBtn.disabled = true;
      try {
        await Items.update(item.id, { status: 'returned' });
        toast('Listing marked as returned', 'success');
        load();
      } catch (error) {
        toast(error.message, 'error');
        returnedBtn.disabled = false;
      }
    });
  }

  if (canManage) loadClaims(item);
}

async function load() {
  if (!itemId) {
    root.innerHTML = emptyState('No item selected', 'Open a listing from the home page.', '<a class="btn btn-primary" href="/">Browse listings</a>');
    return;
  }
  try {
    const { item } = await Items.get(itemId);
    let related = [];
    try {
      const data = await Items.list({ category: item.category, limit: 4 });
      related = data.items.filter((entry) => entry.id !== item.id).slice(0, 3);
    } catch {
      related = [];
    }
    render(item, related);
  } catch (error) {
    root.innerHTML =
      error.status === 404
        ? emptyState('Listing not found', 'This report may have been deleted by its owner.', '<a class="btn btn-primary" href="/">Back to listings</a>')
        : emptyState('Could not load this listing', error.message);
  }
}

load();
