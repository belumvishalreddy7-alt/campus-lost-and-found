/* Login and signup page controller. */
import { Auth, session } from './api.js';
import { $, initShell, toast, renderFieldErrors, alertBox } from './ui.js';

const next = new URLSearchParams(window.location.search).get('next') || '/dashboard.html';

initShell();
$('#year').textContent = new Date().getFullYear();

if (session.isLoggedIn) {
  window.location.replace(next);
}

function setAlert(html) {
  const container = $('#form-alert');
  container.innerHTML = html;
}

function busy(button, isBusy, label) {
  button.disabled = isBusy;
  if (isBusy) {
    button.dataset.label = button.textContent;
    button.textContent = 'Please wait…';
  } else if (label) {
    button.textContent = label;
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
}

const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAlert('');
    const button = $('#submit-btn');
    busy(button, true);

    const identifier = loginForm.email.value.trim();
    const password = loginForm.password.value;
    if (!identifier || !password) {
      setAlert(alertBox('Enter your email/username and password.'));
      busy(button, false);
      return;
    }

    try {
      const payload = identifier.includes('@') ? { email: identifier, password } : { username: identifier, password };
      const data = await Auth.login(payload);
      session.save(data.token, data.user);
      toast(`Welcome back, ${data.user.fullName || data.user.username}`, 'success');
      setTimeout(() => window.location.assign(next), 400);
    } catch (error) {
      if (!renderFieldErrors(error, loginForm)) setAlert(alertBox(error.message));
      busy(button, false);
    }
  });
}

const signupForm = $('#signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAlert('');
    const button = $('#submit-btn');
    busy(button, true);

    const payload = {
      fullName: signupForm.fullName.value.trim(),
      username: signupForm.username.value.trim(),
      email: signupForm.email.value.trim(),
      password: signupForm.password.value,
    };

    try {
      const data = await Auth.signup(payload);
      session.save(data.token, data.user);
      toast('Account created. Welcome to the portal!', 'success');
      setTimeout(() => window.location.assign(next), 400);
    } catch (error) {
      if (!renderFieldErrors(error, signupForm)) setAlert(alertBox(error.message));
      busy(button, false);
    }
  });
}
