"use client";
import { useEffect, useRef } from "react";

export default function BingoBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.55 - 0.1,
      op: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.55 ? 210 : Math.random() > 0.5 ? 45 : 175,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.op -= 0.001;
        if (p.y < 0 || p.op <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 5;
          p.op = Math.random() * 0.5 + 0.2;
          p.vy = -Math.random() * 0.55 - 0.1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.op})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      {/* Fond de base */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -3,
          background:
            "linear-gradient(160deg,#080c14 0%,#0d1628 50%,#080c14 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Blob bleu haut gauche */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          left: "-5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: -2,
        }}
      />

      {/* Blob or bas droite */}
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          right: "-10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(251,191,36,.06) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: -2,
        }}
      />

      {/* Canvas particules */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
    </>
  );
}
