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
      {/* Orelhas */}
      <path d="M4 10c-1.5 0-2.5 1-2.5 2.5S2.5 15 4 14.5" />
      <path d="M20 10c1.5 0 2.5 1 2.5 2.5S21.5 15 20 14.5" />

      {/* Chifres */}
      <path d="M7 7c-.5-1.5 0-3 1-3.5" />
      <path d="M17 7c.5-1.5 0-3-1-3.5" />

      {/* Cabeça (formato mais largo embaixo, típico de vaca) */}
      <path d="M6 9c0-2 2.5-3.5 6-3.5s6 1.5 6 3.5v4c0 3-2.5 5.5-6 5.5s-6-2.5-6-5.5z" />

      {/* Focinho (área oval característica da vaca) */}
      <ellipse cx="12" cy="14.5" rx="3" ry="2.5" />

      {/* Narinas */}
      <circle cx="10.7" cy="14" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="13.3" cy="14" r="0.4" fill="currentColor" stroke="none" />

      {/* Olhos */}
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />

      {/* Mancha característica (topete) */}
      <path d="M10 6.5c.5-.5 1.5-.5 2 0s1.5.5 2 0" />
    </svg>
  );
}

