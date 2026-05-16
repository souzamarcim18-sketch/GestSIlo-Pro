export function CowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v4a6 6 0 0 1-12 0" />
      <path d="M4 8C2.5 7 2 5 3 3.5S6 2 7 4" />
      <path d="M20 8c1.5-1 2-3 1-4.5S18 2 17 4" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M10 14c.5.7 1.5.7 2 0" />
    </svg>
  )
}
