"use client";

import React, { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  dataArray?: Uint8Array | null;
  isRecording: boolean;
  isPaused?: boolean;
}

export function WaveformVisualizer({ dataArray, isRecording, isPaused }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const numBars = 36;
      const barWidth = 4;
      const gap = (width - numBars * barWidth) / (numBars - 1);

      for (let i = 0; i < numBars; i++) {
        let barHeight = 8;

        if (isRecording && !isPaused) {
          if (dataArray && dataArray.length > 0) {
            const index = Math.floor((i / numBars) * dataArray.length);
            const val = dataArray[index] || 0;
            // Value is 0..255
            const normalized = val / 255;
            barHeight = Math.max(8, normalized * (height * 0.85));
          } else {
            // Simulated sine wave
            const wave = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
            barHeight = 10 + wave * (height * 0.6);
          }
        } else if (isPaused) {
          barHeight = 10;
        }

        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        const radius = barWidth / 2;

        // Draw rounded bar
        ctx.beginPath();
        ctx.fillStyle = isRecording ? (isPaused ? "#5A5D54" : "#E4F65B") : "#223309";
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      phase += 0.08;
      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [dataArray, isRecording, isPaused]);

  return (
    <div className="w-full flex items-center justify-center p-3 rounded-2xl bg-charcoal/90 shadow-inner">
      <canvas
        ref={canvasRef}
        width={320}
        height={64}
        className="w-full max-w-xs h-16"
      />
    </div>
  );
}
