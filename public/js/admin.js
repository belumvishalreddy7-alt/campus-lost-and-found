/* Admin console: statistics, charts, and management of listings, claims and accounts. */
import { Admin, Items, Claims, session } from './api.js';
import {
  $,
  $$,
  initShell,
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

if (!session.isLoggedIn) {
  window.location.replace('/login.html?next=%2Fadmin.html');
} else if (!session.isAdmin) {
  $('#admin-alert').innerHTML = alertBox('This console is restricted to administrators. Sign in with an admin account to continue.');
  $('#admin-stats').innerHTML = '';
  $$('.panel, .tabs').forEach((node) => (node.hidden = true));
} else {
  const state = { filters: { q: '', type: '', status: '' }, claimStatus: '' };

  const barChart = (entries, total) => {
    if (!entries.length) return '<p>No data yet.</p>';
    const max = Math.max(...entries.map((entry) => entry[1]));
    return entries
      .map(([label, count]) => {
        const width = Math.max(4, Math.round((count / max) * 100));
        return `<div class="bar-row"><span title="${escapeHtml(label)}">${escapeHtml(label)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span>
          <b>${count}</b></div>`;
      })
      .join('') + `<small style="margin-top:.35rem;display:block">${total} listings in total</small>`;
  };

  async function loadStats() {
    try {
      const { stats } = await Admin.stats();
      const cards = [
        { label: 'Total listings', value: stats.totals.items, note: `${stats.byType.lost} lost · ${stats.byType.found} found` },
        { label: 'Open', value: stats.byStatus.open, note: 'awaiting recovery' },
        { label: 'Claimed / returned', value: (stats.byStatus.claimed || 0) + (stats.byStatus.returned || 0), note: `${stats.recoveryRate}% recovery rate` },
        { label: 'Claims', value: stats.totals.claims, note: `${stats.claims.pending} pending` },
        { label: 'Accounts', value: stats.totals.users, note: 'registered users' },
      ];
      $('#admin-stats').innerHTML = cards
        .map((card) => `<div class="stat-card"><span>${card.label}</span><strong>${card.value}</strong><small>${card.note}</small></div>`)
        .join('');

      const categories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
      $('#category-chart').innerHTML = barChart(categories, stats.totals.items);
      $('#location-chart').innerHTML = barChart(
        stats.topLocations.map((entry) => [entry.location, entry.count]),
        stats.totals.items
      );
    } catch (error) {
      $('#admin-alert').innerHTML = alertBox(error.message);
    }
  }

  async function loadItems() {
    const container = $('#admin-items-table');
    container.innerHTML = '<div class="skeleton" style="height:220px"></div>';
    try {
      const data = await Admin.items({ ...state.filters, limit: 50 });
      if (!data.items.length) {
        container.innerHTML = emptyState('No listings match', 'Adjust the search or filters.');
        return;
      }
      container.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Type</th><th>Status</th><th>Category</th><th>Location</th><th>Reported by</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.items
                .map(
                  (item) => `
                <tr>
                  <td><a href="/item.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></td>
                  <td>${badge(item.type, item.type === 'lost' ? 'Lost' : 'Found')}</td>
                  <td>${badge(item.status, item.status)}</td>
                  <td>${escapeHtml(item.category)}</td>
                  <td>${escapeHtml(item.location)}</td>
                  <td>${escapeHtml(item.postedBy?.username || '—')}</td>
                  <td>${formatDate(item.date)}</td>
                  <td>
                    ${item.status !== 'returned' ? `<button class="btn btn-outline btn-sm" data-item-action="returned" data-id="${item.id}">Resolve</button>` : ''}
                    <button class="btn btn-danger btn-sm" data-item-action="delete" data-id="${item.id}">Delete</button>
                  </td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <small style="display:block;margin-top:.6rem">Showing ${data.items.length} of ${data.pagination.total} listings</small>`;
    } catch (error) {
      container.innerHTML = alertBox(error.message);
    }
  }

  async function loadClaims() {
    const container = $('#admin-claims-table');
    container.innerHTML = '<div class="skeleton" style="height:220px"></div>';
    try {
      const data = await Admin.claims({ status: state.claimStatus, limit: 50 });
      if (!data.claims.length) {
        container.innerHTML = emptyState('No claims found', 'Nothing matches this filter.');
        return;
      }
      container.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Claimant</th><th>Message</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead>
            <tbody>
              ${data.claims
                .map(
                  (claim) => `
                <tr>
                  <td><a href="/item.html?id=${encodeURIComponent(claim.item?.id || '')}">${escapeHtml(claim.item?.title || 'Removed')}</a></td>
                  <td>${escapeHtml(claim.claimer?.fullName || claim.claimer?.username || '—')}</td>
                  <td>${escapeHtml(claim.message || '—')}</td>
                  <td>${badge(claim.status, claim.status)}</td>
                  <td>${formatDateTime(claim.createdAt)}</td>
                  <td>${
                    claim.status === 'pending'
                      ? `<button class="btn btn-accent btn-sm" data-decide="approved" data-claim="${claim.id}">Approve</button>
                         <button class="btn btn-outline btn-sm" data-decide="rejected" data-claim="${claim.id}">Reject</button>`
                      : '<small>Decided</small>'
                  }</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      container.innerHTML = alertBox(error.message);
    }
  }

  async function loadUsers() {
    const container = $('#admin-users-table');
    try {
      const data = await Admin.users();
      container.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              ${data.users
                .map(
                  (user) => `
                <tr>
                  <td>${escapeHtml(user.fullName || user.username)}</td>
                  <td>${escapeHtml(user.username)}</td>
                  <td>${escapeHtml(user.email)}</td>
                  <td>${badge(user.role === 'admin' ? 'approved' : 'neutral', user.role)}</td>
                  <td>${formatDate(user.createdAt)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      container.innerHTML = alertBox(error.message);
    }
  }

  $('#admin-items-table').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-item-action]');
    if (!button) return;
    const { itemAction, id } = button.dataset;
    try {
      if (itemAction === 'delete') {
        if (!window.confirm('Delete this listing and all of its claims?')) return;
        await Items.remove(id);
        toast('Listing deleted', 'success');
      } else {
        await Items.update(id, { status: 'returned' });
        toast('Listing marked returned', 'success');
      }
      loadStats();
      loadItems();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  $('#admin-claims-table').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-decide]');
    if (!button) return;
    button.disabled = true;
    try {
      await Claims.decide(button.dataset.claim, button.dataset.decide);
      toast(`Claim ${button.dataset.decide}`, 'success');
      loadStats();
      loadClaims();
      loadItems();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
    }
  });

  let searchTimer;
  $('#admin-search').addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.q = event.target.value.trim();
      loadItems();
    }, 300);
  });

  $('#admin-type').addEventListener('change', (event) => {
    state.filters.type = event.target.value;
    loadItems();
  });

  $('#admin-status').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    loadItems();
  });

  $('#admin-claim-status').addEventListener('change', (event) => {
    state.claimStatus = event.target.value;
    loadClaims();
  });

  $('#refresh').addEventListener('click', () => {
    loadStats();
    loadItems();
    loadClaims();
    loadUsers();
    toast('Data refreshed', 'info', 2000);
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((other) => {
        other.classList.toggle('active', other === tab);
        other.setAttribute('aria-selected', String(other === tab));
      });
      ['items', 'claims', 'users'].forEach((name) => {
        $(`#panel-${name}`).hidden = name !== tab.dataset.tab;
      });
    });
  });

  loadStats();
  loadItems();
  loadClaims();
  loadUsers();
}
