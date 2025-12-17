// Normalize text for robust matching (lowercase, remove accents/punctuation)
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9\s-]/g, '') // punctuation
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

const mappings = [
  ['sushi', 'Sushi en folie.jpg'],
  ['mega sushi', 'Mega sushi.jpg'],
  ['ramen', 'ramen.svg'],
  ['donburi', 'donburi.svg'],
  ['miso', 'miso.svg'],
  ['takoyaki', 'Takoyaki.jpg'],
  ['gyoza', 'Gyoza.jpg'],
  ['onigiri', 'Onigiri.jpg'],
  ['omuraisu', 'Omuraisu.jpg'],
  ['dorayaki', 'Dorayakijpg.jpg'],
  ['mochi', 'Mocchi.jpg'],
  ['matcha', 'Gateau au matcha.jpg'],
  ['bubble tea', 'Bubble tea.jpg'],
  ['ramune', 'Ramune.jpg'],
];

export function getMenuImage(name) {
  const s = slugify(name);
  if (!s) return '/assets/menu/placeholder.svg';

  // direct keyword mapping
  for (const [key, file] of mappings) {
    if (s.includes(slugify(key))) return `/assets/menu/${file}`;
  }

  // heuristic: choose by prominent keywords
  const keywords = ['sushi', 'ramen', 'donburi', 'miso', 'takoyaki', 'gyoza', 'onigiri', 'omuraisu', 'mochi', 'matcha', 'bubble', 'ramune'];
  const hits = keywords.filter(k => s.includes(k));
  if (hits.length) {
    const hit = hits[0];
    const found = mappings.find(([key]) => slugify(key) === hit);
    if (found) return `/assets/menu/${found[1]}`;
  }

  // fallback generic
  return '/assets/menu/placeholder.svg';
}
