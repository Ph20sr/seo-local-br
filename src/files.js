// sitemap.xml, sitemap index e robots.txt

const xmlEscape = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[c]));

export const SITEMAP_LIMIT = 50_000;

function isoDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new TypeError(`lastmod inválido: ${value}`);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {(string | { loc: string, lastmod?: string | Date, changefreq?: string, priority?: number })[]} urls
 * @param {{ baseUrl?: string }} [options] para aceitar caminhos relativos ("/contato")
 */
export function sitemap(urls, { baseUrl } = {}) {
  if (urls.length > SITEMAP_LIMIT) throw new RangeError(`Um sitemap aceita até ${SITEMAP_LIMIT} URLs; divida e use sitemapIndex()`);
  const seen = new Set();
  const entries = [];
  for (const item of urls) {
    const u = typeof item === 'string' ? { loc: item } : item;
    const loc = new URL(u.loc, baseUrl).href;
    if (seen.has(loc)) continue;
    seen.add(loc);
    let xml = `  <url>\n    <loc>${xmlEscape(loc)}</loc>`;
    if (u.lastmod) xml += `\n    <lastmod>${isoDate(u.lastmod)}</lastmod>`;
    if (u.changefreq) xml += `\n    <changefreq>${xmlEscape(u.changefreq)}</changefreq>`;
    if (u.priority !== undefined) {
      if (!(u.priority >= 0 && u.priority <= 1)) throw new RangeError(`priority entre 0 e 1: ${u.priority}`);
      xml += `\n    <priority>${u.priority.toFixed(1)}</priority>`;
    }
    entries.push(`${xml}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

export function sitemapIndex(sitemaps) {
  const items = sitemaps.map((s) => {
    const { loc, lastmod } = typeof s === 'string' ? { loc: s } : s;
    return `  <sitemap>\n    <loc>${xmlEscape(new URL(loc).href)}</loc>${lastmod ? `\n    <lastmod>${isoDate(lastmod)}</lastmod>` : ''}\n  </sitemap>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

/**
 * robots.txt. Use `blockAll: true` em homologação/staging (o erro clássico
 * é publicar o site com o robots do staging, ou indexar o staging).
 */
export function robots({ allow = [], disallow = [], sitemaps = [], blockAll = false } = {}) {
  const lines = ['User-agent: *'];
  if (blockAll) lines.push('Disallow: /');
  else {
    for (const p of allow) lines.push(`Allow: ${p}`);
    for (const p of disallow) lines.push(`Disallow: ${p}`);
    if (!allow.length && !disallow.length) lines.push('Allow: /');
  }
  if (sitemaps.length) lines.push('', ...sitemaps.map((s) => `Sitemap: ${new URL(s).href}`));
  return `${lines.join('\n')}\n`;
}
