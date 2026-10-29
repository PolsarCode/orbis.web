"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

const HOUR = 60 * 60 * 1000;
const NEW_ACCOUNT_PERIOD = 24 * HOUR;

export function useNewAccountWait() {
  const profile = useAuthStore((state) => state.profile);
  const [now, setNow] = useState(() => Date.now());
  const exempt = !profile || profile.isAdmin || profile.isHeadAdmin;
  const timeLeft = exempt ? 0 : Date.parse(profile.createdAt) + NEW_ACCOUNT_PERIOD - now;
  const isNew = timeLeft > 0;

  useEffect(() => {
    if (!isNew) return;
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, [isNew]);

  if (!isNew) return null;
  const hours = Math.ceil(timeLeft / HOUR);
  return hours <= 1 ? "about an hour" : `about ${hours} hours`;
}

export function newAccountMessage(action: string, wait: string) {
  return `New accounts can ${action} after their first day (${wait} left).`;
}
