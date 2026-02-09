import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center flex-1 max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-4">Uzay</h1>
      <p className="text-fd-muted-foreground mb-6 text-lg">
        A reactive 3D mathematical visualization library for TypeScript and
        React, built on Three.js and Jotai.
      </p>

      <div className="flex flex-col gap-4 mb-8 text-[15px]">
        <p>
          Uzay lets you create interactive 3D scenes with points, lines,
          parametric functions, spheres, planes, and more. Every property is a
          reactive atom, so the scene updates automatically when values change.
        </p>
        <p>
          It can be used standalone with the imperative API or declaratively
          inside React components.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-fd-border bg-fd-card p-5 text-sm">
        <code className="text-fd-muted-foreground">bun add uzay</code>
        <div className="border-t border-fd-border" />
        <p>
          Read the{" "}
          <Link href="/docs" className="font-medium underline">
            documentation
          </Link>{" "}
          to get started.
        </p>
      </div>
    </div>
  );
}
