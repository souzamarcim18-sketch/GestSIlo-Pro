export function CowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Chifres (grandes, curvados pra cima e pros lados) */}
      <path d="M8 6c-1.5-1-2.5-2.5-2.5-4" />
      <path d="M16 6c1.5-1 2.5-2.5 2.5-4" />

      {/* Orelhas (laterais, formato de folha) */}
      <path d="M5 11c-1.5-.5-3 0-3.5 1.5 1 1 2.5 1 3.5 0" />
      <path d="M19 11c1.5-.5 3 0 3.5 1.5-1 1-2.5 1-3.5 0" />

      {/* Cabeça (formato afunilado, mais largo em cima entre os chifres) */}
      <path d="M6 8c0-1.5 2.5-3 6-3s6 1.5 6 3v4c0 3.5-2.5 6.5-6 6.5s-6-3-6-6.5z" />

      {/* Focinho (parte inferior arredondada, integrada à cabeça) */}
      <path d="M8.5 15c0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5" />

      {/* Narinas (na parte de baixo) */}
      <circle cx="10.5" cy="16" r="0.45" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="16" r="0.45" fill="currentColor" stroke="none" />

      {/* Olhos */}
      <circle cx="9.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
