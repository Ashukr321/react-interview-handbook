"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // Dev chunks change constantly; caching them would serve stale code while developing.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
