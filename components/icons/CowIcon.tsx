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
      {/* Corpo robusto */}
      <path d="M4 10h13a3 3 0 0 1 3 3v3H4z" />

      {/* Cabeça baixa (pastando) */}
      <path d="M4 10c-1 0-2 .5-2 2v2h2" />

      {/* Chifres */}
      <path d="M2.5 11.5c-.5-.8-.3-1.8.5-2.3" />
      <path d="M4 10c0-1 .5-1.8 1.3-2" />

      {/* Pernas */}
      <path d="M7 16v4" />
      <path d="M17 16v4" />

      {/* Rabo com tufo */}
      <path d="M20 13c1 0 1.5 1 1.5 2" />
    </svg>
  );
}
