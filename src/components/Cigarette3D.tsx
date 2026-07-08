"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

function SmokeWisp({ delay, side }: { delay: number; side: number }) {
  const xDrift = side * (15 + Math.random() * 20);
  return (
    <motion.div
      className="absolute"
      style={{ left: "50%", bottom: "100%", marginLeft: -6 }}
      initial={{ opacity: 0, y: 0, x: 0, scale: 0.2 }}
      animate={{
        opacity: [0, 0.4, 0.25, 0.1, 0],
        y: [0, -30, -70, -110, -160],
        x: [0, xDrift * 0.3, xDrift * 0.7, xDrift],
        scale: [0.2, 0.5, 1, 1.5, 2.2],
        rotate: [0, side * 10, side * 25, side * 40],
      }}
      transition={{
        duration: 3.5,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(200,200,200,0.5) 0%, rgba(180,180,180,0.1) 70%, transparent 100%)",
          filter: "blur(2px)",
        }}
      />
    </motion.div>
  );
}

function AshFlake({ x }: { x: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: 0 }}
      initial={{ opacity: 0.8, y: 0, rotate: 0 }}
      animate={{
        opacity: 0,
        y: [0, 15, 30],
        x: [0, Math.random() * 12 - 6],
        rotate: Math.random() * 180,
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    >
      <div
        className="w-1.5 h-0.5 rounded-full"
        style={{ backgroundColor: `hsl(0, 0%, ${55 + Math.random() * 20}%)` }}
      />
    </motion.div>
  );
}

