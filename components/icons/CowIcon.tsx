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
      {/* Corpo + cabeça + pernas em um traço só */}
      <path d="M3 15c0-2.2 1.8-4 4-4h8c1.7 0 3-1.3 3-3 1.5 0 2.5 1 2.5 2.5S19.5 13 18 13v3" />

      {/* Rabo */}
      <path d="M3 15c-.8 0-1.5.7-1.5 1.5" />

      {/* Pernas */}
      <path d="M6 15v4" />
      <path d="M15 15v4" />

      {/* Chifre */}
      <path d="M19 7.5c.3-.7 0-1.5-.7-1.8" />
    </svg>
  );
}

