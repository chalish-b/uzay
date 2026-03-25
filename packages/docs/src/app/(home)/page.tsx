import Link from "next/link";
import HomeSurfaceDemo from "@/components/home-surface-demo";

export default function HomePage() {
  return (
    <div className="flex flex-1 items-center">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)] lg:items-center">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">Uzay</h1>
          <p className="mb-6 text-lg text-fd-muted-foreground">
            A reactive 3D mathematical visualization library for TypeScript,
            built on Three.js and Jotai.
          </p>

          <div className="mb-8 flex flex-col gap-4 text-[15px]">
            <p>
              Uzay lets you create interactive 3D scenes with points, lines,
              parametric functions, spheres, planes, and more. Every property
              is a reactive atom, so the scene updates automatically when
              values change.
            </p>
            <p>
              The core API is plain TypeScript with no framework dependency, so
              it works with any UI layer. A lightweight React wrapper is
              included for mounting scenes and connecting UI controls.
            </p>
          </div>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/docs/getting-started"
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
    </div>
  );
}
