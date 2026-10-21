"use client";

import { useEffect, useRef } from "react";

type Leaf = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
  color: string;
  swayPhase: number;
  swaySpeed: number;
};

const LEAF_COLORS = ["#50B800", "#3d9400", "#B6DF56", "#6BC629", "#8FD84A"];

function createLeaf(width: number, height: number, spawnTop = false): Leaf {
  return {
    x: Math.random() * width,
    y: spawnTop ? -20 - Math.random() * height * 0.3 : Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: 0.35 + Math.random() * 0.55,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    size: 10 + Math.random() * 14,
    opacity: 0.35 + Math.random() * 0.45,
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]!,
    swayPhase: Math.random() * Math.PI * 2,
    swaySpeed: 0.008 + Math.random() * 0.012,
  };
}

function drawLeaf(ctx: CanvasRenderingContext2D, leaf: Leaf) {
  const { x, y, rotation, size, opacity, color } = leaf;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.bezierCurveTo(size * 0.55, -size * 0.35, size * 0.55, size * 0.35, 0, size * 0.55);
  ctx.bezierCurveTo(-size * 0.55, size * 0.35, -size * 0.55, -size * 0.35, 0, -size * 0.55);
  ctx.fill();

  ctx.strokeStyle = "rgba(23, 28, 25, 0.12)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.lineTo(0, size * 0.45);
  ctx.stroke();

  ctx.restore();
}

export function FallingLeaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let animationFrame = 0;
    let leaves: Leaf[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 768 ? 16 : width < 1280 ? 26 : 34;
      leaves = Array.from({ length: count }, () => createLeaf(width, height));
    };

    const onMove = (event: PointerEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY, active: true };
    };

    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999, active: false };
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseRef.current;

      for (const leaf of leaves) {
        leaf.swayPhase += leaf.swaySpeed;
        leaf.x += leaf.vx + Math.sin(leaf.swayPhase) * 0.35;
        leaf.y += leaf.vy;
        leaf.rotation += leaf.rotationSpeed;

        if (mouse.active) {
          const dx = leaf.x - mouse.x;
          const dy = leaf.y - mouse.y;
          const distance = Math.hypot(dx, dy);
          const radius = 140;
          if (distance < radius && distance > 0.001) {
            const force = (1 - distance / radius) * 0.9;
            leaf.vx += (dx / distance) * force * 0.08;
            leaf.vy += (dy / distance) * force * 0.05;
            leaf.rotationSpeed += force * 0.004;
          }
        }

        leaf.vx *= 0.985;
        leaf.vy = Math.min(Math.max(leaf.vy, 0.25), 1.4);

        if (leaf.y > height + 30 || leaf.x < -40 || leaf.x > width + 40) {
          Object.assign(leaf, createLeaf(width, height, true));
        }

        drawLeaf(ctx, leaf);
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-90"
    />
  );
}
