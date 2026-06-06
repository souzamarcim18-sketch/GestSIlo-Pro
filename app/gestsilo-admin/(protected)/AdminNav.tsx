'use client';

export default function AdminNav() {
  return (
    <nav style={{ flex: 1, padding: '0 12px' }}>
      <a
        href="/gestsilo-admin/solicitacoes"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '8px',
          textDecoration: 'none',
          color: '#ccc',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#2a2a2a')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <span style={{ fontSize: '16px' }}>📋</span>
        Solicitações de acesso
      </a>
    </nav>
  );
}
