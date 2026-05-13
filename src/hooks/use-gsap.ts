import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Run a GSAP animation scoped to a container ref. The setup function receives
 * a gsap.Context that auto-cleans on unmount. Re-runs when deps change.
 */
export function useGsap<T extends HTMLElement = HTMLDivElement>(
  setup: (ctx: gsap.Context, el: T) => void,
  deps: React.DependencyList = [],
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ctx = gsap.context((self) => setup(self, el), el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Tween a numeric counter from 0 → value, writing into the DOM node. */
export function animateCounter(
  el: HTMLElement | null,
  value: number,
  opts: { duration?: number; suffix?: string; decimals?: number } = {},
) {
  if (!el) return;
  const { duration = 1.2, suffix = "", decimals = 0 } = opts;
  const obj = { v: 0 };
  gsap.to(obj, {
    v: value,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = `${obj.v.toFixed(decimals)}${suffix}`;
    },
  });
}
