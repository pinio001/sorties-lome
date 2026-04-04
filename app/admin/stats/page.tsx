// app/admin/stats/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BingoBackground from "../../components/BingoBackground";

type DayStat = {
  date: string;   // "YYYY-MM-DD"
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
  topCountries: { country: string; count: number; pct: number }[];
  error?: string;
};

function fmt(n: number) {
  try { return n.toLocaleString("fr-FR"); } catch { return String(n); }
}

const COUNTRY_NAMES: Record<string, string> = {
  TG:"Togo", FR:"France", BJ:"Bénin", CI:"Côte d'Ivoire", SN:"Sénégal",
  GH:"Ghana", ML:"Mali", CM:"Cameroun", US:"États-Unis", GB:"Royaume-Uni",
  DE:"Allemagne", BE:"Belgique", CA:"Canada", NG:"Nigéria", MA:"Maroc",
  NE:"Niger", BF:"Burkina Faso", CD:"RD Congo", GA:"Gabon", CH:"Suisse",
};

function countryName(code: string) {
  return COUNTRY_NAMES[code] ?? code;
}

function flagEmoji(code: string) {
  if (code.length !== 2) return "🌍";
  const offset = 127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + offset));
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

function fmtDateLong(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
  } catch { return iso; }
}

function fmtPlaceName(name: string) {
  if (!name) return name;
  // Convertit "LE BELUGA" → "Le Beluga", "O THAÏ" → "O Thaï"
  return name.toLowerCase().replace(/(^|\s|-)([a-zàâäéèêëîïôùûüç])/g, (_,a,b) => a + b.toUpperCase());
}

