# Plano de Ação: Anti-Detecção em VPS (sem proxy)

Diagnóstico e ações para reduzir bloqueios anti-bot no site hospedado em VPS,
sem uso de proxies rotativos.

Leia `Docs/scraper/anti-detection.md` primeiro para entender o que já existe.

---

## Problema Raiz

IPs de datacenter (Oracle, AWS, Hetzner) têm reputação muito pior que IPs
residenciais. CDNs como Cloudflare e Azion aplicam políticas mais agressivas
contra IPs de VPS. Sem proxy residencial, as soluções se concentram em **reduzir
a pontuação de bot** do tráfego para que o CDN nem sequer suspeite.

---

## Status Atual

| Mitigação | Arquivo | Status |
|---|---|---|
| 13 perfis coerentes UA + WebGL + Platform | `fingerprint.ts:29-116` | ✅ |
| Comportamento humano probabilístico (mouse, scroll, idle) | `browserBehavior.ts` | ✅ |
| Delay aleatório 1.8-4.5s antes de cada `goto()` | `search.ts:230,354,569` | ✅ |
| Navegação pela home antes da URL de busca | `search.ts:352-398` | ✅ |
| Variação de launch args conforme `SCRAPER_VPS` | `search.ts:45-71` | ✅ |
| Sessão reaproveitada com `storageState` | `browserSession.ts` | ✅ |
| Retry com backoff exponencial + jitter | `retry.ts` | ✅ |
| Challenge detection (Cloudflare/Azion) + espera resolução | `browserBehavior.ts:108-121` | ✅ |
| Locale/timezone variável (80/20) | `fingerprint.ts:176-181` | ✅ |
| Bloqueio apenas de `media` (não fontes/imagens) | `search.ts:218-225` | ✅ |

---

## Fragilidades Identificadas

### 1. hardwareConcurrency e deviceMemory inconsistentes

**Arquivo:** `fingerprint.ts:189-190`

```typescript
hardwareConcurrency: sample([4, 6, 8, 10, 12, 16]),
deviceMemory: sample([4, 8]),
```

Sorteados independentemente — pode gerar `deviceMemory: 4GB` com
`hardwareConcurrency: 16`, combinação que não existe em hardware real.
Anti-bots cruzam esses valores para pontuar suspeição.

### 2. Sem delay entre buscas consecutivas no Auto Search

**Arquivo:** `server-core/auto.ts:121-174`

O Auto Search executa todas as buscas configuradas sequencialmente dentro do
mesmo browser, **sem pausa entre elas**. 5 termos no mesmo site = 5 requisições
em sequência rápida do mesmo IP. Sinal clássico de automação.

### 3. Perfis WebGL desatualizados

**Arquivo:** `fingerprint.ts:29-116`

GPUs de 2017-2020 (UHD 630, GTX 1660 SUPER, RX 6600). Em 2026, `llvmpipe
(LLVM 17.0.6)` em Linux é fortemente associado a ambientes headless.

### 4. InitScript não cobre todas APIs do navegador

**Arquivo:** `fingerprint.ts:205-273`

Faltam spoofs de:

- `navigator.connection` (NetworkInformation — `effectiveType`, `downlink`, `rtt`)
- `navigator.maxTouchPoints`
- `screen.colorDepth` / `screen.pixelDepth`
- `window.chrome` (objeto runtime do Chrome)
- Canvas fingerprint (`toDataURL` / `toBlob` com ruído sutil)

### 5. Chromium headless shell vs Chrome real

**Arquivo:** `search.ts:177`

```typescript
channel: HEADLESS ? 'chromium' : undefined,
```

Usa o `chromium` headless shell, que expõe diferenças detectáveis (WebGL,
fontes, APIs ausentes). Chrome real (`google-chrome-stable`) é
indistinguível de usuário legítimo.

### 6. Stealth plugin previsível

**Arquivo:** `search.ts:5,24`

`puppeteer-extra-plugin-stealth` tem patches conhecidos por anti-bots
(Distil, Akamai, DataDome). O spoofing manual do `criarFingerprintInitScript`
já cobre os mesmos patches de forma menos padronizada e, portanto, menos
detectável.

### 7. Concorrência alta no Auto Search

**Arquivo:** `server-core/auto.ts:27`

`AUTO_MAX_CONCURRENCY=3` permite até 3 browsers simultâneos. Na prática, são
3 processos Chromium com o mesmo IP de saída fazendo scraping em paralelo.

---

## Plano de Ação

### Prioridade Alta — implementar agora

| # | Ação | Arquivo | Esforço | Impacto |
|---|---|---|---|---|
| 1 | Criar perfis de hardware coerentes (agrupar `hardwareConcurrency` + `deviceMemory` em perfis realistas) | `fingerprint.ts` | 30min | Médio |
| 2 | Adicionar `randomWait(5000, 30000)` entre buscas consecutivas no Auto Search | `server-core/auto.ts` | 15min | **Alto** |
| 3 | Instalar Chrome real na VPS e usar `channel: 'chrome'` | `search.ts` + VPS | 20min | **Muito alto** |

### Prioridade Média — implementar em seguida

| # | Ação | Arquivo | Esforço | Impacto |
|---|---|---|---|---|
| 4 | Spoof de `navigator.connection`, `screen.colorDepth`, `maxTouchPoints`, `window.chrome` | `fingerprint.ts` | 30min | Médio |
| 5 | Adicionar ruído sutil ao canvas (`toDataURL` / `toBlob`) | `fingerprint.ts` | 20min | Médio |
| 6 | Atualizar perfis WebGL: RTX 4060, RX 7600, Intel Arc; reduzir peso llvmpipe | `fingerprint.ts` | 15min | Baixo-Médio |

