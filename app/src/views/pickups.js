// Pickup tickets that haven't been picked up yet, newest first.
import { supabase } from '../supabase.js';
import { esc, countLabel, STATUS_LABELS } from '../util.js';

export async function renderPickups(screen, studio) {
  screen.innerHTML = `<h1>Pickups</h1><p class="muted">Loading…</p>`;

  // One request gets each ticket plus its pieces and their names.
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id, customer_name, phone, note, shelf, status, created_at, ticket_lines(qty, items(singular_label, plural_label))')
    .eq('studio_id', studio.id)
    .neq('status', 'picked_up')
    .order('created_at', { ascending: false });

  if (error) {
    screen.innerHTML = `<h1>Pickups</h1><div class="notice">${esc(error.message)}</div>`;
    return;
  }

  screen.innerHTML = `
    <h1>Pickups</h1>
    <p class="muted">${tickets.length} open tickets</p>
    <div class="list">
      ${tickets.length ? tickets.map(rowHtml).join('') : `<div class="empty">No open tickets.</div>`}
    </div>`;
}

function rowHtml(t) {
  const pieces = t.ticket_lines
    .map((l) => countLabel(l.qty, l.items.singular_label, l.items.plural_label))
    .join(', ');
  return `
    <div class="row">
      <div>
        <div class="name">${esc(t.customer_name)}</div>
        <div class="sub">${esc(pieces || 'No pieces')}${t.shelf ? ` · shelf ${esc(t.shelf)}` : ''}</div>
      </div>
      <span class="pill ${esc(t.status)}">${STATUS_LABELS[t.status] ?? esc(t.status)}</span>
    </div>`;
}
