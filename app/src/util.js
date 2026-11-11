// Small helpers shared by the screens.

// Makes text safe to put inside HTML, so a customer named "<b>Sam" can't break the page.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// "1 mug" / "3 mugs"
export function countLabel(qty, singular, plural) {
  return `${qty} ${qty === 1 ? singular : plural}`;
}

export const STATUS_LABELS = {
  painted: 'Painted',
  kiln: 'In the kiln',
  ready: 'Ready',
  picked_up: 'Picked up',
};
