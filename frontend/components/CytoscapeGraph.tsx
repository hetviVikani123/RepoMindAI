"use client";

import { useEffect, useRef } from "react";

type ElementShape = {
  data: {
    id: string;
    source?: string;
    target?: string;
    label?: string;
  };
};

export function CytoscapeGraph({ elements }: { elements: ElementShape[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let instance: { destroy: () => void } | undefined;

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
              "background-color": "#0047ab",
              label: "data(label)",
              color: "#12213e",
              "font-size": 9,
              "text-background-color": "#fff",
              "text-background-opacity": 1,
              "text-background-padding": "2px"
            }
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#e85d04",
              "target-arrow-color": "#e85d04",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier"
            }
          }
        ],
        layout: {
          name: "cose",
          idealEdgeLength: 120,
          nodeOverlap: 10,
          animate: false
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

  return <div className="h-[560px] w-full rounded-xl border bg-white" ref={containerRef} />;
}
