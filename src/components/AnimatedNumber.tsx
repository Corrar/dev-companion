import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/** Numeric counter that tweens from previous → next value with GSAP. */
export function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
  duration = 1.2,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const prev = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: prev.current };
    const tween = gsap.to(obj, {
      v: value,
      duration,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = `${obj.v.toFixed(decimals)}${suffix}`;
      },
      onComplete: () => {
        prev.current = value;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, suffix, decimals, duration]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}
