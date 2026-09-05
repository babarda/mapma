"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Sends one page view to /api/track per route change. First-party, no cookie,
// no third-party script. The referrer and UTM tags are only meaningful on the
// first view of a page load; later in-app navigations send them empty.
// Admin pages are never counted.

let firstView = true;
let lastSent = "";
let lastSentAt = 0;

function utm(params: URLSearchParams, key: string): string | null {
  const v = params.get(key);
  return v ? v.slice(0, 200) : null;
}

export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (/^\/([a-z]{2}\/)?admin(\/|$)/.test(pathname)) return;
    const now = Date.now();
    // React strict mode runs effects twice in dev; ignore the duplicate.
    if (pathname === lastSent && now - lastSentAt < 1500) return;
    lastSent = pathname;
    lastSentAt = now;

    const params = new URLSearchParams(window.location.search);
    const payload = {
      path: pathname,
      referrer: firstView ? document.referrer || "" : "",
      utmSource: firstView ? utm(params, "utm_source") : null,
      utmMedium: firstView ? utm(params, "utm_medium") : null,
      utmCampaign: firstView ? utm(params, "utm_campaign") : null,
      screenWidth: window.innerWidth,
    };
    firstView = false;

    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon("/api/track", new Blob([body], { type: "text/plain" }));
        if (ok) return;
      }
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Never let analytics break the page.
    }
  }, [pathname]);

  return null;
}
