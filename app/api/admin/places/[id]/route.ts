import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

function cleanText(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function toBool(v: any) {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === "1") return true;
  const s = String(v ?? "").toLowerCase().trim();
  return ["true", "yes", "oui", "y"].includes(s);
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
  const parts = String(v).split("|").map((x) => x.trim()).filter(Boolean);
  const uniq: string[] = [];
  for (const p of parts) if (!uniq.includes(p)) uniq.push(p);
  return uniq.slice(0, 4);
}

/* GET */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("places").select("*").eq("id", id).maybeSingle();

    if (error) return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Place introuvable" }, { status: 404 });

    return NextResponse.json({
      place: {
        ...data,
        media_urls:    Array.isArray((data as any).media_urls) ? (data as any).media_urls : [],
        maps_url:      (data as any).maps_url      ?? null,
        website_url:   (data as any).website_url   ?? null,
        instagram_url: (data as any).instagram_url ?? null,
        tiktok_url:    (data as any).tiktok_url    ?? null,
        display_order: (data as any).display_order ?? 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur serveur", detail: e?.message || String(e) }, { status: 500 });
  }
}

/* PATCH */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body manquant" }, { status: 400 });

    const media_urls = parseMedia(body.media_urls);
    const image = cleanText(body.image) ?? (media_urls.length ? media_urls[0] : null);

    const payload: any = {
      name:          cleanText(body.name),
      category:      cleanText(body.category),
      location:      cleanText(body.location),
      whatsapp:      cleanText(body.whatsapp),
      description:   cleanText(body.description),
      is_featured:   body.is_featured !== undefined ? toBool(body.is_featured) : undefined,
      featured_rank: body.featured_rank === undefined || body.featured_rank === null || body.featured_rank === ""
                       ? undefined : Number(body.featured_rank) || 0,
      display_order: body.display_order === undefined || body.display_order === null || body.display_order === ""
                       ? 0 : Number(body.display_order) || 0,  // ← ajout
      image,
      media_urls,
      maps_url:      cleanText(body.maps_url),
      website_url:   cleanText(body.website_url),
      instagram_url: cleanText(body.instagram_url),
      tiktok_url:    cleanText(body.tiktok_url),
    };

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { error } = await supabaseAdmin.from("places").update(payload).eq("id", id);
    if (error)
      return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur serveur", detail: e?.message || String(e) }, { status: 500 });
  }
}

/* DELETE */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const { error } = await supabaseAdmin.from("places").delete().eq("id", id);
    if (error)
      return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur serveur", detail: e?.message || String(e) }, { status: 500 });
  }
}