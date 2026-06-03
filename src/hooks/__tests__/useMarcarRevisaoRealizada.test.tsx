import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ----- Mock do client Supabase -----
// Builder fluente que captura a sequência de chamadas por tabela e
// permite injetar a resposta final via `then`.
const calls: Array<{ table: string; op: string; payload?: unknown }> = [];

// Cada tabela tem uma fila de respostas para os seus accessors finais
// (single / maybeSingle / "await" direto após update/insert).
const responses: Record<string, Array<{ data: unknown; error: unknown }>> = {};

function pushResponse(table: string, data: unknown, error: unknown = null) {
  responses[table] = responses[table] || [];
  responses[table].push({ data, error });
}

function buildQuery(table: string, op: string, payload?: unknown) {
  calls.push({ table, op, payload });

  const resolve = () => {
    const next = (responses[table] || []).shift();
    return Promise.resolve(next ?? { data: null, error: null });
  };

  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(resolve),
    maybeSingle: vi.fn(resolve),
    // Permite `await supabase.from(...).update(...).eq(...)` resolver direto
    then: (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve().then(onFulfilled),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: (..._args: unknown[]) => buildQuery(table, 'select'),
      insert: (payload: unknown) => buildQuery(table, 'insert', payload),
      update: (payload: unknown) => buildQuery(table, 'update', payload),
      delete: () => buildQuery(table, 'delete'),
    }),
  },
}));

// Importa o hook DEPOIS do mock
import { useMarcarRevisaoRealizada } from '../useFleetData';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(responses)) delete responses[k];
});

describe('useMarcarRevisaoRealizada', () => {
  it('insere no histórico e atualiza a revisão (unidade Km)', async () => {
    // fetch da revisão
    pushResponse('revisoes', {
      id: 'rev-1',
      veiculo_id: 'v-1',
      tipo_revisao_id: 't-1',
      oficina_id: 'of-1',
      ordem_servico: 'OS-123',
      nota_fiscal_url: 'path/nf.pdf',
      observacoes: 'troca de óleo',
      valor: 500,
      unidade: 'Km',
    });
    // busca OS aberta (sem OS encontrada -> tempo nulo)
    pushResponse('ordens_servico', null);
    // insert no histórico
    pushResponse('historico_revisoes', null);
    // update da revisao
    pushResponse('revisoes', null);

    const { result } = renderHook(() => useMarcarRevisaoRealizada(), { wrapper });

    result.current.mutate({ revisaoId: 'rev-1', kmAtual: 15000, horaAtual: 0 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insert = calls.find((c) => c.table === 'historico_revisoes' && c.op === 'insert');
    expect(insert).toBeDefined();
    const payload = insert!.payload as Record<string, unknown>;
    expect(payload.revisao_id).toBe('rev-1');
    expect(payload.veiculo_id).toBe('v-1');
    expect(payload.tipo_revisao_id).toBe('t-1');
    expect(payload.oficina_id).toBe('of-1');
    expect(payload.km_realizacao).toBe(15000);
    expect(payload.hora_realizacao).toBeNull();
    expect(payload.valor).toBe(500);
    expect(payload.ordem_servico).toBe('OS-123');
    expect(payload.nota_fiscal_url).toBe('path/nf.pdf');
    expect(payload.observacoes).toBe('troca de óleo');
    expect(payload.tempo_servico_dias).toBeNull();

    const update = calls.find((c) => c.table === 'revisoes' && c.op === 'update');
    expect(update).toBeDefined();
    const updPayload = update!.payload as Record<string, unknown>;
    expect(updPayload.status_execucao).toBe('realizada');
    expect(updPayload.km_revisao).toBe(15000);
    expect(updPayload.hora_revisao).toBeNull();
  });

  it('calcula tempo_servico_dias quando há OS aberta vinculada', async () => {
    pushResponse('revisoes', {
      id: 'rev-2',
      veiculo_id: 'v-2',
      tipo_revisao_id: 't-2',
      oficina_id: null,
      ordem_servico: null,
      nota_fiscal_url: null,
      observacoes: null,
      valor: null,
      unidade: 'Hr',
    });

    const hoje = new Date();
    const cincoDiasAtras = new Date(hoje.getTime() - 5 * 24 * 60 * 60 * 1000);
    pushResponse('ordens_servico', {
      id: 'os-1',
      data_entrada: cincoDiasAtras.toISOString().split('T')[0],
    });
    pushResponse('historico_revisoes', null);
    pushResponse('revisoes', null);

    const { result } = renderHook(() => useMarcarRevisaoRealizada(), { wrapper });
    result.current.mutate({ revisaoId: 'rev-2', kmAtual: 0, horaAtual: 1200 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insert = calls.find((c) => c.table === 'historico_revisoes' && c.op === 'insert');
    const payload = insert!.payload as Record<string, unknown>;
    expect(payload.tempo_servico_dias).toBe(5);
    expect(payload.hora_realizacao).toBe(1200);
    expect(payload.km_realizacao).toBeNull();
  });

  it('propaga erro quando o insert no histórico falha', async () => {
    pushResponse('revisoes', {
      id: 'rev-3',
      veiculo_id: 'v-3',
      tipo_revisao_id: 't-3',
      oficina_id: null,
      ordem_servico: null,
      nota_fiscal_url: null,
      observacoes: null,
      valor: null,
      unidade: 'Km',
    });
    pushResponse('ordens_servico', null);
    pushResponse('historico_revisoes', null, { message: 'permission denied' });

    const { result } = renderHook(() => useMarcarRevisaoRealizada(), { wrapper });
    result.current.mutate({ revisaoId: 'rev-3', kmAtual: 100, horaAtual: 0 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // O update da revisao não deve ter ocorrido
    const update = calls.find((c) => c.table === 'revisoes' && c.op === 'update');
    expect(update).toBeUndefined();
  });
});
