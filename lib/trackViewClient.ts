// lib/trackViewClient.ts
function getOrCreateDeviceId() {
  const key = "bingo_device_id";
  try {
    let v = localStorage.getItem(key) || "";
    if (!v) {
      v =
        "dev_" +
        Math.random().toString(16).slice(2) +
        "_" +
        Date.now().toString(16);
      localStorage.setItem(key, v);
    }
    return v;
  } catch {
    return "dev_" + Date.now().toString(16);
  }
}

// ⚠️ Anti-spam (1 view par page / session). Supprime si tu veux tout compter.
function shouldSendOncePerSession(path: string) {
  try {
    const k = `bingo_viewed:${path}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
    return true;
  } catch {
    return true;
  }
}

export function trackPageView(opts?: {
  entity_type?: "place" | "event";
  entity_id?: string;
}) {
  if (typeof window === "undefined") return;

  const path = window.location.pathname + window.location.search;
  if (!shouldSendOncePerSession(path)) return;

  const device_id = getOrCreateDeviceId();
  const referrer = document.referrer || null;

  const sp = new URLSearchParams(window.location.search);
  const utm_source = sp.get("utm_source");
  const utm_medium = sp.get("utm_medium");
  const utm_campaign = sp.get("utm_campaign");

  const body = JSON.stringify({
    path,
    referrer,
    device_id,
    entity_type: opts?.entity_type || null,
    entity_id: opts?.entity_id || null,
    utm_source,
    utm_medium,
    utm_campaign,
  });

  // ✅ Plus fiable qu’un fetch quand on change vite de page
  try {
    const ok = navigator.sendBeacon?.(
      "/api/track/view",
      new Blob([body], { type: "application/json" })
    );
    if (ok) return;
  } catch {}

  fetch("/api/track/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
