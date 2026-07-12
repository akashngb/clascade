export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Clascade">
      <svg width="31" height="31" viewBox="0 0 31 31" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="29" height="29" rx="9" fill="var(--ink)" />
        <path d="M9 10.5h9.25a3.75 3.75 0 0 1 0 7.5H14.5a3.5 3.5 0 0 0 0 7" stroke="var(--paper)" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="21.5" cy="24.5" r="2" fill="var(--accent)" />
      </svg>
      {!compact && <span className="text-[17px] font-semibold tracking-[-0.03em]">clascade</span>}
    </div>
  );
}
