"use client";

import { useEffect, useState, type CSSProperties } from "react";

const FADE = 32;
const activeTab = '[aria-current="page"], [aria-selected="true"], [aria-pressed="true"]';

export function useTabScroller<T extends HTMLElement>(active: unknown) {
  const [element, setElement] = useState<T | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    if (!element) return;
    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const start = scrollLeft > 1;
      const end = scrollLeft + clientWidth < scrollWidth - 1;
      setEdges((current) =>
        current.start === start && current.end === end ? current : { start, end },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [element]);

  useEffect(() => {
    const tab = element?.querySelector<HTMLElement>(activeTab);
    if (!element || !tab) return;
    const box = element.getBoundingClientRect();
    const target = tab.getBoundingClientRect();
    if (target.left < box.left + FADE) element.scrollBy({ left: target.left - box.left - FADE });
    else if (target.right > box.right - FADE) {
      element.scrollBy({ left: target.right - box.right + FADE });
    }
  }, [element, active]);

  let style: CSSProperties | undefined;
  if (edges.start || edges.end) {
    const mask = `linear-gradient(to right, ${edges.start ? "transparent" : "#000"}, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${edges.end ? "transparent" : "#000"})`;
    style = { maskImage: mask, WebkitMaskImage: mask };
  }

  return [setElement, style] as const;
}
