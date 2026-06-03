'use client';

import { useActionState } from 'react';
import { loginAdmin } from './actions';

export default function AdminLoginPage() {
  const [state, action, isPending] = useActionState(loginAdmin, null);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#161616',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '0 24px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#738D45',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                color: '#fff',
              }}
            >
              G
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#e8e8e8',
                letterSpacing: '-0.3px',
              }}
            >
              GestSilo Admin
            </span>
          </div>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
            Painel interno da plataforma
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#222222',
            border: '1px solid #2e2e2e',
            borderRadius: '12px',
            padding: '32px',
          }}
        >
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#e8e8e8',
              margin: '0 0 24px',
            }}
          >
            Entrar
          </h1>

          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="email"
                style={{ fontSize: '13px', color: '#aaa', fontWeight: 500 }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                style={{
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#e8e8e8',
                  fontSize: '14px',
                  padding: '10px 12px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="senha"
                style={{ fontSize: '13px', color: '#aaa', fontWeight: 500 }}
              >
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
                style={{
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#e8e8e8',
                  fontSize: '14px',
                  padding: '10px 12px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {state?.error && (
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#f87171',
                  backgroundColor: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                marginTop: '4px',
                backgroundColor: isPending ? '#4a5e2a' : '#738D45',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {isPending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
