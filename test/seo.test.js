import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localBusiness, openingHours, faqPage, breadcrumb, jsonLdScript, sitemap, sitemapIndex, robots, metaTags,
} from '../src/index.js';

const clinic = {
  type: 'Dentist',
  name: 'Clínica Sorriso Pleno',
  url: 'https://sorrisopleno.com.br',
  phone: '(11) 98765-4321',
  address: { street: 'Av. Paulista', number: '1000', complement: 'sala 42', district: 'Bela Vista', city: 'São Paulo', state: 'sp', postalCode: '01310100' },
  geo: { latitude: -23.5649, longitude: -46.6519 },
  openingHours: { seg: '08:00-12:00,13:00-18:00', ter: '08:00-12:00,13:00-18:00', qua: '08:00-12:00,13:00-18:00', qui: '08:00-12:00,13:00-18:00', sex: '08:00-17:00', sab: '08:00-12:00', dom: null },
  sameAs: ['https://instagram.com/sorrisopleno'],
  priceRange: '$$',
};

test('JSON-LD de negócio local normalizado', () => {
  const data = localBusiness(clinic);
  assert.equal(data['@type'], 'Dentist');
  assert.equal(data.telephone, '+5511987654321');
  assert.deepEqual(data.address, {
    '@type': 'PostalAddress',
    streetAddress: 'Av. Paulista, 1000 - sala 42',
    addressNeighborhood: 'Bela Vista',
    addressLocality: 'São Paulo',
    addressRegion: 'SP',
    postalCode: '01310-100',
    addressCountry: 'BR',
  });
  assert.deepEqual(data.geo, { '@type': 'GeoCoordinates', latitude: -23.5649, longitude: -46.6519 });
  assert.equal(data.url, 'https://sorrisopleno.com.br/');
});

test('horário agrupa dias iguais e entende intervalo de almoço', () => {
  const spec = openingHours(clinic.openingHours).map((s) => [s.dayOfWeek.join(','), s.opens, s.closes]);
  // Sábado 08–12 tem o mesmo horário da manhã de seg–qui: entra no mesmo grupo
  assert.deepEqual(spec, [
    ['Monday,Tuesday,Wednesday,Thursday,Saturday', '08:00', '12:00'],
    ['Monday,Tuesday,Wednesday,Thursday', '13:00', '18:00'],
    ['Friday', '08:00', '17:00'],
  ]);
  assert.deepEqual(openingHours({ Sábado: '09:00-13:00' })[0].dayOfWeek, ['Saturday']);
  assert.throws(() => openingHours({ seg: '18:00-08:00' }), /Horário inválido/);
  assert.throws(() => openingHours({ xyz: '08:00-12:00' }), /Dia inválido/);
});

test('valida UF, CEP, telefone, URL e coordenadas', () => {
  const bad = (over) => () => localBusiness({ ...clinic, ...over });
  assert.throws(bad({ address: { ...clinic.address, state: 'XX' } }), /UF inválida/);
  assert.throws(bad({ address: { ...clinic.address, postalCode: '123' } }), /CEP inválido/);
  assert.throws(bad({ phone: '123' }), /Telefone inválido/);
  assert.throws(bad({ url: 'sorrisopleno.com.br' }), /URL absoluta/);
  assert.throws(bad({ geo: { latitude: 200, longitude: 0 } }), /Coordenadas/);
  assert.throws(() => localBusiness({ name: 'x' }), /obrigatório/);
});

test('FAQ, breadcrumb e script JSON-LD seguro', () => {
  const faq = faqPage([{ question: 'Aceita convênio?', answer: 'Sim, os principais.' }]);
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Sim, os principais.');
  const crumbs = breadcrumb([{ name: 'Início', url: 'https://x.com.br/' }, { name: 'Tratamentos', url: 'https://x.com.br/tratamentos' }]);
  assert.equal(crumbs.itemListElement[1].position, 2);

  const script = jsonLdScript({ name: 'Ataque </script><script>alert(1)</script>' });
  assert.ok(!script.slice(0, -9).includes('</script>'), 'não fecha a tag antes da hora');
  assert.ok(script.includes('\\u003c/script>'));
  assert.deepEqual(JSON.parse(script.slice(35, -9)), { name: 'Ataque </script><script>alert(1)</script>' });
});

test('sitemap: relativo, sem duplicados, escapado', () => {
  const xml = sitemap([
    '/',
    { loc: '/tratamentos?tipo=implante&cidade=sp', lastmod: '2026-10-07T12:00:00Z', changefreq: 'monthly', priority: 0.8 },
    '/',
  ], { baseUrl: 'https://sorrisopleno.com.br' });
  assert.equal((xml.match(/<url>/g) ?? []).length, 2);
  assert.ok(xml.includes('<loc>https://sorrisopleno.com.br/tratamentos?tipo=implante&amp;cidade=sp</loc>'));
  assert.ok(xml.includes('<lastmod>2026-10-07</lastmod>'));
  assert.ok(xml.includes('<priority>0.8</priority>'));
  assert.throws(() => sitemap([{ loc: 'https://a.com', priority: 2 }]), RangeError);

  const index = sitemapIndex([{ loc: 'https://x.com.br/sitemap-1.xml', lastmod: '2026-10-01' }]);
  assert.ok(index.includes('<sitemapindex'));
});

test('robots: produção e staging', () => {
  assert.equal(
    robots({ disallow: ['/admin', '/api'], sitemaps: ['https://x.com.br/sitemap.xml'] }),
    'User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://x.com.br/sitemap.xml\n',
  );
  assert.equal(robots({ blockAll: true }), 'User-agent: *\nDisallow: /\n');
  assert.equal(robots(), 'User-agent: *\nAllow: /\n');
});

test('meta tags com avisos de boas práticas', () => {
  const { html, warnings } = metaTags({
    title: 'Dentista na Bela Vista, SP | Clínica Sorriso Pleno',
    description: 'Implantes, clareamento e ortodontia na Av. Paulista. Agende sua avaliação online em poucos cliques.',
    url: 'https://sorrisopleno.com.br/',
    image: 'https://sorrisopleno.com.br/og.jpg',
    siteName: 'Sorriso Pleno',
  });
  assert.deepEqual(warnings, []);
  assert.ok(html.includes('<link rel="canonical" href="https://sorrisopleno.com.br/">'));
  assert.ok(html.includes('<meta property="og:locale" content="pt_BR">'));
  assert.ok(html.includes('summary_large_image'));

  const weak = metaTags({ title: 'A'.repeat(70), description: 'curta', image: '/og.jpg', url: 'http://x.com' });
  assert.equal(weak.warnings.length, 4);
  assert.ok(metaTags({ title: '"><script>' }).html.includes('&#34;&#62;&#60;script&#62;'));
});
