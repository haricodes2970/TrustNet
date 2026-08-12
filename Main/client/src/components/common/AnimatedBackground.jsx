import React from 'react';

// Retained as a stable import surface for legacy callers. The visual shell is
// intentionally a plain paper canvas: no gradients, glass, blur, or motion.
export const AnimatedBackground = () => <div className="fixed inset-0 -z-10 bg-trust-paper" aria-hidden="true" />;
