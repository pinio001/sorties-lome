// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

function sinceDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

type ClickRow = {
  entity_type: "place" | "event";
  entity_id: string;
  click_type: "whatsapp" | "maps" | "website" | "instagram" | "tiktok";
  utm_source: string | null;
  created_at: string;
};

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const from30 = sinceDays(30);
    const from7 = sinceDays(7);

    const { data: rows30, error: err30 } = await supabaseAdmin
      .from("click_events")
      .select("entity_type,entity_id,click_type,utm_source,created_at")
      .gte("created_at", from30)
      .limit(50000);

    if (err30) {
      return NextResponse.json(
        { error: "Erreur serveur", detail: err30.message },
        { status: 500 }
      );
    }

    const { data: rows7, error: err7 } = await supabaseAdmin
      .from("click_events")
      .select("entity_type,entity_id,click_type,utm_source,created_at")
      .gte("created_at", from7)
      .limit(50000);

    if (err7) {
      return NextResponse.json(
        { error: "Erreur serveur", detail: err7.message },
        { status: 500 }
      );
    }

    const list30 = (rows30 ?? []) as ClickRow[];
    const list7 = (rows7 ?? []) as ClickRow[];

    const totals30: Record<string, number> = {
      total: 0,
      whatsapp: 0,
      maps: 0,
      website: 0,
      instagram: 0,
      tiktok: 0,
    };

    for (const r of list30) {
      totals30.total += 1;
      totals30[r.click_type] = (totals30[r.click_type] ?? 0) + 1;
    }

    const totals7: Record<string, number> = {
      total: 0,
      whatsapp: 0,
      maps: 0,
      website: 0,
      instagram: 0,
      tiktok: 0,
    };

    for (const r of list7) {
      totals7.total += 1;
      totals7[r.click_type] = (totals7[r.click_type] ?? 0) + 1;
    }

    // Top sources (30j)
    const srcMap = new Map<string, number>();
    for (const r of list30) {
      const s = (r.utm_source ?? "direct").trim() || "direct";
      srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
    }
    const topSources = Array.from(srcMap.entries())
      .map(([utm_source, clicks]) => ({ utm_source, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Top places (WhatsApp & Maps)
    const placeWhats = new Map<string, number>();
    const placeMaps = new Map<string, number>();

    for (const r of list30) {
      if (r.entity_type !== "place") continue;
      if (r.click_type === "whatsapp") {
        placeWhats.set(r.entity_id, (placeWhats.get(r.entity_id) ?? 0) + 1);
      }
      if (r.click_type === "maps") {
        placeMaps.set(r.entity_id, (placeMaps.get(r.entity_id) ?? 0) + 1);
      }
    }

    const topPlaceWhatsappIds = Array.from(placeWhats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topPlaceMapsIds = Array.from(placeMaps.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const allPlaceIds = Array.from(new Set([...topPlaceWhatsappIds, ...topPlaceMapsIds]));

    let placeNameById: Record<string, string> = {};
    if (allPlaceIds.length) {
      const { data: places, error: pErr } = await supabaseAdmin
        .from("places")
        .select("id,name")
        .in("id", allPlaceIds);

      if (!pErr && places) {
        for (const p of places as any[]) {
          placeNameById[p.id] = p.name ?? "Sans nom";
        }
      }
    }

    const topPlacesWhatsapp = Array.from(placeWhats.entries())
      .map(([id, clicks]) => ({ id, name: placeNameById[id] ?? id, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    const topPlacesMaps = Array.from(placeMaps.entries())
      .map(([id, clicks]) => ({ id, name: placeNameById[id] ?? id, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      totals30,
      totals7,
      topSources,
      topPlacesWhatsapp,
      topPlacesMaps,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
