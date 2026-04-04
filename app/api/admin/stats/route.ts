// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30", 10), 1), 180);

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  try {
    // ─── 1. Toutes les vues de la période ─────────────────────────────────────
    const { data: allViews, error: viewsErr } = await supabaseAdmin
      .from("page_views")
      .select("path, created_at, device_id, referrer, utm_source, utm_medium, utm_campaign, country")
      .gte("created_at", since.toISOString());

    if (viewsErr) throw new Error(viewsErr.message);

    const views = allViews ?? [];

    // ─── 2. Totaux ────────────────────────────────────────────────────────────
    const totalViews = views.length;
    const uniqueVisitors = new Set(views.map((v) => v.device_id).filter(Boolean)).size;

    // ─── 3. Bilan journalier ──────────────────────────────────────────────────
    const dailyMap: Record<string, { views: number; visitors: Set<string> }> = {};

    for (const row of views) {
      const date = (row.created_at as string).slice(0, 10); // "YYYY-MM-DD"
      if (!dailyMap[date]) dailyMap[date] = { views: 0, visitors: new Set() };
      dailyMap[date].views++;
      if (row.device_id) dailyMap[date].visitors.add(row.device_id);
    }

    // Série continue — jours sans visite inclus avec 0
    const daily: { date: string; views: number; unique_visitors: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = dailyMap[dateStr];
      daily.push({
        date: dateStr,
        views: entry?.views ?? 0,
        unique_visitors: entry?.visitors.size ?? 0,
      });
    }

    // ─── 4. Top pages ─────────────────────────────────────────────────────────
    const pageCount: Record<string, number> = {};
    for (const row of views) {
      const p = row.path ?? "/";
      pageCount[p] = (pageCount[p] ?? 0) + 1;
    }
    const topPages = Object.entries(pageCount)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ─── 5. Top places ────────────────────────────────────────────────────────
    const placeCount: Record<string, number> = {};
    for (const row of views) {
      const m = (row.path ?? "").match(/^\/place\/([^/]+)$/);
      if (m) placeCount[m[1]] = (placeCount[m[1]] ?? 0) + 1;
    }
    const topPlaceIds = Object.entries(placeCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);

    let topPlaces: { id: string; name: string; count: number; href: string }[] = [];
    if (topPlaceIds.length) {
      const { data: pd } = await supabaseAdmin
        .from("places").select("id, name").in("id", topPlaceIds);
      topPlaces = (pd ?? [])
        .map((p) => ({ id: p.id, name: p.name, count: placeCount[p.id] ?? 0, href: `/place/${p.id}` }))
        .sort((a, b) => b.count - a.count);
    }

    // ─── 6. Top events ────────────────────────────────────────────────────────
    const eventCount: Record<string, number> = {};
    for (const row of views) {
      const m = (row.path ?? "").match(/^\/event\/([^/]+)$/);
      if (m) eventCount[m[1]] = (eventCount[m[1]] ?? 0) + 1;
    }
    const topEventIds = Object.entries(eventCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);

    let topEvents: { id: string; title: string; count: number; href: string }[] = [];
    if (topEventIds.length) {
      const { data: ed } = await supabaseAdmin
        .from("events").select("id, title").in("id", topEventIds);
      topEvents = (ed ?? [])
        .map((e) => ({ id: e.id, title: e.title, count: eventCount[e.id] ?? 0, href: `/event/${e.id}` }))
        .sort((a, b) => b.count - a.count);
    }

    // ─── 7. Sources de trafic (bonus — utm_source) ────────────────────────────
    const sourceCount: Record<string, number> = {};
    for (const row of views) {
      const src = row.utm_source || row.referrer || "direct";
      sourceCount[src] = (sourceCount[src] ?? 0) + 1;
    }
    const topSources = Object.entries(sourceCount)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── 8. Top pays ──────────────────────────────────────────────────────────
    const countryCount: Record<string, number> = {};
    for (const row of views) {
      const country = row.country || "Inconnu";
      countryCount[country] = (countryCount[country] ?? 0) + 1;
    }
    const topCountries = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count, pct: Math.round(count / totalViews * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // ─── 9. Réponse ───────────────────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      days,
      since: since.toISOString(),
      totals: { views: totalViews, unique_visitors: uniqueVisitors },
      daily,
      topPages,
      topPlaces,
      topEvents,
      topSources,
      topCountries,
    });

  } catch (err: any) {
    console.error("[stats]", err);
    return NextResponse.json({ error: err?.message ?? "Erreur inconnue" }, { status: 500 });
  }
}