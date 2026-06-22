"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

const ambientParticles = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 29 + 11) % 100}%`,
  top: `${(index * 47 + 17) % 100}%`,
  size: 2 + (index % 3),
  delay: (index % 8) * 0.32,
  duration: 7 + (index % 5),
}));

export function BackgroundEffects() {
  const [isFinePointer, setIsFinePointer] = useState(false);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(28);
  const smoothX = useSpring(mouseX, { stiffness: 70, damping: 28, mass: 0.6 });
  const smoothY = useSpring(mouseY, { stiffness: 70, damping: 28, mass: 0.6 });
  const smoothXPercent = useTransform(smoothX, (value) => `${value}%`);
  const smoothYPercent = useTransform(smoothY, (value) => `${value}%`);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePointerMode = () => setIsFinePointer(mediaQuery.matches && !reducedMotion.matches);
    updatePointerMode();

    mediaQuery.addEventListener("change", updatePointerMode);
    reducedMotion.addEventListener("change", updatePointerMode);
    return () => {
      mediaQuery.removeEventListener("change", updatePointerMode);
      reducedMotion.removeEventListener("change", updatePointerMode);
    };
  }, []);

  useEffect(() => {
    if (!isFinePointer) {
      return undefined;
    }

    let animationFrame = 0;
    const handlePointerMove = (event: PointerEvent) => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        mouseX.set((event.clientX / window.innerWidth) * 100);
        mouseY.set((event.clientY / window.innerHeight) * 100);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [isFinePointer, mouseX, mouseY]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="aurora-field absolute inset-0 opacity-45 md:opacity-70"
        style={{ "--x": smoothXPercent, "--y": smoothYPercent } as CSSProperties}
      />
      {isFinePointer ? (
        <motion.div
          className="absolute h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.16),rgba(168,85,247,0.08)_38%,transparent_70%)] blur-2xl"
          style={{ left: smoothXPercent, top: smoothYPercent, x: "-50%", y: "-50%" }}
        />
      ) : null}
      <div className="animate-gradient-drift absolute -left-32 top-20 h-[34rem] w-[34rem] rounded-full bg-violetGlow/12 blur-[110px]" />
      <div className="animate-gradient-drift absolute -right-24 top-1/3 h-[32rem] w-[32rem] rounded-full bg-cyberBlue/10 blur-[120px] [animation-delay:3s]" />
      {ambientParticles.slice(0, isFinePointer ? ambientParticles.length : 14).map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-glowCyan/80 shadow-[0_0_16px_rgba(103,232,249,0.75)]"
          style={{
            left: particle.left,
            top: particle.top,
            height: particle.size,
            width: particle.size,
          }}
          animate={{ y: [-16, 18, -16], opacity: [0.16, 0.62, 0.16] }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}
