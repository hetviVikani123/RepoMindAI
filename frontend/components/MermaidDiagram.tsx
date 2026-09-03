"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("<p>Loading diagram...</p>");

  useEffect(() => {
    async function render() {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base" });
        const output = await mermaid.render(`mermaid-${id}`, chart || "graph TD; A-->B;");
        setSvg(output.svg);
      } catch (error) {
        setSvg(`<pre>${(error as Error).message}</pre>`);
      }
    }

    render();
  }, [chart, id]);

  return <div className="rounded-xl border bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />;
}
