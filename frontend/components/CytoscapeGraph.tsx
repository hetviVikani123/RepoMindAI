"use client";

import { useEffect, useRef, useState } from "react";

type ElementShape = {
  data: {
    id: string;
    source?: string;
    target?: string;
    label?: string;
    full_path?: string;
    layer?: string;
    language?: string;
    lines?: number;
    color?: string;
  };
};

export function CytoscapeGraph({ elements }: { elements: ElementShape[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<{
    label: string;
    path: string;
    layer: string;
    language: string;
    lines: number;
  } | null>(null);

  useEffect(() => {
    let instance: any;

    async function render() {
      if (!containerRef.current || !elements.length) {
        return;
      }

      const cytoscapeModule = await import("cytoscape");
      const cytoscape = cytoscapeModule.default;

      instance = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "#0f172a",
              "font-size": 10,
              "font-weight": "bold",
              "text-valign": "bottom",
              "text-margin-y": 6,
              "text-background-color": "#ffffff",
              "text-background-opacity": 0.9,
              "text-background-padding": "3px",
              "text-background-shape": "roundrectangle",
              width: 32,
              height: 32,
              "border-width": 2,
              "border-color": "#ffffff",
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 4,
              "border-color": "#312e81",
              width: 40,
              height: 40,
            },
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#cbd5e1",
              "target-arrow-color": "#6366f1",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "arrow-scale": 1.2,
            },
          },
          {
            selector: "edge:selected",
            style: {
              width: 3,
              "line-color": "#6366f1",
            },
          },
        ],
        layout: {
          name: "cose",
          idealEdgeLength: 100,
          nodeOverlap: 20,
          animate: false,
          fit: true,
          padding: 30,
        },
      });

      instance.on("tap", "node", (evt: any) => {
        const d = evt.target.data();
        setSelectedNode({
          label: d.label || d.id,
          path: d.full_path || d.id,
          layer: d.layer || "other",
          language: d.language || "unknown",
          lines: d.lines || 0,
        });
      });

      instance.on("tap", (evt: any) => {
        if (evt.target === instance) {
          setSelectedNode(null);
        }
      });
    }

    render();

    return () => {
      if (instance) {
        instance.destroy();
      }
    };
  }, [elements]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div
        className="w-full h-[360px] sm:h-[480px] md:h-[560px]"
        ref={containerRef}
      />

      {/* Touch tip */}
      <div className="absolute top-2 left-2 pointer-events-none rounded-md bg-white/80 px-2 py-1 text-[10px] text-slate-500 backdrop-blur-sm sm:text-xs">
        Tap node to inspect · Pinch/drag to explore
      </div>

      {selectedNode && (
        <div className="absolute bottom-2 left-2 right-2 sm:left-auto sm:right-3 sm:bottom-3 sm:max-w-xs z-10 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs transition-all">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <strong className="text-sm text-slate-900 truncate">{selectedNode.label}</strong>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                {selectedNode.layer}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
          <p className="my-1 font-mono text-[11px] text-slate-600 break-all leading-tight">
            {selectedNode.path}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-slate-600 text-[11px]">
            <span>Lang: <strong className="text-slate-800">{selectedNode.language}</strong></span>
            <span>Lines: <strong className="text-slate-800">{selectedNode.lines}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
