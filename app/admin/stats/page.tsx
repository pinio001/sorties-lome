// app/admin/stats/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BingoBackground from "../../components/BingoBackground";

type StatsPayload = {
  ok: boolean;
  days: number;
  since: string;
  totals: { views: number; unique_visitors: number };
  topPages: { path: string; count: number }[];
  topPlaces: { id: string; name: string; count: number; href: string }[];
  topEvents: { id: string; title: string; count: number; href: string }[];
  error?: string;
};

function fmt(n: number) {
  try {
    return n.toLocaleString("fr-FR");
  } catch {
    return String(n);
  }
}

export default function AdminStatsPage() {
  const [days, setDays] = useState<7 | 30>(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/stats?days=${d}`, {
        cache: "no-store",
      });

      const txt = await res.text();
      const json = txt ? JSON.parse(txt) : {};

      if (!res.ok) {
        setErr(json?.error || "Erreur serveur");
        setData(null);
      } else {
        setData(json);
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const sinceText = useMemo(() => {
    if (!data?.since) return "";
    try {
      const d = new Date(data.since);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [data?.since]);

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center shadow-lg">
              <span className="font-black text-xl tracking-tight">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/60">Admin • Stats</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
            >
              Accueil
            </a>
            <a
              href="/admin"
              className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
            >
              Admin
            </a>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-white font-semibold">Analytique (visites)</div>
              <div className="text-xs text-white/60">
                Période : {days} jours {sinceText ? `• depuis ${sinceText}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDays(7)}
                className={`px-3 py-2 rounded-xl text-sm border transition ${
                  days === 7
                    ? "bg-white text-black"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                7 jours
              </button>
              <button
                onClick={() => setDays(30)}
                className={`px-3 py-2 rounded-xl text-sm border transition ${
                  days === 30
                    ? "bg-white text-black"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                30 jours
              </button>

              <button
                onClick={() => load(days)}
                className="px-3 py-2 rounded-xl text-sm border border-white/20 text-white hover:bg-white/10"
              >
                Rafraîchir
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-white/70 mt-6">Chargement…</div>
        ) : err ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Erreur : {err}
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-xs text-white/60">Vues totales</div>
                <div className="text-3xl text-white font-bold mt-1">
                  {fmt(data?.totals?.views ?? 0)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-xs text-white/60">Visiteurs uniques</div>
                <div className="text-3xl text-white font-bold mt-1">
                  {fmt(data?.totals?.unique_visitors ?? 0)}
                </div>
              </div>
            </div>

            {/* Top Pages */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">Top pages</div>
                <div className="text-xs text-white/60">
                  {data?.topPages?.length ?? 0} lignes
                </div>
              </div>

              <div className="space-y-2">
                {(data?.topPages ?? []).slice(0, 15).map((p) => (
                  <div
                    key={p.path}
                    className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2"
                  >
                    <a
                      className="text-sm text-white hover:underline break-all"
                      href={p.path.startsWith("/") ? p.path : `/${p.path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {p.path}
                    </a>
                    <div className="text-sm text-white/70 shrink-0">
                      {fmt(p.count)}
                    </div>
                  </div>
                ))}

                {(data?.topPages ?? []).length === 0 && (
                  <div className="text-white/60 text-sm">Aucune donnée.</div>
                )}
              </div>
            </div>

            {/* Top Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-white font-semibold mb-3">
                  Top places (détails)
                </div>

                <div className="space-y-2">
                  {(data?.topPlaces ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2"
                    >
                      <a
                        className="text-sm text-white hover:underline break-all"
                        href={p.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.name}
                      </a>
                      <div className="text-sm text-white/70 shrink-0">
                        {fmt(p.count)}
                      </div>
                    </div>
                  ))}

                  {(data?.topPlaces ?? []).length === 0 && (
                    <div className="text-white/60 text-sm">Aucune donnée.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-white font-semibold mb-3">
                  Top events (détails)
                </div>

                <div className="space-y-2">
                  {(data?.topEvents ?? []).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2"
                    >
                      <a
                        className="text-sm text-white hover:underline break-all"
                        href={e.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {e.title}
                      </a>
                      <div className="text-sm text-white/70 shrink-0">
                        {fmt(e.count)}
                      </div>
                    </div>
                  ))}

                  {(data?.topEvents ?? []).length === 0 && (
                    <div className="text-white/60 text-sm">Aucune donnée.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
