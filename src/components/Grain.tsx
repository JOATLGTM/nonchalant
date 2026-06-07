import { useEffect, useRef } from 'react';

export function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    canvas.width = 256;
    canvas.height = 256;

    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;

    function drawNoise() {
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 12;
      }
      ctx!.putImageData(imageData, 0, 0);
    }

    drawNoise();

    let interval: ReturnType<typeof setInterval>;
    if (!prefersReduced) {
      interval = setInterval(drawNoise, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 1,
      }}
    />
  );
}
