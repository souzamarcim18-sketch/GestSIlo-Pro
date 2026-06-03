'use client';

import { useState, useTransition } from 'react';
import { aprovarSolicitacao, rejeitarSolicitacao } from './actions';

type Status = 'pendente' | 'aprovada' | 'rejeitada';

export interface Solicitacao {
  id: string;
  nome: string;
  email: string;
  fazenda: string;
  whatsapp: string;
  plano: string;
  status: Status;
  criado_em: string;
  aprovado_em: string | null;
  rejeitado_em: string | null;
  observacoes: string | null;
  invite_enviado_em: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

const STATUS_COLOR: Record<Status, string> = {
  pendente: '#f5d000',
  aprovada: '#738D45',
  rejeitada: '#e05252',
};

const STATUS_BG: Record<Status, string> = {
  pendente: 'rgba(245,208,0,0.12)',
  aprovada: 'rgba(115,141,69,0.15)',
  rejeitada: 'rgba(224,82,82,0.12)',
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

type FilterStatus = 'todos' | Status;

export default function SolicitacoesClient({
  initialData,
}: {
  initialData: Solicitacao[];
}) {
  const [items, setItems] = useState<Solicitacao[]>(initialData);
  const [filter, setFilter] = useState<FilterStatus>('todos');
  const [isPending, startTransition] = useTransition();

  // Aprovar
  const [aprovarTarget, setAprovarTarget] = useState<Solicitacao | null>(null);
  const [obsAprovar, setObsAprovar] = useState('');
  const [aprovarError, setAprovarError] = useState('');

  // Rejeitar
  const [rejeitarTarget, setRejeitarTarget] = useState<Solicitacao | null>(null);
  const [motivoRejeitar, setMotivoRejeitar] = useState('');
  const [rejeitarError, setRejeitarError] = useState('');

  const filtered = items.filter((s) => filter === 'todos' || s.status === filter);

  const counts = {
    todos: items.length,
    pendente: items.filter((s) => s.status === 'pendente').length,
    aprovada: items.filter((s) => s.status === 'aprovada').length,
    rejeitada: items.filter((s) => s.status === 'rejeitada').length,
  };

  function handleAprovar() {
    if (!aprovarTarget) return;
    setAprovarError('');
    startTransition(async () => {
      const res = await aprovarSolicitacao(
        aprovarTarget.id,
        aprovarTarget.email,
        aprovarTarget.nome,
        obsAprovar,
      );
      if (res.success) {
        setItems((prev) =>
          prev.map((s) =>
            s.id === aprovarTarget.id
              ? { ...s, status: 'aprovada', aprovado_em: new Date().toISOString(), observacoes: obsAprovar || null }
              : s,
          ),
        );
        setAprovarTarget(null);
        setObsAprovar('');
      } else {
        setAprovarError(res.error ?? 'Erro desconhecido');
      }
    });
  }

  function handleRejeitar() {
    if (!rejeitarTarget) return;
    if (!motivoRejeitar.trim()) {
      setRejeitarError('Motivo é obrigatório');
      return;
    }
    setRejeitarError('');
    startTransition(async () => {
      const res = await rejeitarSolicitacao(rejeitarTarget.id, motivoRejeitar);
      if (res.success) {
        setItems((prev) =>
          prev.map((s) =>
            s.id === rejeitarTarget.id
              ? { ...s, status: 'rejeitada', rejeitado_em: new Date().toISOString(), observacoes: motivoRejeitar }
              : s,
          ),
        );
        setRejeitarTarget(null);
        setMotivoRejeitar('');
      } else {
        setRejeitarError(res.error ?? 'Erro desconhecido');
      }
    });
  }

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: 'todos', label: `Todos (${counts.todos})` },
    { key: 'pendente', label: `Pendente (${counts.pendente})` },
    { key: 'aprovada', label: `Aprovada (${counts.aprovada})` },
    { key: 'rejeitada', label: `Rejeitada (${counts.rejeitada})` },
  ];

