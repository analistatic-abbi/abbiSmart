export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateCountUp(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
): () => void {
  if (prefersReducedMotion() || durationMs <= 0) {
    onUpdate(to);
    onComplete?.();
    return () => undefined;
  }

  const start = performance.now();
  let frameId = 0;

  const tick = (now: number) => {
    const progress = Math.min((now - start) / durationMs, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (to - from) * eased);
    onUpdate(value);

    if (progress < 1) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    onComplete?.();
  };

  frameId = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frameId);
}
