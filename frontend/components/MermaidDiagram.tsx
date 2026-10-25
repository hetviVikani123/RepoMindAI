"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("<p class='text-sm text-slate-400 py-4 text-center'>Loading diagram...</p>");

  useEffect(() => {
    async function render() {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "neutral",
          fontFamily: "IBM Plex Sans, sans-serif",
        });
        const output = await mermaid.render(`mermaid-${id}`, chart || "graph TD; A-->B;");
        setSvg(output.svg);
      } catch (error) {
        setSvg(`<pre class="text-xs text-red-500 overflow-x-auto p-2">${(error as Error).message}</pre>`);
      }
    }

    render();
  }, [chart, id]);

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 sm:p-4 touch-pan-x">
      <div
        className="mermaid-container min-w-[260px] flex justify-center items-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
