"use client";

import { useEffect, useRef } from "react";

import styles from "./human-proof-effects.module.css";

interface ProofPoint {
  tone: "coral" | "gold" | "mint";
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

const pointColors: Record<ProofPoint["tone"], string> = {
  coral: "rgba(239, 101, 76, .5)",
  gold: "rgba(213, 163, 55, .46)",
  mint: "rgba(38, 120, 91, .38)",
};

export function HumanProofEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const pointer = { x: -1000, y: -1000 };
    let points: ProofPoint[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const density = Math.min(
        78,
        Math.max(34, Math.round((width * height) / 23_000)),
      );
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = Array.from({ length: density }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: index % 11 === 0 ? 2.2 : Math.random() * 1.15 + 0.45,
        tone: index % 9 === 0 ? "coral" : index % 5 === 0 ? "gold" : "mint",
      }));
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      points.forEach((point, index) => {
        if (!reduceMotion) {
          const dx = point.x - pointer.x;
          const dy = point.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 150 && distance > 1) {
            point.vx += (dx / distance) * 0.0035;
            point.vy += (dy / distance) * 0.0035;
          }
          point.vx *= 0.995;
          point.vy *= 0.995;
          point.x += point.vx;
          point.y += point.vy;
          if (point.x < -10) point.x = width + 10;
          if (point.x > width + 10) point.x = -10;
          if (point.y < -10) point.y = height + 10;
          if (point.y > height + 10) point.y = -10;
        }

        for (let otherIndex = index + 1; otherIndex < points.length; otherIndex += 1) {
          const other = points[otherIndex];
          const distance = Math.hypot(point.x - other.x, point.y - other.y);
          if (distance < 108) {
            context.strokeStyle = `rgba(31, 91, 74, ${(1 - distance / 108) * 0.105})`;
            context.lineWidth = 0.7;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        }

        context.fillStyle = pointColors[point.tone];
        context.beginPath();
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.fill();
      });
      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    const revealNodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    let observer: IntersectionObserver | undefined;
    if (reduceMotion) {
      revealNodes.forEach((node) => {
        node.dataset.visible = "true";
      });
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).dataset.visible = "true";
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14 },
      );
      revealNodes.forEach((node) => observer?.observe(node));
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <>
      <canvas className={styles.field} ref={canvasRef} aria-hidden="true" />
      <div className={styles.loadWipe} aria-hidden="true" />
    </>
  );
}
