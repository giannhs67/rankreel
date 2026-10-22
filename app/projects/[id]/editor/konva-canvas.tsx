"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Group, Text } from "react-konva";
import type Konva from "konva";
import type { RankingListConfig } from "@/remotion/ranking-config";

const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1920;
const SOURCE_TOP_HEIGHT = 900;
const MAX_PREVIEW_WIDTH = 420;

const SAMPLE_ROWS = [
  { number: 1, title: "First place", current: true },
  { number: 2, title: "Second place", current: false },
];

export function KonvaCanvas({
  config,
  fontVersion,
  onPositionChange,
}: {
  config: RankingListConfig;
  fontVersion: number;
  onPositionChange: (x: number, y: number) => void;
}) {
  const layerRef = useRef<Konva.Layer>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  // The design is stored in 1080x1920 source coordinates. Only its display size changes.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const measure = () => setWidth(Math.max(1, Math.min(element.clientWidth, MAX_PREVIEW_WIDTH)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    layerRef.current?.batchDraw();
  }, [fontVersion]);

  const scale = width / SOURCE_WIDTH;
  const height = SOURCE_HEIGHT * scale;
  const topHeight = SOURCE_TOP_HEIGHT * scale;

  return (
    <div ref={wrapperRef} className="w-full">
      <Stage width={width} height={height} className="overflow-hidden rounded-[14px]">
        <Layer ref={layerRef}>
          <Rect x={0} y={0} width={width} height={topHeight} fill="#1f2937" />
          <Rect x={0} y={topHeight} width={width} height={height - topHeight} fill="#000000" />
          <Group
            x={config.position.x * scale}
            y={config.position.y * scale}
            draggable
            dragBoundFunc={(pos) => ({
              x: Math.max(0, Math.min(pos.x, width)),
              y: Math.max(0, Math.min(pos.y, topHeight)),
            })}
            onDragEnd={(e) => onPositionChange(e.target.x() / scale, e.target.y() / scale)}
          >
            {SAMPLE_ROWS.map((row, i) => (
              <Text
                key={row.number}
                y={i * (config.text.fontSize * scale + 10)}
                text={"#" + row.number + "  " + row.title}
                fontFamily={config.font.family}
                fontSize={(row.current ? config.text.fontSize * 1.25 : config.text.fontSize) * scale}
                fontStyle="800"
                fill={row.current ? config.text.currentColor : config.text.baseColor}
                stroke={config.text.strokeColor}
                strokeWidth={config.text.strokeWidth * scale}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
