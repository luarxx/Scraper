import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductCard } from '../components/ProductCard';
import { StateMessage } from '../components/StateMessage';
import { useAutoConfig } from './useAutoConfig';
import { useAutoResults } from './useAutoResults';
import { useSearch } from './useSearch';
import { useWatchAlerts } from './useWatchAlerts';

vi.mock('./usePriceHistory', () => ({
  usePriceHistory: () => ({
    loading: false,
    history: [],
    summary: null,
    erro: null,
    fetchSummary: vi.fn(),
    fetchHistory: vi.fn(),
  }),
}));

function mockFetch(...responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body,
    });
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useSearch', () => {
  it('carrega sites e resultados de busca', async () => {
    const fetchMock = mockFetch(
      { body: [{ key: 'kabum', nome: 'KaBuM!' }] },
      {
        body: {
          termo: 'ssd',
          site: 'kabum',
          siteNome: 'KaBuM!',
          timestamp: '2026-06-05T10:00:00.000Z',
          total: 1,
          produtos: [{ title: 'SSD NVMe', price: 'R$ 299,90', parcelamento: null, image: '', url: 'u', relevancia: 1 }],
        },
      },
    );
    const { result } = renderHook(() => useSearch());

    await act(async () => result.current.fetchSites());
    await act(async () => result.current.search('ssd', 'kabum'));

    expect(result.current.sites).toEqual([{ key: 'kabum', nome: 'KaBuM!' }]);
    expect(result.current.produtos[0].title).toBe('SSD NVMe');
    expect(result.current.loading).toBe(false);
    expect(result.current.erro).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/search?q=ssd&site=kabum');
  });

  it('expõe erro quando a busca retorna falha', async () => {
    mockFetch({
      body: {
        erro: true,
        mensagem: 'Site indisponível',
        termo: 'gpu',
        site: 'kabum',
        siteNome: 'KaBuM!',
        timestamp: '',
        total: 0,
        produtos: [],
      },
    });
    const { result } = renderHook(() => useSearch());

    await act(async () => result.current.search('gpu', 'kabum'));

    expect(result.current.erro).toBe('Site indisponível');
    expect(result.current.produtos).toEqual([]);
  });
});

describe('useAutoConfig', () => {
  it('salva configuração e remove item recarregando a lista', async () => {
    const fetchMock = mockFetch(
      { body: [{ id: 1, termo: 'ssd', site: 'kabum', ordem: 0 }] },
      { body: { ok: true } },
      { body: [] },
    );
    const { result } = renderHook(() => useAutoConfig());

    await act(async () => result.current.saveConfig([{ termo: 'ssd', site: 'kabum' }]));
    expect(result.current.configs).toHaveLength(1);

    await act(async () => result.current.removeConfig(1));
    expect(result.current.configs).toEqual([]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auto/config', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auto/config/1', { method: 'DELETE' });
  });

  it('carrega status da busca automática', async () => {
    mockFetch({ body: { status: 'agendado', ultima_execucao: null, proxima_execucao: null, total_configurados: 2 } });
    const { result } = renderHook(() => useAutoConfig());

    await act(async () => result.current.fetchStatus());

    expect(result.current.status?.total_configurados).toBe(2);
  });
});

describe('useAutoResults', () => {
  it('carrega resultados e informa conflito de execução', async () => {
    mockFetch(
      {
        body: {
          execucao: { id: 1, iniciada_em: '2026-06-05T10:00:00-03:00', finalizada_em: null, status: 'concluido' },
          resultados: [{ id: 1, termo: 'ssd', site: 'kabum', status: 'ok', total: 0, produtos: [], erro: null }],
        },
      },
      { ok: false, status: 409, body: { mensagem: 'Já existe uma execução em andamento' } },
    );
    const { result } = renderHook(() => useAutoResults());

    await act(async () => result.current.fetchResults());
    await act(async () => result.current.triggerRun());

    expect(result.current.resultados[0].termo).toBe('ssd');
    expect(result.current.error).toBe('Já existe uma execução em andamento');
  });
});

