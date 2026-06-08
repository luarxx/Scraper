export interface Fingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  plugins: PluginFingerprint[];
  hardwareConcurrency: number;
  deviceMemory: number;
  languages: string[];
  platform: string;
  webglVendor: string;
  webglRenderer: string;
}

interface PluginFingerprint {
  name: string;
  filename: string;
  description: string;
  mimeTypes: Array<{ type: string; suffixes: string; description: string }>;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.54 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.53 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.217 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.216 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.179 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.215 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.178 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.54 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.216 Safari/537.36',
];

const WEBGL_PROFILES = [
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
  { vendor: 'Apple Inc.', renderer: 'Apple M1' },
  { vendor: 'Google Inc.', renderer: 'ANGLE (Mesa, llvmpipe (LLVM 17.0.6, 256 bits), OpenGL 4.5)' },
];

const PLUGIN_POOL: PluginFingerprint[] = [
  {
    name: 'PDF Viewer',
    filename: 'internal-pdf-viewer',
    description: 'Portable Document Format',
    mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }],
  },
  {
    name: 'Chrome PDF Viewer',
    filename: 'internal-pdf-viewer',
    description: 'Portable Document Format',
    mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }],
  },
  {
    name: 'Chromium PDF Viewer',
    filename: 'internal-pdf-viewer',
    description: 'Portable Document Format',
    mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }],
  },
  {
    name: 'Microsoft Edge PDF Viewer',
    filename: 'internal-pdf-viewer',
    description: 'Portable Document Format',
    mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }],
  },
  {
    name: 'WebKit built-in PDF',
    filename: 'internal-pdf-viewer',
    description: 'Portable Document Format',
    mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }],
  },
];

const lastFingerprintBySite = new Map<string, string>();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function gerarFingerprint(siteKey: string): Fingerprint {
  let fingerprint: Fingerprint;
  let assinatura: string;

  do {
    const userAgent = sample(USER_AGENTS);
    const webgl = sample(WEBGL_PROFILES);
    const platform = userAgent.includes('Macintosh') ? 'MacIntel' : userAgent.includes('Linux') ? 'Linux x86_64' : 'Win32';
    fingerprint = {
      userAgent,
      viewport: {
        width: 1920 + randomInt(-200, 200),
        height: 1080 + randomInt(-100, 100),
      },
      plugins: shuffle(PLUGIN_POOL).slice(0, randomInt(3, 5)),
      hardwareConcurrency: sample([4, 6, 8, 10, 12, 16]),
      deviceMemory: sample([4, 8]),
      languages: ['pt-BR', 'pt', 'en-US', 'en'],
      platform,
      webglVendor: webgl.vendor,
      webglRenderer: webgl.renderer,
    };
    assinatura = `${fingerprint.userAgent}|${fingerprint.viewport.width}x${fingerprint.viewport.height}|${fingerprint.webglVendor}|${fingerprint.webglRenderer}`;
  } while (lastFingerprintBySite.get(siteKey) === assinatura);

  lastFingerprintBySite.set(siteKey, assinatura);
  return fingerprint;
}

export function criarFingerprintInitScript(fingerprint: Fingerprint): string {
  return `
    (() => {
      const fp = ${JSON.stringify(fingerprint)};
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
      Object.defineProperty(navigator, 'languages', { get: () => fp.languages });
      Object.defineProperty(navigator, 'language', { get: () => fp.languages[0] });
      Object.defineProperty(navigator, 'platform', { get: () => fp.platform });

      const mimeTypes = [];
      const pluginList = fp.plugins.map((plugin) => {
        const pluginMimeTypes = plugin.mimeTypes.map((mimeType, mimeIndex) => {
          const item = { ...mimeType, enabledPlugin: null };
          mimeTypes.push(item);
          return { item, mimeIndex };
        });
        const pluginObject = {
          name: plugin.name,
          filename: plugin.filename,
          description: plugin.description,
          length: pluginMimeTypes.length,
          item: (i) => pluginMimeTypes[i]?.item || null,
          namedItem: (name) => pluginMimeTypes.find(({ item }) => item.type === name)?.item || null,
        };
        pluginMimeTypes.forEach(({ item, mimeIndex }) => {
          item.enabledPlugin = pluginObject;
          Object.defineProperty(pluginObject, mimeIndex, { value: item, enumerable: true });
        });
        return pluginObject;
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => ({
          ...pluginList,
          length: pluginList.length,
          item: (i) => pluginList[i] || null,
          namedItem: (name) => pluginList.find((plugin) => plugin.name === name) || null,
          [Symbol.iterator]: function* () { for (const p of pluginList) yield p; },
        }),
      });
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => ({
          ...mimeTypes,
          length: mimeTypes.length,
          item: (i) => mimeTypes[i] || null,
          namedItem: (name) => mimeTypes.find((mimeType) => mimeType.type === name) || null,
          [Symbol.iterator]: function* () { for (const mimeType of mimeTypes) yield mimeType; },
        }),
      });

      const origGetParam = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (p) {
        if (p === 37445) return fp.webglVendor;
        if (p === 37446) return fp.webglRenderer;
        return origGetParam.call(this, p);
      };
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (p) {
          if (p === 37445) return fp.webglVendor;
          if (p === 37446) return fp.webglRenderer;
          return origGetParam2.call(this, p);
        };
      }
    })();
  `;
}

