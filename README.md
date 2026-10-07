# seo-local-br

[![CI](https://github.com/Ph20sr/seo-local-br/actions/workflows/ci.yml/badge.svg)](https://github.com/Ph20sr/seo-local-br/actions/workflows/ci.yml)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

**SEO local** para sites de clínicas, barbearias, escritórios, restaurantes e lojas: o que faz o negócio aparecer quando alguém busca "dentista perto de mim". Gera e **valida** o que o Google lê, sem dependências.

- **JSON-LD de negócio local** (`schema.org`): endereço, telefone, horário, coordenadas e redes sociais
- **Horário de funcionamento** a partir de `{ seg: '08:00-12:00,13:00-18:00' }`, agrupando dias com o mesmo horário
- **FAQ** (pode virar resultado expandido) e **breadcrumb**
- **sitemap.xml** (URLs relativas, sem duplicados, limite de 50 mil) e **sitemap index**
- **robots.txt**, com `blockAll` para homologação (evita indexar o site de testes)
- **Meta tags** (title, description, canonical, Open Graph para o link bonito no WhatsApp) com **avisos de boas práticas**

## Uso

```js
import { localBusiness, jsonLdScript, metaTags, sitemap, robots } from 'seo-local-br';

const business = localBusiness({
  type: 'Dentist', // HairSalon, BeautySalon, LegalService, AccountingService, Restaurant, MedicalClinic, ExerciseGym...
  name: 'Clínica Sorriso Pleno',
  url: 'https://sorrisopleno.com.br',
  phone: '(11) 98765-4321',
  address: { street: 'Av. Paulista', number: '1000', complement: 'sala 42', district: 'Bela Vista', city: 'São Paulo', state: 'SP', postalCode: '01310-100' },
  geo: { latitude: -23.5649, longitude: -46.6519 },
  openingHours: { seg: '08:00-12:00,13:00-18:00', ter: '08:00-12:00,13:00-18:00', qua: '08:00-12:00,13:00-18:00', qui: '08:00-12:00,13:00-18:00', sex: '08:00-17:00', sab: '08:00-12:00' },
  sameAs: ['https://instagram.com/sorrisopleno'],
  priceRange: '$$',
});

const head = metaTags({
  title: 'Dentista na Bela Vista, SP | Clínica Sorriso Pleno',
  description: 'Implantes, clareamento e ortodontia na Av. Paulista. Agende sua avaliação online.',
  url: 'https://sorrisopleno.com.br/',
  image: 'https://sorrisopleno.com.br/og.jpg',
  siteName: 'Sorriso Pleno',
});
// head.html     → <title>, description, canonical, og:*, twitter:*
// head.warnings → [] (ou "Título com 72 caracteres: o Google costuma cortar depois de ~60", etc.)

const html = `<head>${head.html}\n${jsonLdScript(business)}</head>`;
```

```js
// Em build (Next.js, Astro, script) ou numa rota
writeFileSync('public/sitemap.xml', sitemap(['/', '/tratamentos', '/contato'], { baseUrl: 'https://sorrisopleno.com.br' }));
writeFileSync('public/robots.txt', robots({ disallow: ['/admin'], sitemaps: ['https://sorrisopleno.com.br/sitemap.xml'] }));
// homologação:
writeFileSync('public/robots.txt', robots({ blockAll: true }));
```

## O que é validado

| campo | validação |
| --- | --- |
| estado | uma das 27 UFs (aceita minúscula) |
| CEP | 8 dígitos, saída `00000-000` |
| telefone | DDD + número, saída em E.164 (`+5511987654321`) |
| URLs | absolutas e http(s) |
| horário | `HH:MM-HH:MM`, abertura antes do fechamento, dias em português ou inglês |
| coordenadas | latitude e longitude dentro dos limites |

`jsonLdScript` escapa `<`, o que impede um nome como `</script>` de quebrar a página ou injetar código.

Depois de publicar, confira no [Teste de pesquisa aprimorada do Google](https://search.google.com/test/rich-results).

## Desenvolvimento

```bash
npm test
```

## Licença

MIT
