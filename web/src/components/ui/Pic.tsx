"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type PicData = { src: string; local: boolean; alt: string; credit?: string; w?: number | null; h?: number | null };

/**
 * Prototype `<img … onerror="this.remove()">`:
 *  - images already imported into our storage → next/image (optimised, responsive)
 *  - seed images still on an external URL → plain <img>, removed if the link is dead
 */
export default function Pic({
  img,
  className,
  sizes = "100vw",
  priority,
  eager,
  onDead,
}: {
  img: PicData;
  className?: string;
  sizes?: string;
  priority?: boolean;
  eager?: boolean;
  onDead?: () => void;
}) {
  const [dead, setDeadState] = useState(false);
  const setDead = (v: boolean) => {
    setDeadState(v);
    if (v) onDead?.();
  };
  const ref = useRef<HTMLImageElement>(null);
  // an <img> that already failed before hydration never fires onError — check once on mount
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setDead(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (dead || !img.src) return null;
  if (img.local)
    return (
      <Image
        src={img.src}
        alt={img.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        data-cr={img.credit}
        ref={ref}
        onError={() => setDead(true)}
      />
    );
  return (
    <img
      ref={ref}
      src={img.src}
      alt={img.alt}
      className={className}
      data-cr={img.credit}
      loading={priority || eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setDead(true)}
    />
  );
}
