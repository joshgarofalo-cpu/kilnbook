// Sign in by email. No passwords to forget.
//
// The goal is a 6-digit code, because on iPhone an app added to the Home Screen
// keeps its own separate login from Safari: tapping an email link opens Safari,
// so the installed app would stay signed out. Typing a code works everywhere.
// Until custom email (SMTP) is set up, Supabase's email only has a link, so both work.
import { supabase } from '../supabase.js';
import { esc } from '../util.js';

export function renderLogin(root) {
  root.innerHTML = `
    <form class="center" id="email-form">
      <div class="logo" aria-hidden="true">K</div>
      <h1>Sign in to Kilnbook</h1>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" autocomplete="email" required>
      </div>
      <div id="msg"></div>
      <button class="btn big" type="submit">Email me a code</button>
    </form>`;

  const form = root.querySelector('#email-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const button = form.querySelector('button');
    button.disabled = true;

    // shouldCreateUser: false means only people you've added in Supabase can sign in.
    // emailRedirectTo: where the email's sign-in link sends you. Supabase's stock email
    // only has a link (no code) until custom email (SMTP) is set up, so the link has to work too.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: location.origin },
    });
    button.disabled = false;
    if (error) return showError(form, error.message);
    renderCode(root, email);
  };
}

function renderCode(root, email) {
  root.innerHTML = `
    <form class="center" id="code-form">
      <h1>Check your email</h1>
      <p class="muted">We sent an email to <b>${esc(email)}</b>. Type the code from it below, or tap the sign-in link in it.</p>
      <div class="field">
        <label for="code">Code</label>
        <input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required>
      </div>
      <div id="msg"></div>
      <button class="btn big" type="submit">Sign in</button>
      <button class="btn line" type="button" id="back">Use a different email</button>
    </form>`;

  const form = root.querySelector('#code-form');
  form.querySelector('#back').onclick = () => renderLogin(root);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    const { error } = await supabase.auth.verifyOtp({ email, token: form.code.value.trim(), type: 'email' });
    button.disabled = false;
    if (error) showError(form, error.message);
    // On success, main.js hears the sign-in and shows the app.
  };
}

function showError(form, message) {
  form.querySelector('#msg').innerHTML = `<div class="notice">${esc(message)}</div>`;
}
