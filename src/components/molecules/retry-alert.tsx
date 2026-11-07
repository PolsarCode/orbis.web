import type { ReactNode } from "react";
import * as Atom from "@atom";

export function RetryAlert({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-4 text-center">
      <p className="text-sm text-muted">{children}</p>
      <Atom.Button variant="secondary" onClick={onRetry}>
        Try again
      </Atom.Button>
    </div>
  );
}
