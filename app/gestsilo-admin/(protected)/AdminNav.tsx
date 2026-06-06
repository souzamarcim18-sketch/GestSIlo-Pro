'use client';

const NAV_ITEMS = [
  { href: '/gestsilo-admin/solicitacoes', icon: '📋', label: 'Solicitações de acesso' },
  { href: '/gestsilo-admin/fazendas', icon: '🏡', label: 'Fazendas e planos' },
];

export default function AdminNav() {
  return (
    <nav style={{ flex: 1, padding: '0 12px' }}>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
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
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
