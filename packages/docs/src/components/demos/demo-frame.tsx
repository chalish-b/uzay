import type { ReactNode } from "react";
import { Code } from "lucide-react";

// Demo components live in this directory, so a source link only needs the
// file name. Links target master: always current, may briefly 404 if a demo
// file gets renamed before the push lands.
const DEMO_SOURCE_BASE =
  "https://github.com/chalish-b/uzay/blob/master/packages/docs/src/components/demos/";

// Shared chrome for the intro demos on item/construction pages. Keeps every
// page's demo visually consistent with the landing page demo: bordered card,
// dark canvas, an optional hint line in the corner and an optional controls
// strip below the canvas.
export function DemoFrame({
  hint,
  sourceFile,
  controls,
  children,
}: {
  hint?: string;
  // File name of the demo component, e.g. "points-demo.tsx". Renders a quiet
  // "view source" link in the corner of the canvas.
  sourceFile?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="not-prose my-6 w-full overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
      <div className="relative h-80 bg-fd-background">
        {children}
        {hint && (
          <p className="pointer-events-none absolute bottom-3 left-3 text-sm text-black/40 dark:text-white/40">
            {hint}
          </p>
        )}
        {sourceFile && (
          <a
            href={`${DEMO_SOURCE_BASE}${sourceFile}`}
            target="_blank"
            rel="noreferrer"
            title="View the source of this demo on GitHub"
            className="absolute right-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <Code className="size-3.5" />
            Source
          </a>
        )}
      </div>
      {controls && (
        <div className="space-y-2 border-t border-fd-border px-4 py-3">
          {controls}
        </div>
      )}
    </div>
  );
}
