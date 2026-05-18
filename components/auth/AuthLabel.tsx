interface AuthLabelProps {
  htmlFor: string
  children: React.ReactNode
}

export function AuthLabel({ htmlFor, children }: AuthLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground"
    >
      {children}
    </label>
  )
}
