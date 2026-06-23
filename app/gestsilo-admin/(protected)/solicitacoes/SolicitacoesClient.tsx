'use client';

import { useState, useTransition } from 'react';
import { aprovarSolicitacao, rejeitarSolicitacao, arquivarSolicitacao, deletarSolicitacao, reenviarLink } from './actions';

type Status = 'pendente' | 'aprovada' | 'rejeitada' | 'arquivada';

export interface Solicitacao {
  id: string;
  nome: string;
  email: string;
  nome_fazenda: string;
  whatsapp: string;
  plano_solicitado: string;
  status: Status;
  created_at: string;
  aprovado_em: string | null;
  rejeitado_em: string | null;
  observacoes: string | null;
  invite_enviado_em: string | null;
  arquivada_em: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  arquivada: 'Arquivada',
};

const STATUS_COLOR: Record<Status, string> = {
  pendente: '#f5d000',
  aprovada: '#738D45',
  rejeitada: '#e05252',
  arquivada: '#555',
};

const STATUS_BG: Record<Status, string> = {
  pendente: 'rgba(245,208,0,0.12)',
  aprovada: 'rgba(115,141,69,0.15)',
  rejeitada: 'rgba(224,82,82,0.12)',
  arquivada: 'rgba(85,85,85,0.15)',
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

type FilterStatus = 'todos' | 'arquivadas' | Status;

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

  // Arquivar
  const [arquivarTarget, setArquivarTarget] = useState<Solicitacao | null>(null);
  const [arquivarError, setArquivarError] = useState('');

  // Deletar
  const [deletarTarget, setDeletarTarget] = useState<Solicitacao | null>(null);
  const [deletarError, setDeletarError] = useState('');

  // Reenviar link
  const [reenviarTarget, setReenviarTarget] = useState<Solicitacao | null>(null);
  const [reenviarError, setReenviarError] = useState('');
  const [reenviarOk, setReenviarOk] = useState(false);

  // "todos" exclui arquivadas — arquivadas só aparecem no filtro "arquivadas"
  const filtered = items.filter((s) => {
    if (filter === 'todos') return s.status !== 'arquivada';
    if (filter === 'arquivadas') return s.status === 'arquivada';
    return s.status === filter;
  });

  const counts = {
    todos: items.filter((s) => s.status !== 'arquivada').length,
    pendente: items.filter((s) => s.status === 'pendente').length,
    aprovada: items.filter((s) => s.status === 'aprovada').length,
    rejeitada: items.filter((s) => s.status === 'rejeitada').length,
    arquivadas: items.filter((s) => s.status === 'arquivada').length,
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
              ? { ...s, status: 'aprovada' as Status, aprovado_em: new Date().toISOString(), observacoes: obsAprovar || null }
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
              ? { ...s, status: 'rejeitada' as Status, rejeitado_em: new Date().toISOString(), observacoes: motivoRejeitar }
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

  function handleArquivar() {
    if (!arquivarTarget) return;
    setArquivarError('');
    startTransition(async () => {
      const res = await arquivarSolicitacao(arquivarTarget.id);
      if (res.success) {
        setItems((prev) =>
          prev.map((s) =>
            s.id === arquivarTarget.id
              ? { ...s, status: 'arquivada' as Status }
              : s,
          ),
        );
        setArquivarTarget(null);
      } else {
        setArquivarError(res.error ?? 'Erro desconhecido');
      }
    });
  }

  function handleDeletar() {
    if (!deletarTarget) return;
    setDeletarError('');
    startTransition(async () => {
      const res = await deletarSolicitacao(deletarTarget.id);
      if (res.success) {
        setItems((prev) => prev.filter((s) => s.id !== deletarTarget.id));
        setDeletarTarget(null);
      } else {
        setDeletarError(res.error ?? 'Erro desconhecido');
      }
    });
  }

  function handleReenviar() {
    if (!reenviarTarget) return;
    setReenviarError('');
    setReenviarOk(false);
    startTransition(async () => {
      const res = await reenviarLink(
        reenviarTarget.id,
        reenviarTarget.email,
        reenviarTarget.nome,
        reenviarTarget.observacoes ?? '',
      );
      if (res.success) {
        setItems((prev) =>
          prev.map((s) =>
            s.id === reenviarTarget.id
              ? { ...s, invite_enviado_em: new Date().toISOString() }
              : s,
          ),
        );
        setReenviarOk(true);
      } else {
        setReenviarError(res.error ?? 'Erro desconhecido');
      }
    });
  }

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: 'todos', label: `Todos (${counts.todos})` },
    { key: 'pendente', label: `Pendente (${counts.pendente})` },
    { key: 'aprovada', label: `Aprovada (${counts.aprovada})` },
    { key: 'rejeitada', label: `Rejeitada (${counts.rejeitada})` },
    { key: 'arquivadas', label: `Arquivadas (${counts.arquivadas})` },
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
                    opacity: s.status === 'arquivada' ? 0.6 : 1,
                  }}
                >
                  {/* Nome / Fazenda */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#e8e8e8' }}>{s.nome}</div>
                    <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
                      {s.nome_fazenda}
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
                  <td style={{ padding: '14px 16px', color: '#bbb' }}>{s.plano_solicitado}</td>
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
                    {formatDate(s.created_at)}
                  </td>
                  {/* Ações */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {s.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => { setAprovarTarget(s); setObsAprovar(''); setAprovarError(''); }}
                            style={btnStyle('green')}
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => { setRejeitarTarget(s); setMotivoRejeitar(''); setRejeitarError(''); }}
                            style={btnStyle('red')}
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {s.status === 'aprovada' && (
                        <button
                          onClick={() => { setReenviarTarget(s); setReenviarError(''); setReenviarOk(false); }}
                          style={btnStyle('green')}
                        >
                          Reenviar link
                        </button>
                      )}
                      {s.status !== 'arquivada' && (
                        <button
                          onClick={() => { setArquivarTarget(s); setArquivarError(''); }}
                          style={btnStyle('gray')}
                        >
                          Arquivar
                        </button>
                      )}
                      <button
                        onClick={() => { setDeletarTarget(s); setDeletarError(''); }}
                        style={btnStyle('darkred')}
                      >
                        Deletar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Aprovar */}
      {aprovarTarget && (
        <Modal onClose={() => setAprovarTarget(null)}>
          <h2 style={modalTitle}>Aprovar solicitação</h2>
          <p style={modalDesc}>
            Aprovar acesso de <strong style={{ color: '#e8e8e8' }}>{aprovarTarget.nome}</strong> ({aprovarTarget.email})?
            Um convite será enviado imediatamente.
          </p>
          <label style={labelStyle}>Observações (opcional)</label>
          <textarea
            value={obsAprovar}
            onChange={(e) => setObsAprovar(e.target.value)}
            rows={3}
            placeholder="Mensagem adicional ao solicitante..."
            style={textareaStyle()}
          />
          {aprovarError && <p style={errorStyle}>{aprovarError}</p>}
          <div style={modalFooter}>
            <button onClick={() => setAprovarTarget(null)} disabled={isPending} style={btnStyle('ghost')}>
              Cancelar
            </button>
            <button onClick={handleAprovar} disabled={isPending} style={{ ...btnStyle('green'), opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'Aprovando...' : 'Confirmar aprovação'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Rejeitar */}
      {rejeitarTarget && (
        <Modal onClose={() => setRejeitarTarget(null)}>
          <h2 style={modalTitle}>Rejeitar solicitação</h2>
          <p style={modalDesc}>
            Rejeitar acesso de <strong style={{ color: '#e8e8e8' }}>{rejeitarTarget.nome}</strong>?
          </p>
          <label style={labelStyle}>
            Motivo <span style={{ color: '#e05252' }}>*</span>
          </label>
          <textarea
            value={motivoRejeitar}
            onChange={(e) => { setMotivoRejeitar(e.target.value); setRejeitarError(''); }}
            rows={3}
            placeholder="Informe o motivo da rejeição..."
            style={textareaStyle(!!rejeitarError)}
          />
          {rejeitarError && <p style={errorStyle}>{rejeitarError}</p>}
          <div style={modalFooter}>
            <button onClick={() => setRejeitarTarget(null)} disabled={isPending} style={btnStyle('ghost')}>
              Cancelar
            </button>
            <button onClick={handleRejeitar} disabled={isPending} style={{ ...btnStyle('red'), opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'Rejeitando...' : 'Confirmar rejeição'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Arquivar */}
      {arquivarTarget && (
        <Modal onClose={() => setArquivarTarget(null)}>
          <h2 style={modalTitle}>Arquivar solicitação</h2>
          <p style={modalDesc}>
            Arquivar a solicitação de <strong style={{ color: '#e8e8e8' }}>{arquivarTarget.nome}</strong>?
            A solicitação será ocultada da lista principal, mas permanecerá no banco de dados.
          </p>
          {arquivarError && <p style={errorStyle}>{arquivarError}</p>}
          <div style={modalFooter}>
            <button onClick={() => setArquivarTarget(null)} disabled={isPending} style={btnStyle('ghost')}>
              Cancelar
            </button>
            <button onClick={handleArquivar} disabled={isPending} style={{ ...btnStyle('gray'), opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'Arquivando...' : 'Confirmar arquivo'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Deletar */}
      {deletarTarget && (
        <Modal onClose={() => setDeletarTarget(null)}>
          <h2 style={{ ...modalTitle, color: '#e05252' }}>Deletar solicitação</h2>
          <p style={modalDesc}>
            Tem certeza que deseja <strong style={{ color: '#e8e8e8' }}>deletar permanentemente</strong> a
            solicitação de <strong style={{ color: '#e8e8e8' }}>{deletarTarget.nome}</strong> ({deletarTarget.email})?
          </p>
          <p style={{ ...modalDesc, color: '#7a3535', backgroundColor: 'rgba(224,82,82,0.08)', padding: '10px 12px', borderRadius: '8px', marginTop: '0' }}>
            Esta ação não pode ser desfeita.
          </p>
          {deletarError && <p style={errorStyle}>{deletarError}</p>}
          <div style={modalFooter}>
            <button onClick={() => setDeletarTarget(null)} disabled={isPending} style={btnStyle('ghost')}>
              Cancelar
            </button>
            <button onClick={handleDeletar} disabled={isPending} style={{ ...btnStyle('darkred'), padding: '8px 18px', fontSize: '14px', opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'Deletando...' : 'Deletar permanentemente'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Reenviar link */}
      {reenviarTarget && (
        <Modal onClose={() => { setReenviarTarget(null); setReenviarOk(false); }}>
          <h2 style={modalTitle}>Reenviar link de acesso</h2>
          {reenviarOk ? (
            <>
              <p style={{ ...modalDesc, color: '#9ab558' }}>
                Link reenviado para <strong style={{ color: '#e8e8e8' }}>{reenviarTarget.email}</strong>.
              </p>
              <div style={modalFooter}>
                <button onClick={() => { setReenviarTarget(null); setReenviarOk(false); }} style={btnStyle('ghost')}>
                  Fechar
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={modalDesc}>
                Gerar um novo link de criação de senha e reenviar por e-mail para{' '}
                <strong style={{ color: '#e8e8e8' }}>{reenviarTarget.nome}</strong> ({reenviarTarget.email})?
              </p>
              {reenviarError && <p style={errorStyle}>{reenviarError}</p>}
              <div style={modalFooter}>
                <button onClick={() => setReenviarTarget(null)} disabled={isPending} style={btnStyle('ghost')}>
                  Cancelar
                </button>
                <button onClick={handleReenviar} disabled={isPending} style={{ ...btnStyle('green'), opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? 'Reenviando...' : 'Reenviar link'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── helpers de estilo ──────────────────────────────────────────────────────────

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

type BtnVariant = 'green' | 'red' | 'darkred' | 'gray' | 'ghost';

function btnStyle(variant: BtnVariant): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid',
    whiteSpace: 'nowrap',
  };
  switch (variant) {
    case 'green':
      return { ...base, borderColor: '#738D45', backgroundColor: 'rgba(115,141,69,0.15)', color: '#9ab558' };
    case 'red':
      return { ...base, borderColor: '#5a2a2a', backgroundColor: 'rgba(224,82,82,0.1)', color: '#e05252' };
    case 'darkred':
      return { ...base, borderColor: '#7a2222', backgroundColor: 'rgba(122,34,34,0.3)', color: '#e05252' };
    case 'gray':
      return { ...base, borderColor: '#3a3a3a', backgroundColor: 'rgba(255,255,255,0.04)', color: '#888' };
    case 'ghost':
      return { ...base, borderColor: '#2e2e2e', backgroundColor: 'transparent', color: '#888', fontSize: '14px', padding: '8px 18px' };
  }
}

const modalTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#e8e8e8', margin: '0 0 8px' };
const modalDesc: React.CSSProperties = { fontSize: '14px', color: '#888', margin: '0 0 20px' };
const modalFooter: React.CSSProperties = { display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' };
const errorStyle: React.CSSProperties = { color: '#e05252', fontSize: '13px', marginTop: '8px' };

function textareaStyle(hasError = false): React.CSSProperties {
  return {
    width: '100%',
    backgroundColor: '#1c1c1c',
    border: `1px solid ${hasError ? '#e05252' : '#2e2e2e'}`,
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#e8e8e8',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  };
}
