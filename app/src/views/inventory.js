// Bisque inventory: every piece type with its count and + / − buttons.
import { supabase } from '../supabase.js';
import { esc } from '../util.js';

export async function renderInventory(screen, studio) {
  screen.innerHTML = `<h1>Inventory</h1><p class="muted">Loading…</p>`;

  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, qty, reorder_point, supplier')
    .eq('studio_id', studio.id)
    .order('name');

  if (error) {
    screen.innerHTML = `<h1>Inventory</h1><div class="notice">${esc(error.message)}</div>`;
    return;
  }

  const low = items.filter((i) => i.qty <= i.reorder_point).length;
  screen.innerHTML = `
    <h1>Inventory</h1>
    <p class="muted">${items.length} piece types${low ? ` · <b>${low} running low</b>` : ''}</p>
    ${items.length ? `<div class="list">${items.map(rowHtml).join('')}</div>`
      : `<div class="list"><div class="empty">No pieces yet. Add them in Supabase (see <code>supabase/seed.sql</code>).</div></div>`}`;

  screen.querySelectorAll('[data-delta]').forEach((button) => {
    button.onclick = () => adjust(screen, items, button);
  });
}

function rowHtml(item) {
  const low = item.qty <= item.reorder_point;
  return `
    <div class="row" data-id="${item.id}">
      <div>
        <div class="name">${esc(item.name)}</div>
        <div class="sub">${esc(item.supplier || 'No supplier')} · reorder at ${item.reorder_point}</div>
      </div>
      <div class="stepper">
        <button data-delta="-1" aria-label="One less ${esc(item.name)}">−</button>
        <span class="qty num ${low ? 'low' : ''}">${item.qty}</span>
        <button data-delta="1" aria-label="One more ${esc(item.name)}">+</button>
      </div>
    </div>`;
}

// Uses a database function to add or subtract, so two phones tapping at the
// same moment can't overwrite each other's change.
async function adjust(screen, items, button) {
  const row = button.closest('.row');
  const item = items.find((i) => i.id === row.dataset.id);
  const delta = Number(button.dataset.delta);

  row.querySelectorAll('button').forEach((b) => (b.disabled = true));
  const { data: qty, error } = await supabase.rpc('adjust_item_qty', { p_item_id: item.id, p_delta: delta });
  row.querySelectorAll('button').forEach((b) => (b.disabled = false));

  if (error) return alert(error.message);
  item.qty = qty;
  const qtyEl = row.querySelector('.qty');
  qtyEl.textContent = qty;
  qtyEl.classList.toggle('low', qty <= item.reorder_point);
}
