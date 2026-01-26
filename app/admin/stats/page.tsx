// app/admin/stats/page.tsx
"use client";

import { useEffect, useState } from "react";

type Stats = {
  totals30: Record<string, number>;
  totals7: Record<string, number>;
  topSources: { utm_source: string; clicks: number }[];
  topPlacesWhatsapp: { id: string; name: string; clicks: number }[];
  topPlacesMaps: { id: string; name: string; clicks: number }[];
};

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch("/api/admin/stats", { credentials: "include" });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
          setErr(data?.error || "Erreur");
          setStats(null);
          return;
        }

        setStats(data);
      } catch (e: any) {
        setErr(e?.message || "Erreur");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const card = (title: string, value: any) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{title}</div>
      <div className="text-2xl font-extrabold text-white mt-1">{value}</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between">
          <a
            href="/admin"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            ← Admin
          </a>
          <a
            href="/places"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            Voir Places →
          </a>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-lg font-semibold">Stats (clics)</div>
          <div className="text-sm text-white/60">
            Tracking WhatsApp / Adresse / Liens • 7 jours & 30 jours
          </div>
        </div>

        {loading ? (
          <div className="text-white/70">Chargement…</div>
        ) : err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 text-sm">
            Erreur : {err}
          </div>
        ) : !stats ? (
          <div className="text-white/70">Aucune donnée.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {card("Total clics (30j)", stats.totals30?.total ?? 0)}
              {card("Total clics (7j)", stats.totals7?.total ?? 0)}
              {card("WhatsApp (30j)", stats.totals30?.whatsapp ?? 0)}
              {card("Adresse (30j)", stats.totals30?.maps ?? 0)}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {card("Web", stats.totals30?.website ?? 0)}
              {card("Instagram", stats.totals30?.instagram ?? 0)}
              {card("TikTok", stats.totals30?.tiktok ?? 0)}
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">Top Places — WhatsApp (30j)</div>
              <div className="mt-3 space-y-2">
                {stats.topPlacesWhatsapp?.length ? (
                  stats.topPlacesWhatsapp.map((x, idx) => (
                    <div
                      key={x.id}
                      className="flex items-center justify-between gap-3 border border-white/10 bg-black/30 rounded-xl px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">
                          {idx + 1}. {x.name}
                        </div>
                        <div className="text-xs text-white/50 truncate">{x.id}</div>
                      </div>
                      <div className="text-sm text-white">❤️ {x.clicks}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-white/60">Aucun clic.</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">Top Places — Adresse (30j)</div>
              <div className="mt-3 space-y-2">
                {stats.topPlacesMaps?.length ? (
                  stats.topPlacesMaps.map((x, idx) => (
                    <div
                      key={x.id}
                      className="flex items-center justify-between gap-3 border border-white/10 bg-black/30 rounded-xl px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">
                          {idx + 1}. {x.name}
                        </div>
                        <div className="text-xs text-white/50 truncate">{x.id}</div>
                      </div>
                      <div className="text-sm text-white">📍 {x.clicks}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-white/60">Aucun clic.</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">Top sources (utm_source)</div>
              <div className="mt-3 space-y-2">
                {stats.topSources?.length ? (
                  stats.topSources.map((x, idx) => (
                    <div
                      key={x.utm_source + idx}
                      className="flex items-center justify-between gap-3 border border-white/10 bg-black/30 rounded-xl px-3 py-2"
                    >
                      <div className="text-sm text-white">
                        {idx + 1}. {x.utm_source}
                      </div>
                      <div className="text-sm text-white">{x.clicks}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-white/60">Aucune source.</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