### Prioridade Baixa — testar depois

| # | Ação | Arquivo | Esforço | Impacto |
|---|---|---|---|---|
| 7 | Remover `puppeteer-extra-plugin-stealth` e confiar apenas no init script manual | `search.ts` | 15min | Incerto |
| 8 | Reduzir `AUTO_MAX_CONCURRENCY` para 1-2 | `.env` da VPS | 5min | Médio |
| 9 | Aumentar `AUTO_INTERVAL_JITTER_HOURS` para 12-24h | `.env` da VPS | 5min | Médio |

---

## Detalhamento das Ações

### Ação 1 — Perfis de hardware coerentes

Substituir o sorteio independente por perfis agrupados.

**Antes:**
```typescript
hardwareConcurrency: sample([4, 6, 8, 10, 12, 16]),
deviceMemory: sample([4, 8]),
```

**Depois:**
```typescript
const PERFIS_HARDWARE = [
  { hardwareConcurrency: 4,  deviceMemory: 4 },
  { hardwareConcurrency: 6,  deviceMemory: 8 },
  { hardwareConcurrency: 8,  deviceMemory: 8 },
  { hardwareConcurrency: 12, deviceMemory: 16 },
  { hardwareConcurrency: 16, deviceMemory: 32 },
];
// sortear perfil completo
const { hardwareConcurrency, deviceMemory } = sample(PERFIS_HARDWARE);
```

### Ação 2 — Delay entre buscas no Auto Search

Em `server-core/auto.ts`, dentro do loop `for (const config of configs)`:

```typescript
// Antes de buscar o próximo termo (após processar o anterior)
await new Promise(r => setTimeout(r, randomInt(5000, 30000)));
```

### Ação 3 — Chrome real na VPS

**Passo 1 — Instalar Chrome:**
```bash
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update && sudo apt install google-chrome-stable
```

**Passo 2 — Alterar `search.ts` linha 176-178:**

```typescript
// sem proxy — channel: 'chrome' se Chrome real instalado
channel: 'chrome',
```

**Passo 3 — Se quiser fallback seguro (funciona mesmo sem Chrome real):**

```typescript
channel: process.env.SCRAPER_VPS === 'true' ? 'chrome' : undefined,
```

### Ação 4 — Novos spoofs no init script

Adicionar ao final do bloco `(() => { ... })()` em `criarFingerprintInitScript`:

```typescript
// navigator.connection
Object.defineProperty(navigator, 'connection', {
  get: () => ({
    effectiveType: sample(['4g', '4g', '4g', '3g']),
    downlink: sample([10, 20, 50, 100]),
    rtt: sample([50, 100, 150, 200]),
    saveData: false,
    type: 'ethernet',
  }),
});

// maxTouchPoints (desktop = 0)
Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

// screen.colorDepth / pixelDepth
Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

// window.chrome (objeto runtime)
if (!window.chrome) {
  window.chrome = {
    runtime: {},
    loadTimes: function () {},
    csi: function () {},
    app: {},
  };
}
```

### Ação 5 — Canvas fingerprint com ruído sutil

Adicionar ao init script:

```typescript
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function (...args) {
  const canvas = this;
  if (canvas.width > 16 && canvas.height > 16 && Math.random() < 0.05) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const idx = Math.floor(Math.random() * 4);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageData.data[idx] = imageData.data[idx] ^ 1;
      ctx.putImageData(imageData, 0, 0);
    }
  }
  return origToDataURL.apply(this, args);
};
```

### Ação 6 — Perfis WebGL atualizados

Adicionar ao array `PERFIS` em `fingerprint.ts`:

```typescript
// Windows + NVIDIA RTX 4060
{
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.54 Safari/537.36',
  webglVendor: 'Google Inc. (NVIDIA)',
  webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  platform: 'Win32',
},
// Windows + AMD RX 7600
{
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.53 Safari/537.36',
  webglVendor: 'Google Inc. (AMD)',
  webglRenderer: 'ANGLE (AMD, AMD Radeon RX 7600 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  platform: 'Win32',
},
```

Reduzir a probabilidade de perfis Linux/llvmpipe deixando apenas 1 em vez de 2.

---

## Checklist VPS (ação imediata)

- [ ] `SCRAPER_VPS=true` no `.env` da VPS
- [ ] Google Chrome instalado (`google-chrome-stable`)
- [ ] `channel: 'chrome'` em `search.ts`
- [ ] `AUTO_MAX_CONCURRENCY=1` no `.env`
- [ ] `AUTO_INTERVAL_JITTER_HOURS=12` no `.env`
- [ ] Verificar snapshots em `data/screenshots/*_bloqueado_*.png`

---

## Métricas de Sucesso

- Redução de `ScraperChallengeError` em >50%
- Redução de bloqueios com `"O IP do servidor/VPS pode estar bloqueado"` em >70%
- Aumento da taxa de sucesso na primeira tentativa de <50% para >65%

---

## Leitura Complementar

- `Docs/scraper/anti-detection.md` — documentação geral de anti-detecção
- `Docs/scraper/anti-detection-action-plan.md` — plano anterior (muitos itens já concluídos)
- `Docs/scraper/strategy.md` — estratégia de scraping
