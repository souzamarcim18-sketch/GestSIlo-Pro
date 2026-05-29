import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-ring/50 focus:ring-2 focus:ring-ring/15 focus:outline-none disabled:pointer-events-none disabled:opacity-50 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      style={{
        background: 'var(--input)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        ...style,
      }}
      {...props}
    />
  )
}

export { Input }
