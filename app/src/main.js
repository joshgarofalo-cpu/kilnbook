// Entry point. Decides which screen to show:
//   not configured -> setup help
//   not signed in  -> sign-in screen
//   signed in      -> the app, with tabs for Inventory and Pickups
import './styles.css';
import { supabase, isConfigured } from './supabase.js';
import { esc } from './util.js';
import { renderSetup } from './views/setup.js';
import { renderLogin } from './views/login.js';
import { renderInventory } from './views/inventory.js';
import { renderPickups } from './views/pickups.js';

const root = document.getElementById('app');

// Screens live at #/inventory and #/pickups. Using the part after "#" means
// the hosting doesn't need any special routing setup.
const ROUTES = {
  inventory: { label: 'Inventory', render: renderInventory, icon: '<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="M9 12h6"/>' },
  pickups: { label: 'Pickups', render: renderPickups, icon: '<path d="M6 3h12v18l-6-4-6 4z"/>' },
};

let studio = null; // the studio this signed-in person belongs to

async function start() {
  if (!isConfigured) return renderSetup(root);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return renderLogin(root);

  studio = await loadStudio();
  if (!studio) return renderNoStudio(session.user.email);

  showRoute();
}

// Row-level security means this only returns studios the person is a member of.
async function loadStudio() {
  const { data, error } = await supabase.from('studios').select('id, name').limit(1).maybeSingle();
  if (error) console.error(error);
  return data;
}

function showRoute() {
  const name = location.hash.replace('#/', '');
  const key = ROUTES[name] ? name : 'inventory';

  root.innerHTML = `
    <div class="app">
      <header class="appbar">
        <div class="ab-left">
          <div class="logo" aria-hidden="true">K</div>
          <div class="ab-shop">${esc(studio.name)}</div>
        </div>
        <button class="btn line sm" id="signout">Sign out</button>
      </header>
      <main class="screen" id="screen"></main>
      <nav class="tabs">
        ${Object.entries(ROUTES).map(([k, r]) => `
          <a class="tab" href="#/${k}" ${k === key ? 'aria-current="page"' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true">${r.icon}</svg>${r.label}
          </a>`).join('')}
      </nav>
    </div>`;

  root.querySelector('#signout').onclick = () => supabase.auth.signOut();
  ROUTES[key].render(root.querySelector('#screen'), studio);
}

function renderNoStudio(email) {
  root.innerHTML = `
    <div class="center">
      <h1>Almost there</h1>
      <p>You're signed in as <b>${esc(email)}</b>, but this account isn't linked to a studio yet.</p>
      <p class="muted">Add it in Supabase with the "link an owner" step in <code>app/README.md</code>, then reload.</p>
      <button class="btn line" id="signout">Sign out</button>
    </div>`;
  root.querySelector('#signout').onclick = () => supabase.auth.signOut();
}

if (isConfigured) {
  // Re-draw only when a different person signs in, or someone signs out.
  // (Supabase also sends "signed in" when you come back to the tab; that shouldn't reset the screen.)
  let currentUser;
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user?.id ?? null;
    if (currentUser !== undefined && user !== currentUser) setTimeout(start);
    currentUser = user;
  });
  window.addEventListener('hashchange', () => studio && showRoute());
}

// The service worker lets the installed app open quickly and is needed for
// push alerts later. Only in the built app, so it never caches stale files while developing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

start();
