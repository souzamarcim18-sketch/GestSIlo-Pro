import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAdminSession } from '@/lib/admin-auth';

async function logoutAction() {
  'use server';
  const { cookies: cookieStore } = await import('next/headers');
  const store = await cookieStore();
  store.set('gestsilo_admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  redirect('/gestsilo-admin/login');
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = getAdminSession(cookieStore);

  if (!session) {
    redirect('/gestsilo-admin/login');
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#1c1c1c',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: '#222222',
          borderRight: '1px solid #2e2e2e',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '0 20px 24px',
            borderBottom: '1px solid #2e2e2e',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#738D45',
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              G
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8e8' }}>
                GestSilo
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>
                Painel Admin
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          <a
            href="/gestsilo-admin"
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

        {/* Sair */}
        <div style={{ padding: '16px 12px 0', borderTop: '1px solid #2e2e2e' }}>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#888',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>🚪</span>
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
