// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const days = clamp(Number(url.searchParams.get("days") || "30"), 1, 90);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from("page_views")
      .select("created_at,path,device_id,entity_type,entity_id")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows =
      (data ?? []).map((r: any) => ({
        created_at: r.created_at as string,
        path: (r.path || "/") as string,
        device_id: (r.device_id || "") as string,
        entity_type: (r.entity_type || null) as "place" | "event" | null,
        entity_id: (r.entity_id || null) as string | null,
      })) || [];

    const totalViews = rows.length;
    const uniqueVisitors = new Set(rows.map((r) => r.device_id).filter(Boolean))
      .size;

    const byPath = new Map<string, number>();
    for (const r of rows) {
      const p = r.path || "/";
      byPath.set(p, (byPath.get(p) || 0) + 1);
    }

    const topPages = Array.from(byPath.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([path, count]) => ({ path, count }));

    const detailsRows = rows.filter(
      (r) => (r.entity_type === "place" || r.entity_type === "event") && r.entity_id
    );

    const placeCounts = new Map<string, number>();
    const eventCounts = new Map<string, number>();

    for (const r of detailsRows) {
      if (r.entity_type === "place" && r.entity_id) {
        placeCounts.set(r.entity_id, (placeCounts.get(r.entity_id) || 0) + 1);
      }
      if (r.entity_type === "event" && r.entity_id) {
        eventCounts.set(r.entity_id, (eventCounts.get(r.entity_id) || 0) + 1);
      }
    }

    const topPlaceIds = Array.from(placeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topEventIds = Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const [placesRes, eventsRes] = await Promise.all([
      topPlaceIds.length
        ? supabaseAdmin.from("places").select("id,name").in("id", topPlaceIds)
        : Promise.resolve({ data: [], error: null } as any),
      topEventIds.length
        ? supabaseAdmin.from("events").select("id,title").in("id", topEventIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (placesRes?.error) {
      return NextResponse.json({ error: placesRes.error.message }, { status: 500 });
    }
    if (eventsRes?.error) {
      return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
    }

    const placeNameById = new Map<string, string>();
    for (const p of placesRes.data ?? []) {
      placeNameById.set(p.id, p.name ?? "Sans nom");
    }

    const eventTitleById = new Map<string, string>();
    for (const e of eventsRes.data ?? []) {
      eventTitleById.set(e.id, e.title ?? "Sans titre");
    }

    const topPlaces = Array.from(placeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({
        id,
        name: placeNameById.get(id) || "Place",
        count,
        href: `/place/${id}`,
      }));

    const topEvents = Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({
        id,
        title: eventTitleById.get(id) || "Event",
        count,
        href: `/event/${id}`,
      }));

    return NextResponse.json({
      ok: true,
      days,
      since: since.toISOString(),
      totals: { views: totalViews, unique_visitors: uniqueVisitors },
      topPages,
      topPlaces,
      topEvents,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
