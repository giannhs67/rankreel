"use client";

import { useEffect, useRef } from "react";
import { Stage, Layer, Rect, Group, Text } from "react-konva";
import type Konva from "konva";
import type { RankingListConfig } from "@/remotion/ranking-config";

const SCALE = 1 / 3;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1920 * SCALE;
const TOP_HEIGHT = 900 * SCALE;

const SAMPLE_ROWS = [
  { number: 5, title: "Fifth place", current: false },
  { number: 4, title: "Fourth place", current: true },
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

  useEffect(() => {
    layerRef.current?.batchDraw();
  }, [fontVersion]);

  return (
    <Stage width={WIDTH} height={HEIGHT} className="rounded-lg border border-black/10 dark:border-white/10">
      <Layer ref={layerRef}>
        <Rect x={0} y={0} width={WIDTH} height={TOP_HEIGHT} fill="#1f2937" />
        <Rect x={0} y={TOP_HEIGHT} width={WIDTH} height={HEIGHT - TOP_HEIGHT} fill="#000000" />
        <Group
          x={config.position.x * SCALE}
          y={config.position.y * SCALE}
          draggable
          dragBoundFunc={(pos) => ({
            x: Math.max(0, Math.min(pos.x, WIDTH)),
            y: Math.max(0, Math.min(pos.y, TOP_HEIGHT)),
          })}
          onDragEnd={(e) => {
            onPositionChange(e.target.x() / SCALE, e.target.y() / SCALE);
          }}
        >
          {SAMPLE_ROWS.map((row, i) => (
            <Text
              key={row.number}
              y={i * (config.text.fontSize * SCALE + 10)}
              text={`#${row.number}  ${row.title}`}
              fontFamily={config.font.family}
              fontSize={
                (row.current ? config.text.fontSize * 1.25 : config.text.fontSize) * SCALE
              }
              fontStyle="800"
              fill={row.current ? config.text.currentColor : config.text.baseColor}
              stroke={config.text.strokeColor}
              strokeWidth={config.text.strokeWidth * SCALE}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
}
