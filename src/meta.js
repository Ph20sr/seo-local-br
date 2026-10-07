// Meta tags (título, descrição, canonical, Open Graph e Twitter) com avisos de boas práticas.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * @returns {{ html: string, warnings: string[] }}
 */
export function metaTags({ title, description, url, image, siteName, locale = 'pt_BR', type = 'website', noindex = false }) {
  if (!title) throw new TypeError('metaTags: title é obrigatório');
  const warnings = [];
  if (title.length > 60) warnings.push(`Título com ${title.length} caracteres: o Google costuma cortar depois de ~60`);
  if (!description) warnings.push('Sem description: o Google vai escolher um trecho da página');
  else if (description.length < 50) warnings.push(`Descrição curta (${description.length}): use 50–160 caracteres`);
  else if (description.length > 160) warnings.push(`Descrição com ${description.length} caracteres: será cortada depois de ~160`);
  if (url && !/^https:\/\//.test(url)) warnings.push('Canonical sem https');
  if (image && !/^https?:\/\//.test(image)) warnings.push('og:image precisa ser URL absoluta para aparecer no WhatsApp e nas redes');
  if (!image) warnings.push('Sem og:image: o link compartilhado no WhatsApp fica sem imagem');

  const tags = [
    `<title>${esc(title)}</title>`,
    description && `<meta name="description" content="${esc(description)}">`,
    noindex && '<meta name="robots" content="noindex, nofollow">',
    url && `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${esc(type)}">`,
    `<meta property="og:locale" content="${esc(locale)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    description && `<meta property="og:description" content="${esc(description)}">`,
    url && `<meta property="og:url" content="${esc(url)}">`,
    siteName && `<meta property="og:site_name" content="${esc(siteName)}">`,
    image && `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
  ].filter(Boolean);
  return { html: tags.join('\n'), warnings };
}