describe('useWatchAlerts', () => {
  it('cria alerta, atualiza status e remove alerta', async () => {
    const alert = {
      id: 1,
      nome: 'SSD NVMe',
      url: 'https://www.kabum.com.br/produto/1',
      site: 'kabum',
      canal: 'discord',
      preco_alvo_cents: 29990,
      ultimo_preco_cents: null,
      ultimo_preco_text: null,
      ultimo_parcelamento: null,
      status: 'ativo',
      ativo: true,
      ultimo_check_em: null,
      disparado_em: null,
      erro: null,
      criado_em: '2026-06-05T10:00:00-03:00',
      atualizado_em: '2026-06-05T10:00:00-03:00',
    };
    mockFetch(
      { body: alert },
      { body: { status: 'agendado', ultima_execucao: null, proxima_execucao: null, total_ativos: 1, total_disparados: 0, webhook_configurado: true } },
      { body: { ok: true } },
      { body: { status: 'agendado', ultima_execucao: null, proxima_execucao: null, total_ativos: 0, total_disparados: 0, webhook_configurado: true } },
    );
    const { result } = renderHook(() => useWatchAlerts());

    await act(async () => {
      await result.current.createAlert({
        nome: 'SSD NVMe',
        url: 'https://www.kabum.com.br/produto/1',
        site: 'kabum',
        canal: 'discord',
        preco_alvo: 'R$ 299,90',
      });
    });
    await act(async () => result.current.removeAlert(1));

    expect(result.current.alerts).toEqual([]);
    expect(result.current.status?.total_ativos).toBe(0);
  });

  it('pré-visualiza produto Watch pela URL', async () => {
    const fetchMock = mockFetch({
      body: {
        title: 'SSD NVMe',
        price: 'R$ 299,90',
        parcelamento: null,
        image: '',
        url: 'https://www.kabum.com.br/produto/1',
        relevancia: 0,
        site: 'kabum',
        siteNome: 'KaBuM!',
        timestamp: '2026-06-05T10:00:00.000Z',
      },
    });
    const { result } = renderHook(() => useWatchAlerts());

    const preview = await act(async () => result.current.previewProduct('https://www.kabum.com.br/produto/1', 'kabum'));

    expect(preview.title).toBe('SSD NVMe');
    expect(fetchMock).toHaveBeenCalledWith('/api/watch/preview?url=https%3A%2F%2Fwww.kabum.com.br%2Fproduto%2F1&site=kabum', { signal: undefined });
  });
});

describe('critical UI states', () => {
  it('renderiza estados principais de busca', () => {
    const { rerender } = render(<StateMessage type="initial" />);
    expect(screen.queryByText('Compare antes de comprar')).not.toBeNull();

    rerender(<StateMessage type="loading" />);
    expect(screen.queryByText('Consultando lojas de informatica...')).not.toBeNull();

    rerender(<StateMessage type="empty" />);
    expect(screen.queryByText('Nenhuma oferta encontrada')).not.toBeNull();

    rerender(<StateMessage type="error" message="Falha de rede" />);
    expect(screen.queryByText('Falha de rede')).not.toBeNull();
  });

  it('aciona criação de alerta a partir do ProductCard', async () => {
    const user = userEvent.setup();
    const onCreateAlert = vi.fn();
    const produto = {
      title: 'SSD NVMe 1TB',
      price: 'R$ 299,90',
      parcelamento: '10x de R$ 29,99',
      parcelamento_info: null,
      image: '',
      url: 'https://www.kabum.com.br/produto/1',
      relevancia: 2,
    };

    render(<ProductCard produto={produto} index={0} siteKey="kabum" onCreateAlert={onCreateAlert} />);
    await user.click(screen.getByRole('button', { name: /avisar quando baixar/i }));

    await waitFor(() => expect(onCreateAlert).toHaveBeenCalledWith(produto, 'kabum'));
  });
});