export default function Cigarette3D() {
  const [isHovered, setIsHovered] = useState(false);
  const [burnPercent, setBurnPercent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ashFlakes, setAshFlakes] = useState<{ id: number; x: number }[]>([]);
  const flakeId = useRef(0);

  useEffect(() => {
    if (isHovered && burnPercent < 100) {
      intervalRef.current = setInterval(() => {
        setBurnPercent((prev) => {
          const next = prev + 1.2;
          if (Math.random() < 0.08) {
            const id = ++flakeId.current;
            setAshFlakes((p) => [...p.slice(-8), { id, x: Math.random() * 18 + 2 }]);
          }
          return next >= 100 ? 100 : next;
        });
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, burnPercent]);

  const reset = () => {
    setBurnPercent(0);
    setAshFlakes([]);
  };

  const maxBody = 200;
  const bodyHeight = maxBody * (1 - burnPercent / 100);
  const ashHeight = Math.min(burnPercent * 0.4, 16);
  const isFinished = burnPercent >= 100;

  return (
    <div
      className="relative flex flex-col items-center cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Smoke */}
      <AnimatePresence>
        {isHovered && !isFinished && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-44 pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <SmokeWisp key={`smoke-${i}`} delay={i * 0.5} side={i % 2 === 0 ? 1 : -1} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {!isFinished ? (
        <div className="relative" style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))" }}>
          {/* Ember tip */}
          <div className="w-[22px] mx-auto relative">
            <motion.div
              className="w-full h-[10px] rounded-t-[3px] relative overflow-hidden"
              style={{
                background: isHovered
                  ? "linear-gradient(to bottom, #1a1a1a 0%, #b91c1c 30%, #f97316 60%, #fbbf24 100%)"
                  : "linear-gradient(to bottom, #4a4a4a 0%, #6b6b6b 100%)",
              }}
              animate={
                isHovered
                  ? {
                      boxShadow: [
                        "0 0 4px #ef4444, 0 -2px 8px #f97316",
                        "0 0 8px #f97316, 0 -3px 12px #ef4444",
                        "0 0 4px #ef4444, 0 -2px 8px #f97316",
                      ],
                    }
                  : { boxShadow: "none" }
              }
              transition={{ duration: 1, repeat: Infinity }}
            >
              {/* Ember glow pulsing */}
              {isHovered && (
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "radial-gradient(ellipse at center bottom, rgba(251,146,60,0.8) 0%, transparent 70%)",
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </motion.div>

            {/* Char ring - black edge between ember and ash */}
            {isHovered && (
              <div
                className="w-full h-[3px]"
                style={{ background: "linear-gradient(to bottom, #1a1a1a, #3d3d3d)" }}
              />
            )}
          </div>

          {/* Ash section */}
          {burnPercent > 3 && (
            <div
              className="w-[22px] mx-auto relative overflow-hidden"
              style={{
                height: ashHeight,
                background: "linear-gradient(to bottom, #9ca3af, #b8b8b8, #a3a3a3)",
                borderLeft: "1px solid #8b8b8b",
                borderRight: "1px solid #8b8b8b",
              }}
            >
              {/* Ash cracks texture */}
              <div className="absolute inset-0 opacity-40">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute h-px bg-gray-600"
                    style={{
                      top: `${(i + 1) * 25}%`,
                      left: `${i * 10}%`,
                      right: `${20 - i * 5}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ash flakes falling */}
          <div className="absolute top-6 left-0 w-[22px] pointer-events-none">
            <AnimatePresence>
              {ashFlakes.map((f) => (
                <AshFlake key={f.id} x={f.x} />
              ))}
            </AnimatePresence>
          </div>

          {/* Paper body */}
          <div
            className="w-[22px] mx-auto relative overflow-hidden transition-all duration-75"
            style={{
              height: bodyHeight,
              background: "linear-gradient(90deg, #e8e4df 0%, #f5f2ee 20%, #faf8f5 50%, #f5f2ee 80%, #e8e4df 100%)",
              borderLeft: "1px solid #d4d0cb",
              borderRight: "1px solid #d4d0cb",
            }}
          >
            {/* Paper grain texture */}
            <div className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='20' height='20' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
                backgroundSize: "30px 30px",
              }}
            />

            {/* Subtle vertical fiber lines */}
            <div className="absolute inset-0 opacity-[0.08]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-gray-500"
                  style={{ left: `${(i + 1) * 11}%` }}
                />
              ))}
            </div>

            {/* Brand ring - gold band */}
            {bodyHeight > 50 && (
              <div
                className="absolute left-0 right-0 h-[14px]"
                style={{
                  bottom: 48,
                  background: "linear-gradient(90deg, #c8a84b 0%, #e8d48b 30%, #f0e4a8 50%, #e8d48b 70%, #c8a84b 100%)",
                  borderTop: "0.5px solid #b8983b",
                  borderBottom: "0.5px solid #b8983b",
                }}
              >
                {/* Brand text hint */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[4px] font-bold text-amber-800/40 tracking-widest">
                    SIGARA
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter */}
          <div
            className="w-[22px] h-[52px] mx-auto relative overflow-hidden rounded-b-[2px]"
            style={{
              background: "linear-gradient(90deg, #c49a5c 0%, #d4aa6a 15%, #debb7d 50%, #d4aa6a 85%, #c49a5c 100%)",
              borderLeft: "1px solid #b08944",
              borderRight: "1px solid #b08944",
              borderBottom: "1px solid #a07834",
            }}
          >
            {/* Cork/speckle texture */}
            <div className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='turbulence' baseFrequency='1.5' numOctaves='3'/%3E%3C/filter%3E%3Crect width='10' height='10' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
                backgroundSize: "20px 20px",
              }}
            />

            {/* Horizontal lines on filter */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-px bg-amber-900"
                  style={{ marginTop: i === 0 ? 4 : 4 }}
                />
              ))}
            </div>

            {/* Filter top lip */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: "linear-gradient(to bottom, #a07834, transparent)" }}
            />
          </div>
        </div>
      ) : (
        <motion.div
          className="relative flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))" }}>
            <div
              className="w-[22px] h-[8px] rounded-t-[2px]"
              style={{ background: "linear-gradient(to bottom, #4a4a4a, #6b6b6b)" }}
            />
            <div
              className="w-[22px] h-[52px] rounded-b-[2px]"
              style={{
                background: "linear-gradient(90deg, #c49a5c 0%, #debb7d 50%, #c49a5c 100%)",
                border: "1px solid #b08944",
                borderTop: "none",
              }}
            />
          </div>
          <motion.p
            className="mt-5 text-sm text-slate-400"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Bitti.
          </motion.p>
          <button
            onClick={reset}
            className="mt-2 text-xs text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
          >
            Yenisini yak
          </button>
        </motion.div>
      )}

      {/* Instruction */}
      {!isFinished && (
        <motion.p
          className="mt-6 text-sm text-slate-400 font-medium"
          animate={isHovered ? { opacity: 0, y: -5 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Dokun ve yak
        </motion.p>
      )}
    </div>
  );
}
