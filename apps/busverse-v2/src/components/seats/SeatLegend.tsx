const ITEMS = [
  { cls: 'bg-[var(--seat-available-bg)] border-[var(--seat-available-border)]', label: 'Available' },
  { cls: 'bg-[var(--seat-selected-bg)] border-[var(--seat-selected-border)]', label: 'Selected' },
  { cls: 'bg-[var(--seat-locked-bg)] border-[var(--seat-locked-border)]', label: 'Locked' },
  { cls: 'bg-[var(--seat-booked-bg)] border-[var(--seat-booked-border)]', label: 'Booked' },
  { cls: 'bg-[var(--seat-female-bg)] border-[var(--seat-female-border)]', label: 'Female' },
];

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-4 justify-center text-xs">
      {ITEMS.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded border-2 ${it.cls}`} />
          <span className="text-text-secondary">{it.label}</span>
        </div>
      ))}
    </div>
  );
}