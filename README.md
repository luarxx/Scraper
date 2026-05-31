# Scraper 🔎

**Scraper** é uma ferramenta que busca produtos em e-commerces brasileiros — **KaBuM!**, **Pichau** e **TerabyteShop** — e mostra os resultados em uma interface web bonita e rápida.

Ela extrai título, preço, parcelamento e imagem de cada produto, e ordena os resultados combinando relevância e melhor preço.

---

## Como usar

### 1. Instalar

```bash
npm install
npx playwright install chromium
```

### 2. Rodar

```bash
npm run dev
```

Isso sobe o servidor e a interface ao mesmo tempo. Abra o endereço que aparecer no terminal e comece a pesquisar.

### 3. Pesquisar

Digite qualquer produto (ex: "ryzen 5 5500", "rx 7600", "rtx 4060") e escolha em qual loja buscar. O resultado aparece com cards, imagens, preços e um destaque para a **melhor opção**.

---

## Também funciona via CLI

```bash
npx tsx scraper.ts "ryzen 5 5500"
npx tsx scraper.ts --site pichau "rtx 4060"
```

---

## Projetos que usam

---

Feito por [Luarxx](https://github.com/Luarxx).
