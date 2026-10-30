export function BusConLogo({ size = 40, textColor }: { size?: number, textColor?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-xl flex items-center justify-center shadow-glow"
        style={{ width: size, height: size, backgroundColor: 'var(--brand)' }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24"
             fill="none" stroke="#04210F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight" style={{ color: textColor || 'var(--text-bright)' }}>
        BusCon
      </span>
    </div>
  );
}