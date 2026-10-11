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
    <div style={{ position: "relative" }}>
      <div
        className="w-full rounded-xl bg-slate-50"
        style={{ height: "560px", border: "1px solid #e2e8f0" }}
        ref={containerRef}
      />
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "12px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxWidth: "320px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <strong style={{ fontSize: "14px", color: "#0f172a" }}>{selectedNode.label}</strong>
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "#6366f1", background: "#ede9fe", padding: "2px 6px", borderRadius: "4px" }}>
              {selectedNode.layer}
            </span>
          </div>
          <p style={{ margin: "2px 0", color: "#64748b", fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" }}>
            {selectedNode.path}
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "6px", color: "#475569" }}>
            <span>Language: <strong>{selectedNode.language}</strong></span>
            <span>Lines: <strong>{selectedNode.lines}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
