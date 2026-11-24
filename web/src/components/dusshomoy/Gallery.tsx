"use client";
import { useState } from "react";
import s from "@/components/forms/forms.module.css";

export default function Gallery({ images }: { images: { id: string; full: string; thumb: string }[] }) {
  const [cur, setCur] = useState(0);
  return (
    <>
      <div className={s.gallery}>
        <img src={images[cur].full} alt="" />
      </div>
      {images.length > 1 && (
        <div className={s.thumbs}>
          {images.map((im, i) => (
            <button key={im.id} type="button" className={i === cur ? s.on : ""} aria-label={String(i + 1)} onClick={() => setCur(i)}>
              <img src={im.thumb} alt="" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
