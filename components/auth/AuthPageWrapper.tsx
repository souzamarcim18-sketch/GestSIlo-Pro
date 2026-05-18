'use client'

import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'

interface AuthPageWrapperProps {
  children: React.ReactNode
  showGrid?: boolean
  showBackButton?: boolean
  gridId?: string
}

export function AuthPageWrapper({
  children,
  showGrid = true,
  showBackButton = true,
  gridId = 'grid-auth',
}: AuthPageWrapperProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">
      {showGrid && (
        <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={gridId} width="60" height="60" patternUnits="userSpaceOnUse">
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="var(--brand-green-vivid)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
        </div>
      )}

      {showBackButton && (
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-card hover:text-brand-primary transition-all shadow-md cursor-pointer"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Voltar ao Início
        </button>
      )}

      {children}
    </div>
  )
}
