'use client';

import { useState, useTransition } from 'react';
import { alterarPlanoFazenda } from './actions';

type Plano = 'free' | 'starter' | 'pro' | 'max';

export interface FazendaRow {
  id: string;
  nome: string;
  dono_nome: string | null;
  dono_email: string | null;
  plano_atual: string;
  created_at: string;
}

const PLANO_LABEL: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
};

const PLANO_COLOR: Record<string, string> = {
  free: '#888',
  starter: '#4a9eff',
  pro: '#738D45',
  max: '#f5d000',
};

const PLANO_BG: Record<string, string> = {
  free: 'rgba(136,136,136,0.12)',
  starter: 'rgba(74,158,255,0.12)',
  pro: 'rgba(115,141,69,0.15)',
  max: 'rgba(245,208,0,0.12)',
};

type FilterPlano = 'todos' | Plano;

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

export default function FazendasClient({ initialData }: { initialData: FazendaRow[] }) {
  const [items, setItems] = useState<FazendaRow[]>(initialData);
  const [filter, setFilter] = useState<FilterPlano>('todos');
  const [isPending, startTransition] = useTransition();

  const [alterarTarget, setAlterarTarget] = useState<FazendaRow | null>(null);
  const [novoPlano, setNovoPlano] = useState<Plano>('free');
  const [alterarError, setAlterarError] = useState('');

  const filtered = items.filter((f) => filter === 'todos' || f.plano_atual === filter);

  const counts: Record<FilterPlano, number> = {
    todos: items.length,
    free: items.filter((f) => f.plano_atual === 'free').length,
    starter: items.filter((f) => f.plano_atual === 'starter').length,
    pro: items.filter((f) => f.plano_atual === 'pro').length,
    max: items.filter((f) => f.plano_atual === 'max').length,
  };

  function openModal(fazenda: FazendaRow) {
    setAlterarTarget(fazenda);
    setNovoPlano((fazenda.plano_atual as Plano) ?? 'free');
    setAlterarError('');
  }

  function handleAlterar() {
    if (!alterarTarget) return;
    setAlterarError('');
    startTransition(async () => {
      const res = await alterarPlanoFazenda(alterarTarget.id, alterarTarget.plano_atual, novoPlano);
      if (res.success) {
        setItems((prev) =>
          prev.map((f) =>
            f.id === alterarTarget.id ? { ...f, plano_atual: novoPlano } : f,
          ),
        );
        setAlterarTarget(null);
      } else {
        setAlterarError(res.error ?? 'Erro desconhecido');
      }
    });
  }

  const filterTabs: { key: FilterPlano; label: string }[] = [
    { key: 'todos', label: `Todos (${counts.todos})` },
    { key: 'free', label: `Free (${counts.free})` },
    { key: 'starter', label: `Starter (${counts.starter})` },
    { key: 'pro', label: `Pro (${counts.pro})` },
    { key: 'max', label: `Max (${counts.max})` },
  ];

  return (
    <div style={{ padding: '40px', color: '#e8e8e8' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#e8e8e8' }}>
          Fazendas e Planos
        </h1>
        <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
          Gerencie as fazendas cadastradas e seus planos de assinatura.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filter === tab.key ? '#738D45' : '#2e2e2e',
              backgroundColor: filter === tab.key ? 'rgba(115,141,69,0.15)' : 'transparent',
              color: filter === tab.key ? '#9ab558' : '#888',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#555',
            fontSize: '14px',
            border: '1px solid #2e2e2e',
            borderRadius: '10px',
          }}
        >
          Nenhuma fazenda encontrada.
        </div>
      ) : (
        <div style={{ border: '1px solid #2e2e2e', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#222', borderBottom: '1px solid #2e2e2e' }}>
                {['Fazenda', 'Responsável', 'Plano', 'Cadastrado em', 'Ações'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: '#666',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #2a2a2a' : 'none',
                  }}
                >
                  {/* Fazenda */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#e8e8e8' }}>{f.nome}</div>
                  </td>
                  {/* Responsável */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#bbb' }}>{f.dono_nome ?? '—'}</div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                      {f.dono_email ?? ''}
                    </div>
                  </td>
                  {/* Plano */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: PLANO_COLOR[f.plano_atual] ?? '#888',
                        backgroundColor: PLANO_BG[f.plano_atual] ?? 'rgba(136,136,136,0.12)',
                      }}
                    >
                      {PLANO_LABEL[f.plano_atual] ?? f.plano_atual}
                    </span>
                  </td>
                  {/* Data */}
                  <td style={{ padding: '14px 16px', color: '#777', whiteSpace: 'nowrap', fontSize: '13px' }}>
                    {formatDate(f.created_at)}
                  </td>
                  {/* Ações */}
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => openModal(f)} style={btnStyleGreen()}>
                      Alterar plano
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Alterar Plano */}
      {alterarTarget && (
        <Modal onClose={() => setAlterarTarget(null)}>
          <h2 style={modalTitle}>Alterar plano</h2>
          <p style={modalDesc}>
            Fazenda: <strong style={{ color: '#e8e8e8' }}>{alterarTarget.nome}</strong>
          </p>
          <p style={{ ...modalDesc, marginTop: '-12px' }}>
            Plano atual:{' '}
            <span style={{ color: PLANO_COLOR[alterarTarget.plano_atual] ?? '#888', fontWeight: 600 }}>
              {PLANO_LABEL[alterarTarget.plano_atual] ?? alterarTarget.plano_atual}
            </span>
          </p>

          <label style={labelStyle}>Novo plano</label>
          <select
            value={novoPlano}
            onChange={(e) => setNovoPlano(e.target.value as Plano)}
            style={selectStyle}
          >
            <option value="free">Free — Grátis</option>
            <option value="starter">Starter — R$ 49/mês</option>
            <option value="pro">Pro — R$ 74/mês</option>
            <option value="max">Max — R$ 119/mês</option>
          </select>

          {alterarError && <p style={errorStyle}>{alterarError}</p>}

          <div style={modalFooter}>
            <button
              onClick={() => setAlterarTarget(null)}
              disabled={isPending}
              style={btnStyleGhost()}
            >
              Cancelar
            </button>
            <button
              onClick={handleAlterar}
              disabled={isPending || novoPlano === alterarTarget.plano_atual}
              style={{ ...btnStyleGreen(), padding: '8px 18px', fontSize: '14px', opacity: isPending || novoPlano === alterarTarget.plano_atual ? 0.5 : 1 }}
            >
              {isPending ? 'Salvando...' : 'Confirmar alteração'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#222',
          borderRadius: '12px',
          border: '1px solid #2e2e2e',
          padding: '28px',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function btnStyleGreen(): React.CSSProperties {
  return {
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #738D45',
    backgroundColor: 'rgba(115,141,69,0.15)',
    color: '#9ab558',
    whiteSpace: 'nowrap',
  };
}

function btnStyleGhost(): React.CSSProperties {
  return {
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #2e2e2e',
    backgroundColor: 'transparent',
    color: '#888',
    whiteSpace: 'nowrap',
  };
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1c1c1c',
  border: '1px solid #2e2e2e',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e8e8e8',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '4px',
};

const modalTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#e8e8e8', margin: '0 0 8px' };
const modalDesc: React.CSSProperties = { fontSize: '14px', color: '#888', margin: '0 0 20px' };
const modalFooter: React.CSSProperties = { display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' };
const errorStyle: React.CSSProperties = { color: '#e05252', fontSize: '13px', marginTop: '8px' };
