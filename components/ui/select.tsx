"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

// Contexto interno para mapear value → label e exibir corretamente no trigger.
// `hasItems` indica que o caller passou `items` ao <Select>, caso em que o Base UI
// resolve o label nativamente e o fallback do mapa não deve ser usado.
type SelectItemsMapContextValue = {
  mapRef: React.RefObject<Map<string, React.ReactNode>>
  hasItems: boolean
}
const SelectItemsMapContext = React.createContext<SelectItemsMapContextValue | null>(null)

function Select<Value = string, Multiple extends boolean | undefined = false>({
  children,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const mapRef = React.useRef<Map<string, React.ReactNode>>(new Map())
  const hasItems = props.items != null
  const ctx = React.useMemo<SelectItemsMapContextValue>(
    () => ({ mapRef, hasItems }),
    [hasItems]
  )
  return (
    <SelectItemsMapContext.Provider value={ctx}>
      <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
    </SelectItemsMapContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, children, placeholder, ...props }: SelectPrimitive.Value.Props) {
  const ctx = React.useContext(SelectItemsMapContext)
  // Quando o caller passa `items` ao <Select> (Select.Root), o Base UI resolve o
  // label nativamente — inclusive com o popup fechado. Nesse caso não sobrescrevemos
  // `children`, para não cair no fallback do mapa (que só popula ao abrir o popup e
  // exibiria o valor cru, ex: UUID). Sem `items`, mantemos o fallback via mapa.
  const hasItems = ctx?.hasItems ?? false
  const mapRef = ctx?.mapRef
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      placeholder={placeholder}
      {...props}
    >
      {children ?? (hasItems ? undefined : (value: unknown) => {
        if (value == null || value === '') return null
        const label = mapRef?.current.get(String(value))
        return label ?? String(value)
      })}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-ring/50 focus:ring-2 focus:ring-ring/15 disabled:pointer-events-none disabled:opacity-50 data-placeholder:text-muted-foreground data-[size=sm]:h-7 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      style={{
        background: 'var(--input)',
        border: '1px solid var(--border)',
      }}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn("relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-xl text-foreground shadow-xl duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)}
          style={{ background: 'var(--sidebar)', border: '1px solid var(--border)' }}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: SelectPrimitive.Item.Props) {
  const ctx = React.useContext(SelectItemsMapContext)
  const mapRef = ctx?.mapRef
  React.useEffect(() => {
    if (mapRef && value != null) {
      // Extrai texto simples de children para o mapa (strings e números)
      const label = typeof children === 'string' || typeof children === 'number'
        ? children
        : children
      mapRef.current.set(String(value), label as React.ReactNode)
    }
  }, [mapRef, value, children])

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      value={value}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-[color:var(--green-dim)] data-highlighted:text-primary data-selected:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
