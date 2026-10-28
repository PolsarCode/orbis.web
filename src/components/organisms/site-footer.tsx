import Link from "next/link";

const links = [
  { href: "/guidelines", label: "Community guidelines" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/changelog", label: "Changelog" },
];

export function SiteFooter({
  bordered = true,
  compact = false,
}: {
  bordered?: boolean;
  compact?: boolean;
}) {
  return (
    <footer
      className={
        compact ? "w-full px-4 py-3" : "mx-auto w-full max-w-[1280px] px-4 pb-8 sm:px-8"
      }
    >
      <div
        className={`flex flex-wrap justify-between gap-2 text-muted max-sm:flex-col max-sm:items-center max-sm:text-center ${
          compact ? "text-[11px] sm:text-xs" : "pt-6 text-xs"
        } ${
          bordered ? "border-t border-divider" : ""
        }`}
      >
        <p>
          © {new Date().getFullYear()} Orbis · By{" "}
          <a
            href="https://polsar.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded-sm font-semibold text-foreground hover:text-accent"
          >
            Polsar Studio
          </a>
        </p>
        <nav
          aria-label="Legal"
          className={`flex flex-wrap gap-y-1 max-sm:justify-center ${compact ? "gap-x-3 sm:gap-x-4" : "gap-x-4"}`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded-sm hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
