import Link from "next/link";
import HomeSurfaceDemo from "@/components/home-surface-demo";

export default function HomePage() {
  return (
    <div className="relative flex flex-1 items-center">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)] lg:items-center">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">Uzay</h1>
          <p className="mb-6 text-lg text-fd-muted-foreground">
            Reactive 3D &amp; 2D math visualizations for the web.
          </p>

          <div className="mb-8 flex flex-col gap-4 text-[15px]">
            <p>
              Uzay (pronounced <em>oo-zai</em>) is a TypeScript library for
              building interactive math figures in code. Every value is a
              reactive atom: drag a point and the line, the label, and
              everything derived from it update on their own.
            </p>
            <p>
              The core API is plain TypeScript with no framework dependency. A
              lightweight React wrapper handles mounting scenes and wiring up UI.
            </p>
          </div>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/docs/"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-fd-primary px-5 text-sm font-medium text-white dark:text-fd-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-fd-border bg-fd-card p-5 text-sm">
            <code className="text-fd-muted-foreground">npm install uzay</code>
          </div>
        </div>

        <div className="hidden w-full max-w-[560px] lg:block lg:justify-self-end">
          <HomeSurfaceDemo />
        </div>
      </div>
      <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-fd-muted-foreground">
        Made by{" "}
        <a
          href="https://github.com/chalish-b"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-fd-foreground transition-colors"
        >
          chalish b.
        </a>
      </p>
    </div>
  );
}
