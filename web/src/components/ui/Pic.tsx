"use client";
import { useEffect, useRef, useState } from "react";

export type PicData = { src: string; local: boolean; alt: string; credit?: string; w?: number | null; h?: number | null; thumb?: string };

/** stored images come in two sizes: the 640px-box thumbnail and the full file (≤2400px) */
const THUMB_BOX = 640;
function srcSetFor(img: PicData): string | undefined {
  if (!img.local || !img.thumb || img.thumb === img.src || !img.w || !img.h) return undefined;
  const tw = Math.round(img.w >= img.h ? Math.min(THUMB_BOX, img.w) : (Math.min(THUMB_BOX, img.h) * img.w) / img.h);
  if (tw >= img.w) return undefined; // small original: the thumbnail is the same size
  return `${img.thumb} ${tw}w, ${img.src} ${img.w}w`;
}
// what next/image "fill" used to set; the homepage CSS relies on it
const FILL = { position: "absolute", inset: 0, width: "100%", height: "100%", color: "transparent" } as const;

/**
 * Prototype `<img … onerror="this.remove()">`:
 *  - images already imported into our storage → <img srcset> so the browser picks thumbnail or full size
 *  - seed images still on an external URL → plain <img>, removed if the link is dead
 */
export default function Pic({
  img,
  className,
  sizes = "100vw",
  priority,
  eager,
  onDead,
  pos,
}: {
  img: PicData;
  className?: string;
  sizes?: string;
  priority?: boolean;
  eager?: boolean;
  onDead?: () => void;
  /** framing for cropped frames: the point (x%, y%) of the photo to centre, optionally zoomed in */
  pos?: { x: number; y: number; zoom?: number };
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
  const framing = pos ? { objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${pos.zoom ?? 1}) translate(${50 - pos.x}%, ${50 - pos.y}%)` } : undefined;
  const srcSet = srcSetFor(img);
  return (
    <img
      ref={ref}
      src={img.src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={img.alt}
      className={className}
      style={img.local ? { ...FILL, ...framing } : framing}
      data-cr={img.credit}
      fetchPriority={priority ? "high" : undefined}
      loading={priority || eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setDead(true)}
    />
  );
}
