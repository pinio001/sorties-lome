// app/admin/stats/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BingoBackground from "../../components/BingoBackground";

type DayStat = {
  date: string; // "YYYY-MM-DD"
  views: number;
  unique_visitors: number;
};

type StatsPayload = {
  ok: boolean;
  days: number;
  since: string;
  totals: { views: number; unique_visitors: number };
  daily: DayStat[];
  topPages: { path: string; count: number }[];
  topPlaces: { id: string; name: string; count: number; href: string }[];
  topEvents: { id: string; title: string; count: number; href: string }[];
  error?: string;
};

function fmt(n: number) {
  try { return n.toLocaleString("fr-FR"); } catch { return String(n); }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

function fmtDateLong(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "short", day: "2-digit", month: "short",
    });
  } catch { return iso; }
}

// ─── Graphique barres ─────────────────────────────────────────────────────────
function BarChart({ data }: { data: DayStat[] }) {
  if (!data.length) return <div className="text-white/40 text-sm py-6 text-center">Pas de données</div>;

  const maxV = Math.max(...data.map((d) => d.views), 1);
  const H = 80;
  const barW = Math.max(6, Math.floor(560 / data.length) - 3);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${data.length * (barW + 3)} ${H + 28}`}
        style={{ width: "100%", minWidth: data.length * (barW + 3), height: H + 28 }}
      >
        {data.map((d, i) => {
          const barH = Math.max(2, (d.views / maxV) * H);
          const x = i * (barW + 3);
          const isToday = d.date === today;
          const showLabel = data.length <= 14 || i % Math.ceil(data.length / 10) === 0;
          return (
            <g key={d.date}>
              <rect
                x={x} y={H - barH} width={barW} height={barH} rx={3}
                fill={isToday ? "#4ade80" : "rgba(255,255,255,0.55)"}
              />
              {showLabel && (
                <text x={x + barW / 2} y={H + 18} textAnchor="middle"
                  fill="rgba(255,255,255,.3)" fontSize={8}>
                  {fmtDate(d.date)}
                </text>
              )}
              <title>{fmtDateLong(d.date)} — {d.views} vues · {d.unique_visitors} uniques</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Tableau journalier ───────────────────────────────────────────────────────
function DailyTable({ data }: { data: DayStat[] }) {
  const sorted = [...data].reverse();
  const maxV = Math.max(...data.map((d) => d.views), 1);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      {sorted.map((d) => {
        const isToday = d.date === today;
        const pct = Math.round((d.views / maxV) * 100);
        return (
          <div key={d.date}
            className="rounded-xl px-3 py-2"
            style={{
              border: `1px solid ${isToday ? "rgba(74,222,128,.3)" : "rgba(255,255,255,.07)"}`,
              background: isToday ? "rgba(74,222,128,.05)" : "rgba(0,0,0,.2)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: isToday ? "#4ade80" : "rgba(255,255,255,.7)" }}>
                {isToday ? "🟢 Aujourd'hui" : fmtDateLong(d.date)}
              </span>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span><span className="text-white font-semibold">{fmt(d.views)}</span> vues</span>
                <span><span className="text-white/70">{fmt(d.unique_visitors)}</span> uniques</span>
              </div>
            </div>
            <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,.08)" }}>
              <div className="h-1 rounded-full"
                style={{ width: `${pct}%`, background: isToday ? "#4ade80" : "rgba(255,255,255,.4)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminStatsPage() {
  const [days, setDays] = useState<7 | 30>(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dailyView, setDailyView] = useState<"chart" | "table">("chart");

  const load = async (d: number) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/stats?days=${d}`, { cache: "no-store" });
      const txt = await res.text();
      const json = txt ? JSON.parse(txt) : {};
      if (!res.ok) { setErr(json?.error || "Erreur serveur"); setData(null); }
      else setData(json);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const sinceText = useMemo(() => {
    if (!data?.since) return "";
    try {
      return new Date(data.since).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return ""; }
  }, [data?.since]);

  const todayStat = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data?.daily?.find((d) => d.date === today) ?? null;
  }, [data?.daily]);

  const bestDay = useMemo(() => {
    if (!data?.daily?.length) return null;
    return [...data.daily].sort((a, b) => b.views - a.views)[0];
  }, [data?.daily]);

  const avgDaily = useMemo(() => {
    if (!data?.daily?.length) return 0;
    return Math.round(data.daily.reduce((s, d) => s + d.views, 0) / data.daily.length);
  }, [data?.daily]);

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
            <a href="/" className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10">Accueil</a>
            <a href="/admin" className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10">Admin</a>
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
              {([7, 30] as const).map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-2 rounded-xl text-sm border transition ${
                    days === d ? "bg-white text-black" : "border-white/20 text-white hover:bg-white/10"
                  }`}>
                  {d} jours
                </button>
              ))}
              <button onClick={() => load(days)}
                className="px-3 py-2 rounded-xl text-sm border border-white/20 text-white hover:bg-white/10">
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
            {/* ── KPI TOTAUX ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Vues totales",      value: fmt(data?.totals?.views ?? 0),           sub: `${days}j` },
                { label: "Visiteurs uniques", value: fmt(data?.totals?.unique_visitors ?? 0), sub: `${days}j` },
                { label: "Moy. / jour",       value: fmt(avgDaily),                           sub: "vues" },
                { label: "Meilleur jour",     value: bestDay ? fmt(bestDay.views) : "—",      sub: bestDay ? fmtDate(bestDay.date) : "" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="text-xs text-white/50 mb-1">{label}</div>
                  <div className="text-2xl text-white font-bold leading-none">{value}</div>
                  {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
                </div>
              ))}
            </div>

            {/* ── AUJOURD'HUI ── */}
            {todayStat && (
              <div className="rounded-2xl border border-green-500/25 bg-green-500/5 p-4 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-green-400/80 uppercase tracking-widest mb-1">🟢 Aujourd'hui</div>
                  <div className="text-white font-semibold">
                    {fmt(todayStat.views)} vues · {fmt(todayStat.unique_visitors)} visiteurs uniques
                  </div>
                </div>
                <div className="text-3xl opacity-20">📈</div>
              </div>
            )}

            {/* ── BILAN JOURNALIER ── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-semibold">Bilan journalier</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDailyView("chart")}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      dailyView === "chart" ? "bg-white text-black border-white" : "border-white/20 text-white/60 hover:bg-white/10"
                    }`}>
                    Graphique
                  </button>
                  <button onClick={() => setDailyView("table")}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      dailyView === "table" ? "bg-white text-black border-white" : "border-white/20 text-white/60 hover:bg-white/10"
                    }`}>
                    Tableau
                  </button>
                </div>
              </div>
              {dailyView === "chart" ? (
                <>
                  <div className="text-xs text-white/30 mb-3">Vues par jour · 🟢 = aujourd'hui</div>
                  <BarChart data={data?.daily ?? []} />
                </>
              ) : (
                <DailyTable data={data?.daily ?? []} />
              )}
            </div>

            {/* ── TOP PAGES ── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">Top pages</div>
                <div className="text-xs text-white/60">{data?.topPages?.length ?? 0} lignes</div>
              </div>
              <div className="space-y-2">
                {(data?.topPages ?? []).slice(0, 15).map((p) => (
                  <div key={p.path} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2">
                    <a className="text-sm text-white hover:underline break-all"
                      href={p.path.startsWith("/") ? p.path : `/${p.path}`}
                      target="_blank" rel="noreferrer">
                      {p.path}
                    </a>
                    <div className="text-sm text-white/70 shrink-0">{fmt(p.count)}</div>
                  </div>
                ))}
                {(data?.topPages ?? []).length === 0 && (
                  <div className="text-white/60 text-sm">Aucune donnée.</div>
                )}
              </div>
            </div>

            {/* ── TOP PLACES / EVENTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-white font-semibold mb-3">Top places (détails)</div>
                <div className="space-y-2">
                  {(data?.topPlaces ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2">
                      <a className="text-sm text-white hover:underline break-all" href={p.href} target="_blank" rel="noreferrer">
                        {p.name}
                      </a>
                      <div className="text-sm text-white/70 shrink-0">{fmt(p.count)}</div>
                    </div>
                  ))}
                  {(data?.topPlaces ?? []).length === 0 && <div className="text-white/60 text-sm">Aucune donnée.</div>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-white font-semibold mb-3">Top events (détails)</div>
                <div className="space-y-2">
                  {(data?.topEvents ?? []).map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2">
                      <a className="text-sm text-white hover:underline break-all" href={e.href} target="_blank" rel="noreferrer">
                        {e.title}
                      </a>
                      <div className="text-sm text-white/70 shrink-0">{fmt(e.count)}</div>
                    </div>
                  ))}
                  {(data?.topEvents ?? []).length === 0 && <div className="text-white/60 text-sm">Aucune donnée.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}