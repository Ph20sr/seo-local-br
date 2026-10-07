// Dados estruturados (schema.org em JSON-LD) para negócios locais brasileiros.

export const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);

const DAYS = {
  dom: 'Sunday', seg: 'Monday', ter: 'Tuesday', qua: 'Wednesday', qui: 'Thursday', sex: 'Friday', sab: 'Saturday',
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};
const ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function phoneE164(phone) {
  let d = String(phone).replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) throw new TypeError(`Telefone inválido: ${phone}`);
  return `+55${d}`;
}

function absoluteUrl(url, field) {
  let u;
  try { u = new URL(url); } catch { throw new TypeError(`${field} precisa ser uma URL absoluta: ${url}`); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new TypeError(`${field} precisa ser http(s)`);
  return u.href;
}

/**
 * Horário de funcionamento: { seg: '08:00-18:00', sab: '08:00-12:00', dom: null }
 * ou com intervalo: { seg: '08:00-12:00,13:00-18:00' }. Dias com o mesmo
 * horário são agrupados numa única especificação, como o Google recomenda.
 */
export function openingHours(hours) {
  const byRange = new Map();
  for (const [key, value] of Object.entries(hours)) {
    const day = DAYS[key.toLowerCase().slice(0, 3).normalize('NFD').replace(/[̀-ͯ]/g, '')];
    if (!day) throw new TypeError(`Dia inválido: ${key}`);
    if (!value) continue;
    for (const range of String(value).split(',')) {
      const m = /^\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*$/.exec(range);
      if (!m || `${m[1]}:${m[2]}` >= `${m[3]}:${m[4]}`) throw new TypeError(`Horário inválido em ${key}: ${range}`);
      const k = `${m[1]}:${m[2]}-${m[3]}:${m[4]}`;
      if (!byRange.has(k)) byRange.set(k, new Set());
      byRange.get(k).add(day);
    }
  }
  return [...byRange.entries()]
    .map(([range, days]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ORDER.filter((d) => days.has(d)),
      opens: range.slice(0, 5),
      closes: range.slice(6),
    }))
    .sort((a, b) => ORDER.indexOf(a.dayOfWeek[0]) - ORDER.indexOf(b.dayOfWeek[0]) || a.opens.localeCompare(b.opens));
}

/**
 * JSON-LD de negócio local (aparece no Google Maps e na busca local).
 *
 * @param {object} b
 * @param {string} [b.type] tipo do schema.org: Dentist, BeautySalon, HairSalon, LegalService, AccountingService,
 *                          Restaurant, MedicalClinic, ExerciseGym, Store, ProfessionalService, LocalBusiness...
 */
export function localBusiness(b) {
  for (const f of ['name', 'url', 'phone', 'address']) {
    if (!b[f]) throw new TypeError(`localBusiness: campo obrigatório ausente: ${f}`);
  }
  const a = b.address;
  const uf = String(a.state ?? '').toUpperCase();
  if (!UFS.has(uf)) throw new TypeError(`UF inválida: ${a.state}`);
  const cep = String(a.postalCode ?? '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep)) throw new TypeError(`CEP inválido: ${a.postalCode}`);
  for (const f of ['street', 'city']) if (!a[f]) throw new TypeError(`Endereço sem ${f}`);

  const data = {
    '@context': 'https://schema.org',
    '@type': b.type ?? 'LocalBusiness',
    name: b.name,
    url: absoluteUrl(b.url, 'url'),
    telephone: phoneE164(b.phone),
    address: {
      '@type': 'PostalAddress',
      streetAddress: [a.street, a.number].filter(Boolean).join(', ') + (a.complement ? ` - ${a.complement}` : ''),
      ...(a.district ? { addressNeighborhood: a.district } : {}),
      addressLocality: a.city,
      addressRegion: uf,
      postalCode: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      addressCountry: 'BR',
    },
  };
  if (b.description) data.description = b.description;
  if (b.image) data.image = [].concat(b.image).map((u) => absoluteUrl(u, 'image'));
  if (b.logo) data.logo = absoluteUrl(b.logo, 'logo');
  if (b.email) data.email = b.email;
  if (b.priceRange) data.priceRange = b.priceRange;
  if (b.geo) {
    const { latitude: lat, longitude: lng } = b.geo;
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) throw new TypeError('Coordenadas inválidas');
    data.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
  }
  if (b.openingHours) data.openingHoursSpecification = openingHours(b.openingHours);
  if (b.sameAs?.length) data.sameAs = b.sameAs.map((u) => absoluteUrl(u, 'sameAs'));
  if (b.areaServed) data.areaServed = [].concat(b.areaServed).map((name) => ({ '@type': 'City', name }));
  return data;
}

export function faqPage(items) {
  if (!items?.length) throw new TypeError('faqPage precisa de perguntas');
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function breadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, url }, i) => ({
      '@type': 'ListItem', position: i + 1, name, item: absoluteUrl(url, 'breadcrumb url'),
    })),
  };
}

/** <script type="application/ld+json"> seguro (escapa "<" para não fechar a tag). */
export function jsonLdScript(data) {
  // U+2028/U+2029 são quebras de linha para alguns parsers de JS dentro de <script>
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<script type="application/ld+json">${json}</script>`;
}
