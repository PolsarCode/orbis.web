const rows = Array.from({ length: 48 }, (_, row) => row);
const line = "orbis. ".repeat(32);

export function WallpaperPlaceholder() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-background select-none">
      <div className="absolute -inset-1/2 flex -rotate-15 flex-col items-center justify-center font-display text-[clamp(4rem,8vw,6.5rem)] leading-[0.95] font-extrabold whitespace-nowrap text-accent/15">
        {rows.map((row) => (
          <span key={row} className={row % 2 ? "translate-x-[1.15em]" : undefined}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
