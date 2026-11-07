"use client";

import { useState, type UIEvent } from "react";

export function useCollapsingHeader() {
  const [collapsed, setCollapsed] = useState(false);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const room = scrollHeight - clientHeight;
    setCollapsed((current) => (current ? scrollTop > 0 : scrollTop > 32 && room > 240));
  }

  return [collapsed, onScroll] as const;
}
