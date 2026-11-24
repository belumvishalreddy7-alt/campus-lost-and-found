/* Report form: loads category/location options, submits as JSON or multipart. */
import { Items, Admin } from './api.js';
import { $, initShell, requireLogin, toast, renderFieldErrors, alertBox, escapeHtml, formatDate } from './ui.js';

initShell();
$('#year').textContent = new Date().getFullYear();

if (requireLogin('/report.html')) {
  const form = $('#report-form');
  const alertBoxContainer = $('#form-alert');

  const prefill = new URLSearchParams(window.location.search).get('type');
  if (prefill === 'found' || prefill === 'lost') {
    form.querySelector(`input[name="type"][value="${prefill}"]`).checked = true;
  }

  const today = new Date().toISOString().slice(0, 10);
  form.date.max = today;
  form.date.value = today;

  Admin.meta()
    .then((meta) => {
      meta.categories.forEach((category) => {
        form.category.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`);
      });
      meta.locations.forEach((location) => {
        form.location.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`);
      });
    })
    .catch(() => toast('Could not load the category list', 'error'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBoxContainer.innerHTML = '';
    const button = $('#submit-btn');
    button.disabled = true;
    button.textContent = 'Submitting…';

    const file = form.image.files[0];
    const fields = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      category: form.category.value,
      location: form.location.value,
      date: form.date.value,
      type: form.querySelector('input[name="type"]:checked').value,
    };

    try {
      let data;
      if (file) {
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
        formData.append('image', file);
        data = await Items.createWithImage(formData);
      } else {
        data = await Items.create(fields);
      }

      const warning = data.duplicateWarning || [];
      if (warning.length) {
        const list = warning
          .map((match) => `<li><strong>${escapeHtml(match.title)}</strong> — ${escapeHtml(match.type)} at ${escapeHtml(match.location)} (${formatDate(match.date)})</li>`)
          .join('');
        toast('Report saved. A possible match was found — check the related listing.', 'info', 6000);
        sessionStorage.setItem('clf.duplicate', list);
      } else {
        toast('Report submitted successfully', 'success');
      }
      window.location.assign(`/item.html?id=${encodeURIComponent(data.item.id)}`);
    } catch (error) {
      if (!renderFieldErrors(error, form)) {
        alertBoxContainer.innerHTML = alertBox(error.message);
      }
      button.disabled = false;
      button.textContent = 'Submit report';
    }
  });
}