// ─── Mini bar chart SVG ───────────────────────────────────────────────────────
function BarChart({ data, color = "#fff" }: { data: DayStat[]; color?: string }) {
  if (!data.length) return <div className="text-white/40 text-sm text-center py-8">Pas de données</div>;

  const maxViews = Math.max(...data.map(d => d.views), 1);
  const barW = Math.max(6, Math.floor(560 / data.length) - 3);
  const chartH = 80;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${data.length * (barW + 3)} ${chartH + 28}`}
        style={{ width: "100%", minWidth: Math.min(data.length * (barW + 3), 100), height: chartH + 28 }}
      >
        {data.map((d, i) => {
          const barH = Math.max(2, (d.views / maxViews) * chartH);
          const x = i * (barW + 3);
          const y = chartH - barH;
          const isToday = d.date === new Date().toISOString().slice(0, 10);
          return (
            <g key={d.date}>
              <rect
                x={x} y={y} width={barW} height={barH} rx={3}
                fill={isToday ? "#4ade80" : color}
                opacity={isToday ? 1 : 0.6}
              />
              {/* Label date — seulement tous les N pour éviter surcharge */}
              {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && (
                <text
                  x={x + barW / 2} y={chartH + 18}
                  textAnchor="middle" fill="rgba(255,255,255,.35)"
                  fontSize={8}
                >
                  {fmtDate(d.date)}
                </text>
              )}
              {/* Tooltip au survol via title */}
              <title>{fmtDateLong(d.date)} — {d.views} vues · {d.unique_visitors} uniques</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Daily table ──────────────────────────────────────────────────────────────
function DailyTable({ data }: { data: DayStat[] }) {
  const sorted = [...data].reverse(); // plus récent en premier
  const maxViews = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      {sorted.map((d) => {
        const pct = Math.round((d.views / maxViews) * 100);
        const isToday = d.date === new Date().toISOString().slice(0, 10);
        return (
          <div key={d.date}
            className="rounded-xl px-3 py-2"
            style={{ border: `1px solid ${isToday ? "rgba(74,222,128,.3)" : "rgba(255,255,255,.07)"}`, background: isToday ? "rgba(74,222,128,.05)" : "rgba(0,0,0,.2)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: isToday ? "#4ade80" : "rgba(255,255,255,.7)" }}>
                {isToday ? "🟢 Aujourd'hui" : fmtDateLong(d.date)}
              </span>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span><span className="text-white font-semibold">{fmt(d.views)}</span> vues</span>
                <span><span className="text-white/70">{fmt(d.unique_visitors)}</span> uniques</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,.08)" }}>
              <div className="h-1 rounded-full transition-all"
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
  const [days, setDays]       = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<StatsPayload | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [dailyView, setDailyView] = useState<"chart" | "table">("chart");

  const load = async (d: number) => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/stats?days=${d}`, { cache: "no-store" });
      const txt = await res.text();
      const json = txt ? JSON.parse(txt) : {};
      if (!res.ok) { setErr(json?.error || "Erreur serveur"); setData(null); }
      else setData(json);
    } catch (e: any) { setErr(e?.message || "Erreur"); setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(days); }, [days]);

  const sinceText = useMemo(() => {
    if (!data?.since) return "";
    try {
      return new Date(data.since).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
    } catch { return ""; }
  }, [data?.since]);

  // Stats journée du jour
  const todayStat = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data?.daily?.find(d => d.date === today) ?? null;
  }, [data?.daily]);

  // Meilleur jour
  const bestDay = useMemo(() => {
    if (!data?.daily?.length) return null;
    return [...data.daily].sort((a, b) => b.views - a.views)[0];
  }, [data?.daily]);

  // Moyenne journalière
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
              {([7, 30, 90] as const).map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-2 rounded-xl text-sm border transition ${days === d ? "bg-white text-black" : "border-white/20 text-white hover:bg-white/10"}`}>
                  {d} jours
                </button>
              ))}
              <button onClick={() => load(days)}
                className="px-3 py-2 rounded-xl text-sm border border-white/20 text-white hover:bg-white/10">
                ↺
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 mt-8 text-white/60">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"300ms" }} />
          </div>
        ) : err ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">Erreur : {err}</div>
        ) : (
          <>
            {/* ── KPI TOTAUX ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Vues totales",      value: fmt(data?.totals?.views ?? 0),            sub: `${days}j` },
                { label: "Visiteurs uniques", value: fmt(data?.totals?.unique_visitors ?? 0),  sub: `${days}j` },
                { label: "Moy. / jour",       value: fmt(avgDaily),                            sub: "vues" },
                { label: "Meilleur jour",     value: bestDay ? fmt(bestDay.views) : "—",       sub: bestDay ? fmtDate(bestDay.date) : "" },
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
                  <div className="text-white font-semibold">{fmt(todayStat.views)} vues · {fmt(todayStat.unique_visitors)} visiteurs uniques</div>
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
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${dailyView === "chart" ? "bg-white text-black border-white" : "border-white/20 text-white/60 hover:bg-white/10"}`}>
                    Graphique
                  </button>
                  <button onClick={() => setDailyView("table")}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${dailyView === "table" ? "bg-white text-black border-white" : "border-white/20 text-white/60 hover:bg-white/10"}`}>
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
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">Top pages</div>
                <div className="text-xs text-white/60">{data?.topPages?.length ?? 0} lignes</div>
              </div>
              <div className="space-y-2">
                {(data?.topPages ?? []).slice(0, 15).map((p) => (
                  <div key={p.path} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2">
                    <a className="text-sm text-white hover:underline break-all"
                      href={p.path.startsWith("/") ? p.path : `/${p.path}`} target="_blank" rel="noreferrer">
                      {p.path}
                    </a>
                    <div className="text-sm text-white/70 shrink-0">{fmt(p.count)}</div>
                  </div>
                ))}
                {(data?.topPages ?? []).length === 0 && <div className="text-white/60 text-sm">Aucune donnée.</div>}
              </div>
            </div>

            {/* ── TOP PLACES / EVENTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { title: "Top places (détails)", items: data?.topPlaces ?? [], keyField: "id", nameField: "name" },
                { title: "Top events (détails)",  items: data?.topEvents ?? [], keyField: "id", nameField: "title" },
              ].map(({ title, items }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="text-white font-semibold mb-3">{title}</div>
                  <div className="space-y-2">
                    {(items as any[]).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 rounded-xl px-3 py-2">
                        <a className="text-sm text-white hover:underline break-all" href={item.href} target="_blank" rel="noreferrer">
                          {item.name ? fmtPlaceName(item.name) : item.title}
                        </a>
                        <div className="text-sm text-white/70 shrink-0">{fmt(item.count)}</div>
                      </div>
                    ))}
                    {items.length === 0 && <div className="text-white/60 text-sm">Aucune donnée.</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* ── TOP PAYS ── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-semibold">🌍 Pays des visiteurs</div>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{data?.topCountries?.length ?? 0} pays</span>
              </div>
              {!data?.topCountries?.length ? (
                <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", textAlign:"center", padding:"16px 0" }}>
                  Aucune donnée — exécute le SQL ci-dessous pour activer
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topCountries.map((c: any, i: number) => (
                    <div key={c.country} className="flex items-center gap-3">
                      <span style={{ fontSize:20, width:28, textAlign:"center", lineHeight:1 }}>{flagEmoji(c.country)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize:13, color:"#fff", fontWeight: i === 0 ? 600 : 400 }}>
                            {countryName(c.country)}
                          </span>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,.45)" }}>
                            {fmt(c.count)} · {c.pct}%
                          </span>
                        </div>
                        <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,.08)", overflow:"hidden" }}>
                          <div style={{
                            height:"100%", borderRadius:3,
                            width:`${c.pct}%`,
                            background: i === 0 ? "#4ade80" : i === 1 ? "rgba(74,222,128,.55)" : "rgba(255,255,255,.2)",
                            transition:"width .6s ease"
                          }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}