"use client";

import { useMemo } from "react";
import katex from "katex";

// Renders a LaTeX string with KaTeX. Wraps the renderToString +
// dangerouslySetInnerHTML pattern so callers just pass a string. Inline by
// default (a span that flows with text); set `display` for centered block math
// (an aligned environment, a fraction that wants its own line, etc.).
export function Tex({
  tex,
  display = false,
  className,
}: {
  tex: string;
  display?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: display }),
    [tex, display],
  );

  const Tag = display ? "div" : "span";
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
