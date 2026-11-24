/* Home page: hero counters, keyword search, filters, sorting and pagination. */
import { Items, Admin } from './api.js';
import { $, initShell, itemCard, emptyState, skeletonGrid, escapeHtml, toast } from './ui.js';

const grid = $('#items-grid');
const pagination = $('#pagination');
const summary = $('#results-summary');
const title = $('#results-title');
const form = $('#filter-form');

const params = new URLSearchParams(window.location.search);
const state = {
  q: params.get('q') || '',
  category: params.get('category') || '',
  location: params.get('location') || '',
  type: params.get('type') || '',
  status: params.get('status') || '',
  sort: params.get('sort') || 'newest',
  page: Number(params.get('page')) || 1,
};

function syncForm() {
  form.q.value = state.q;
  form.category.value = state.category;
  form.location.value = state.location;
  form.type.value = state.type;
  form.status.value = state.status;
  form.sort.value = state.sort;
}

function syncUrl() {
  const next = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (value && !(key === 'sort' && value === 'newest') && !(key === 'page' && value === 1)) {
      next.set(key, value);
    }
  });
  const query = next.toString();
  window.history.replaceState(null, '', query ? `/?${query}` : '/');
}

async function loadMeta() {
  try {
    const meta = await Admin.meta();
    const categorySelect = $('#category');
    const locationSelect = $('#location');
    meta.categories.forEach((category) => {
      categorySelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`);
    });
    meta.locations.forEach((location) => {
      locationSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`);
    });
  } catch {
    toast('Could not load the filter options', 'error');
  }
}

async function loadHeroStats() {
  try {
    const [all, lost, found] = await Promise.all([
      Items.list({ limit: 1 }),
      Items.list({ limit: 1, type: 'lost' }),
      Items.list({ limit: 1, type: 'found' }),
    ]);
    $('#stat-total').textContent = all.pagination.total;
    $('#stat-lost').textContent = lost.pagination.total;
    $('#stat-found').textContent = found.pagination.total;
  } catch {
    ['#stat-total', '#stat-lost', '#stat-found'].forEach((id) => ($(id).textContent = '—'));
  }
}

function renderPagination(paginationInfo) {
  const { page, pages } = paginationInfo;
  if (pages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  const buttons = [];
  buttons.push(`<button type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`);
  for (let index = 1; index <= pages; index += 1) {
    if (pages > 7 && Math.abs(index - page) > 2 && index !== 1 && index !== pages) {
      if (index === 2 || index === pages - 1) buttons.push('<button type="button" disabled>…</button>');
      continue;
    }
    buttons.push(`<button type="button" data-page="${index}" class="${index === page ? 'active' : ''}" aria-current="${index === page}">${index}</button>`);
  }
  buttons.push(`<button type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Next page">›</button>`);
  pagination.innerHTML = buttons.join('');
}

async function loadItems() {
  grid.innerHTML = skeletonGrid(6);
  summary.textContent = 'Loading listings…';
  try {
    const data = await Items.list({ ...state, page: state.page, limit: 9 });
    const { items, pagination: pageInfo } = data;

    const activeFilters = [state.q, state.category, state.location, state.type, state.status].filter(Boolean);
    title.textContent = activeFilters.length ? 'Search results' : 'Recent listings';
    summary.textContent = `${pageInfo.total} listing${pageInfo.total === 1 ? '' : 's'} found${
      activeFilters.length ? ` for ${activeFilters.map((value) => `“${value}”`).join(', ')}` : ''
    } — page ${pageInfo.page} of ${pageInfo.pages}`;

    if (!items.length) {
      grid.innerHTML = emptyState(
        'No listings match your search',
        'Try a different keyword, widen the filters, or be the first to report this item.',
        '<a class="btn btn-primary" href="/report.html">Report an item</a>'
      );
    } else {
      grid.innerHTML = items.map(itemCard).join('');
    }
    renderPagination(pageInfo);
  } catch (error) {
    grid.innerHTML = emptyState('Could not load listings', error.message);
    summary.textContent = 'Failed to load listings.';
  }
}

function applyAndReload() {
  state.page = 1;
  syncUrl();
  loadItems();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  state.q = form.q.value.trim();
  state.category = form.category.value;
  state.location = form.location.value;
  state.type = form.type.value;
  state.status = form.status.value;
  state.sort = form.sort.value;
  applyAndReload();
});

['category', 'location', 'type', 'status', 'sort'].forEach((name) => {
  form[name].addEventListener('change', () => {
    state[name] = form[name].value;
    applyAndReload();
  });
});

$('#clear-filters').addEventListener('click', () => {
  setTimeout(() => {
    Object.assign(state, { q: '', category: '', location: '', type: '', status: '', sort: 'newest', page: 1 });
    syncUrl();
    loadItems();
  }, 0);
});

pagination.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button || button.disabled) return;
  state.page = Number(button.dataset.page);
  syncUrl();
  loadItems();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

initShell();
syncForm();
loadMeta().then(loadItems);
loadHeroStats();
$('#year').textContent = new Date().getFullYear();
