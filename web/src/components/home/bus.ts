"use client";
// Tiny event bus between independent homepage islands (nav, chooser, quick-start panels, form modal).
export type GiveKey = "bb" | "sh";
export type GivePre = { y?: string; t?: string[] };

export const openGive = (k: GiveKey, src?: Element | null, pre?: GivePre) =>
  window.dispatchEvent(new CustomEvent("give:open", { detail: { k, rect: src?.getBoundingClientRect() ?? null, pre } }));

export const openChooser = (src?: HTMLElement | null) =>
  window.dispatchEvent(new CustomEvent("chooser:open", { detail: { src } }));