  return (
    <div style={{ padding: '40px', color: '#e8e8e8' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#e8e8e8' }}>
          Solicitações de Acesso
        </h1>
        <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
          Gerencie as solicitações de novos produtores.
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
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div style={{ border: '1px solid #2e2e2e', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#222', borderBottom: '1px solid #2e2e2e' }}>
                {['Nome / Fazenda', 'WhatsApp', 'Plano', 'Status', 'Solicitado em', 'Ações'].map(
                  (h) => (
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
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #2a2a2a' : 'none',
                    backgroundColor: 'transparent',
                  }}
                >
                  {/* Nome / Fazenda */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#e8e8e8' }}>{s.nome}</div>
                    <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
                      {s.fazenda}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '1px' }}>
                      {s.email}
                    </div>
                  </td>
                  {/* WhatsApp */}
                  <td style={{ padding: '14px 16px', color: '#bbb', whiteSpace: 'nowrap' }}>
                    {s.whatsapp}
                  </td>
                  {/* Plano */}
                  <td style={{ padding: '14px 16px', color: '#bbb' }}>{s.plano}</td>
                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: STATUS_COLOR[s.status],
                        backgroundColor: STATUS_BG[s.status],
                      }}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  {/* Data */}
                  <td style={{ padding: '14px 16px', color: '#777', whiteSpace: 'nowrap', fontSize: '13px' }}>
                    {formatDate(s.criado_em)}
                  </td>
                  {/* Ações */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    {s.status === 'pendente' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { setAprovarTarget(s); setObsAprovar(''); setAprovarError(''); }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid #738D45',
                            backgroundColor: 'rgba(115,141,69,0.15)',
                            color: '#9ab558',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => { setRejeitarTarget(s); setMotivoRejeitar(''); setRejeitarError(''); }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid #5a2a2a',
                            backgroundColor: 'rgba(224,82,82,0.1)',
                            color: '#e05252',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#444', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Aprovar */}
      {aprovarTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAprovarTarget(null); }}
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
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#e8e8e8', margin: '0 0 8px' }}>
              Aprovar solicitação
            </h2>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 20px' }}>
              Aprovar acesso de <strong style={{ color: '#e8e8e8' }}>{aprovarTarget.nome}</strong> ({aprovarTarget.email})?
              Um convite será enviado imediatamente.
            </p>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
              Observações (opcional)
            </label>
            <textarea
              value={obsAprovar}
              onChange={(e) => setObsAprovar(e.target.value)}
              rows={3}
              placeholder="Mensagem adicional ao solicitante..."
              style={{
                width: '100%',
                backgroundColor: '#1c1c1c',
                border: '1px solid #2e2e2e',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e8e8e8',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {aprovarError && (
              <p style={{ color: '#e05252', fontSize: '13px', marginTop: '8px' }}>{aprovarError}</p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAprovarTarget(null)}
                disabled={isPending}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #2e2e2e',
                  backgroundColor: 'transparent',
                  color: '#888',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAprovar}
                disabled={isPending}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#738D45',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? 'Aprovando...' : 'Confirmar aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejeitar */}
      {rejeitarTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejeitarTarget(null); }}
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
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#e8e8e8', margin: '0 0 8px' }}>
              Rejeitar solicitação
            </h2>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 20px' }}>
              Rejeitar acesso de <strong style={{ color: '#e8e8e8' }}>{rejeitarTarget.nome}</strong>?
            </p>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
              Motivo <span style={{ color: '#e05252' }}>*</span>
            </label>
            <textarea
              value={motivoRejeitar}
              onChange={(e) => { setMotivoRejeitar(e.target.value); setRejeitarError(''); }}
              rows={3}
              placeholder="Informe o motivo da rejeição..."
              style={{
                width: '100%',
                backgroundColor: '#1c1c1c',
                border: `1px solid ${rejeitarError ? '#e05252' : '#2e2e2e'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e8e8e8',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {rejeitarError && (
              <p style={{ color: '#e05252', fontSize: '13px', marginTop: '4px' }}>{rejeitarError}</p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejeitarTarget(null)}
                disabled={isPending}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #2e2e2e',
                  backgroundColor: 'transparent',
                  color: '#888',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRejeitar}
                disabled={isPending}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7a2222',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? 'Rejeitando...' : 'Confirmar rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
