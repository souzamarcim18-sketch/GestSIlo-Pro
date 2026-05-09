import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg px-3 py-1 text-sm text-[#dceede] placeholder:text-[#688070] outline-none transition-all focus:border-[rgba(0,196,90,0.5)] focus:ring-2 focus:ring-[rgba(0,196,90,0.15)] focus:outline-none disabled:pointer-events-none disabled:opacity-50 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#dceede] aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.052)',
        border: '1px solid rgba(255,255,255,0.065)',
        borderRadius: '8px',
        ...style,
      }}
      {...props}
    />
  )
}

export { Input }
