// Shown when the Supabase settings are missing, so a fresh copy explains itself instead of showing a blank page.
export function renderSetup(root) {
  root.innerHTML = `
    <div class="center">
      <h1>Connect the database</h1>
      <p>Kilnbook needs its Supabase settings before it can run.</p>
      <ol class="muted">
        <li>Copy <code>app/.env.example</code> to <code>app/.env.local</code>.</li>
        <li>Paste in your Supabase project URL and publishable key.</li>
        <li>Restart <code>npm run dev</code>.</li>
      </ol>
      <p class="muted">Full steps are in <code>app/README.md</code>.</p>
    </div>`;
}
