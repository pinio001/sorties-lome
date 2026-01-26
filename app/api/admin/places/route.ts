import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

function toBool(v: any) {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === "1") return true;
  const s = String(v ?? "").toLowerCase().trim();
  return ["true", "yes", "oui", "y"].includes(s);
}

function cleanText(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function parseMedia(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    const uniq: string[] = [];
    for (const x of v) {
      if (typeof x === "string") {
        const t = x.trim();
        if (t && !uniq.includes(t)) uniq.push(t);
      }
    }
    return uniq.slice(0, 4);
  }
  const parts = String(v)
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

  const uniq: string[] = [];
  for (const p of parts) if (!uniq.includes(p)) uniq.push(p);
  return uniq.slice(0, 4);
}

/* =========================
   GET LIST (pour /admin/places/manage)
========================= */
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("places")
      .select(
        "id,name,category,location,image,media_urls,whatsapp,description,is_featured,featured_rank,interest_count,maps_url,website_url,instagram_url,tiktok_url,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erreur serveur", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      places: (data ?? []).map((p: any) => ({
        ...p,
        media_urls: Array.isArray(p.media_urls) ? p.media_urls : [],
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE PLACE (POST)
========================= */
export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body manquant" }, { status: 400 });

    const media_urls = parseMedia(body.media_urls);
    const image = cleanText(body.image) ?? (media_urls.length ? media_urls[0] : null);

    const payload: any = {
      name: cleanText(body.name),
      category: cleanText(body.category),
      location: cleanText(body.location),
      whatsapp: cleanText(body.whatsapp),
      description: cleanText(body.description),
      is_featured: body.is_featured !== undefined ? toBool(body.is_featured) : false,
      featured_rank:
        body.featured_rank === undefined || body.featured_rank === null || body.featured_rank === ""
          ? 0
          : Number(body.featured_rank) || 0,
      image,
      media_urls,

      // ✅ nouveaux champs
      maps_url: cleanText(body.maps_url),
      website_url: cleanText(body.website_url),
      instagram_url: cleanText(body.instagram_url),
      tiktok_url: cleanText(body.tiktok_url),
    };

    if (!payload.name) {
      return NextResponse.json({ error: "Nom manquant" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("places").insert(payload);
    if (error) {
      return NextResponse.json(
        { error: "Erreur serveur", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
