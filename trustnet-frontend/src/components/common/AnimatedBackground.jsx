import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

export const AnimatedBackground = () => {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Gentle mouse parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 80 };
  const parallaxX = useSpring(mouseX, springConfig);
  const parallaxY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => {
      if (shouldReduceMotion) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 15;
      const y = (e.clientY / innerHeight - 0.5) * 15;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, shouldReduceMotion]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none bg-white transition-colors duration-500">
      {/* Soft light radial gradient base */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/30 via-slate-50/50 to-emerald-50/20 opacity-90" />

      {/* Low opacity geometric dot grid */}
      <div 
        className="absolute inset-0 opacity-[0.035]" 
        style={{
          backgroundImage: `radial-gradient(circle, #000000 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Floating Glassmorphic Blurred Circles */}
      <motion.div
        style={{ x: parallaxX, y: parallaxY }}
        animate={shouldReduceMotion ? {} : {
          scale: [1, 1.08, 1],
          opacity: [0.3, 0.45, 0.3]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-emerald-100/40 blur-3xl backdrop-blur-3xl"
      />

      <motion.div
        style={{ x: parallaxX, y: parallaxY }}
        animate={shouldReduceMotion ? {} : {
          scale: [1.05, 0.95, 1.05],
          opacity: [0.25, 0.4, 0.25]
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 -right-40 w-[36rem] h-[36rem] rounded-full bg-slate-100/60 blur-3xl backdrop-blur-3xl"
      />

      {/* Animated SVG Startup Network Lines & Connection Nodes */}
      <svg className="absolute inset-0 w-full h-full opacity-20 stroke-emerald-500/30 fill-emerald-500/20">
        <defs>
          <linearGradient id="netGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <g>
          <motion.line
            x1="12%" y1="25%" x2="32%" y2="45%"
            stroke="url(#netGradLight)" strokeWidth="1.2" strokeDasharray="5 5"
            animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, -30] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          <motion.line
            x1="32%" y1="45%" x2="65%" y2="30%"
            stroke="url(#netGradLight)" strokeWidth="1.2" strokeDasharray="5 5"
            animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, 30] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
          <motion.line
            x1="65%" y1="30%" x2="88%" y2="55%"
            stroke="url(#netGradLight)" strokeWidth="1.2" strokeDasharray="5 5"
            animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, -30] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />

          {/* Connection Nodes */}
          {[
            { cx: '12%', cy: '25%', r: 3.5 },
            { cx: '32%', cy: '45%', r: 5 },
            { cx: '65%', cy: '30%', r: 4.5 },
            { cx: '88%', cy: '55%', r: 4 }
          ].map((node, i) => (
            <motion.circle
              key={i}
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              className="fill-emerald-500/80"
              animate={shouldReduceMotion ? {} : {
                r: [node.r, node.r + 2, node.r],
                opacity: [0.5, 0.9, 0.5]
              }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </g>
      </svg>

      {/* Tiny Floating Emerald Particles */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/30 blur-[0.5px]"
              style={{
                top: `${20 + i * 14}%`,
                left: `${15 + (i * 17) % 75}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.6, 0.2]
              }}
              transition={{
                duration: 7 + (i % 3),
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.8
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
