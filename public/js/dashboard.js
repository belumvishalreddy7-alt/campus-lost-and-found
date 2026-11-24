/* User dashboard: own listings, claims made and claims received on own items. */
import { Items, Claims, session } from './api.js';
import {
  $,
  $$,
  initShell,
  requireLogin,
  escapeHtml,
  formatDate,
  formatDateTime,
  badge,
  toast,
  emptyState,
} from './ui.js';

initShell();
$('#year').textContent = new Date().getFullYear();

if (requireLogin('/dashboard.html')) {
  const user = session.user || {};
  $('#welcome').textContent = `Welcome, ${user.fullName || user.username}`;
  $('#welcome-sub').textContent = user.role === 'admin'
    ? 'You are signed in as an administrator — the admin console has the campus-wide view.'
    : 'Track what you reported, and review claims on the items you found.';

  const state = { items: [], made: [], received: [] };

  function renderStats() {
    const open = state.items.filter((item) => item.status === 'open').length;
    const returned = state.items.filter((item) => item.status === 'returned').length;
    const pending = state.received.filter((claim) => claim.status === 'pending').length;
    const cards = [
      { label: 'My listings', value: state.items.length, note: 'reports you created' },
      { label: 'Open listings', value: open, note: 'still waiting' },
      { label: 'Recovered', value: returned, note: 'marked returned' },
      { label: 'Claims I made', value: state.made.length, note: 'submitted by you' },
      { label: 'Pending on my items', value: pending, note: 'need your review' },
    ];
    $('#user-stats').innerHTML = cards
      .map(
        (card) => `<div class="stat-card"><span>${card.label}</span><strong>${card.value}</strong><small>${card.note}</small></div>`
      )
      .join('');
  }

  function renderListings() {
    const panel = $('#panel-listings');
    if (!state.items.length) {
      panel.innerHTML = emptyState(
        'You have not reported anything yet',
        'When you report a lost or found item it will appear here with its claims.',
        '<a class="btn btn-primary" href="/report.html">Create your first report</a>'
      );
      return;
    }
    panel.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Type</th><th>Status</th><th>Location</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.items
              .map(
                (item) => `
              <tr>
                <td><a href="/item.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a><br><small>${escapeHtml(item.category)}</small></td>
                <td>${badge(item.type, item.type === 'lost' ? 'Lost' : 'Found')}</td>
                <td>${badge(item.status, item.status)}</td>
                <td>${escapeHtml(item.location)}</td>
                <td>${formatDate(item.date)}</td>
                <td>
                  ${item.status !== 'returned' ? `<button class="btn btn-outline btn-sm" data-action="returned" data-id="${item.id}">Mark returned</button>` : ''}
                  ${item.status !== 'open' ? `<button class="btn btn-outline btn-sm" data-action="open" data-id="${item.id}">Reopen</button>` : ''}
                  <button class="btn btn-danger btn-sm" data-action="delete" data-id="${item.id}">Delete</button>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  function claimTable(claims, { showItem = true, actions = false } = {}) {
    if (!claims.length) {
      return emptyState('Nothing here yet', showItem ? 'You have not claimed any item.' : 'No one has claimed your items yet.');
    }
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${showItem ? '<th>Item</th>' : ''}
              ${actions ? '<th>Claimant</th>' : '<th>Status</th>'}
              <th>Message</th><th>Status</th><th>Submitted</th>
              ${actions ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${claims
              .map(
                (claim) => `
              <tr>
                ${showItem ? `<td><a href="/item.html?id=${encodeURIComponent(claim.item?.id || '')}">${escapeHtml(claim.item?.title || 'Listing removed')}</a></td>` : ''}
                ${actions ? `<td>${escapeHtml(claim.claimer?.fullName || claim.claimer?.username || 'Student')}</td>` : `<td>${badge(claim.status, claim.status)}</td>`}
                <td>${escapeHtml(claim.message || '—')}</td>
                <td>${badge(claim.status, claim.status)}</td>
                <td>${formatDateTime(claim.createdAt)}</td>
                ${
                  actions
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

  function renderClaims() {
    $('#panel-claims-made').innerHTML = claimTable(state.made, { showItem: true, actions: false });
    $('#panel-claims-received').innerHTML = claimTable(state.received, { showItem: true, actions: true });
  }

  async function loadAll() {
    try {
      const [itemsData, claimsData] = await Promise.all([Items.mine(), Claims.mine()]);
      state.items = itemsData.items;
      state.made = claimsData.made;
      state.received = claimsData.received;
      renderStats();
      renderListings();
      renderClaims();
    } catch (error) {
      $('#panel-listings').innerHTML = emptyState('Could not load your dashboard', error.message);
    }
  }

  $('#panel-listings').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === 'delete') {
      if (!window.confirm('Delete this listing? Its claims will be removed too. This cannot be undone.')) return;
      try {
        await Items.remove(id);
        toast('Listing deleted', 'success');
        loadAll();
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }

    try {
      await Items.update(id, { status: action });
      toast(`Listing marked ${action}`, 'success');
      loadAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  $('#panel-claims-received').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-decide]');
    if (!button) return;
    button.disabled = true;
    try {
      await Claims.decide(button.dataset.claim, button.dataset.decide);
      toast(`Claim ${button.dataset.decide}`, 'success');
      loadAll();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
    }
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((other) => {
        other.classList.toggle('active', other === tab);
        other.setAttribute('aria-selected', String(other === tab));
      });
      ['listings', 'claims-made', 'claims-received'].forEach((name) => {
        $(`#panel-${name}`).hidden = name !== tab.dataset.tab;
      });
    });
  });

  loadAll();
}
