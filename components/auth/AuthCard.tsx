import { cn } from '@/lib/utils'

interface AuthCardProps {
  children: React.ReactNode
  className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border2 rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-8',
        className
      )}
    >
      <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
      {children}
    </div>
  )
}
