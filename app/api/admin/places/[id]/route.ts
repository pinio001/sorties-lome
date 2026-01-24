// app/api/admin/places/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

/* =========================
   AUTH ADMIN
========================= */
async function requireAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_auth")?.value === "1";
}

/* =========================
   CATEGORY NORMALIZATION
========================= */
const ALLOWED = ["Bar/Resto", "Loisirs", "Night Clubs", "Hôtels", "Populaires"] as const;

function normalizeCategory(input: any): (typeof ALLOWED)[number] | null {
  if (input === undefined || input === null) return null;

  const raw = String(input).trim();
  if (!raw) return null;

  // Already valid
  if ((ALLOWED as readonly string[]).includes(raw)) return raw as any;

  const s = raw.toLowerCase();

  // Bar/Resto variants
  if (
    s === "bar/resto" ||
    s === "bar / resto" ||
    s === "bar resto" ||
    s === "bar_resto" ||
    s.includes("bar") && s.includes("resto")
  ) {
    return "Bar/Resto";
  }

  // Loisirs variants
  if (s === "loisirs" || s === "loisir") return "Loisirs";

  // Night Clubs variants
  if (
    s === "night clubs" ||
    s === "night club" ||
    s === "nightclubs" ||
    s === "night_clubs" ||
    s === "club" ||
    s === "clubs" ||
    s === "clubbing"
  ) {
    return "Night Clubs";
  }

  // Hôtels variants
  if (
    s === "hôtels" ||
    s === "hotels" ||
    s === "hotel" ||
    s === "hôtel" ||
    s === "hôtel / auberge" ||
    s === "hotel / auberge" ||
    s === "hôtel/auberge" ||
    s === "hotel/auberge" ||
    s === "auberge"
  ) {
    return "Hôtels";
  }

  // Populaires variants
  if (s === "populaires" || s === "populaire" || s === "popular" || s === "populars") {
    return "Populaires";
  }

  return null;
}

function safeJson(resText: string) {
  try {
    return resText ? JSON.parse(resText) : {};
  } catch {
    return {};
  }
}

/* =========================
   GET PLACE
========================= */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("places")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Place introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    place: {
      ...data,
      media_urls: Array.isArray((data as any).media_urls) ? (data as any).media_urls : [],
    },
  });
}

/* =========================
   UPDATE PLACE
========================= */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  const bodyText = await req.text();
  const body = safeJson(bodyText);

  // Build update object safely (do not overwrite unintentionally)
  const update: any = {};

  if (body.name !== undefined) update.name = body.name;
  if (body.location !== undefined) update.location = body.location ?? null;
  if (body.image !== undefined) update.image = body.image ?? null;
  if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp ?? null;
  if (body.description !== undefined) update.description = body.description ?? null;

  if (body.is_featured !== undefined) update.is_featured = !!body.is_featured;
  if (body.featured_rank !== undefined) update.featured_rank = body.featured_rank ?? null;

  if (body.media_urls !== undefined) {
    update.media_urls = Array.isArray(body.media_urls)
      ? body.media_urls.filter((x: any) => typeof x === "string" && x.trim().length > 0).slice(0, 4)
      : [];
  }

  // Category: only update if provided
  if (body.category !== undefined) {
    const normalized = normalizeCategory(body.category);
    if (!normalized) {
      return NextResponse.json(
        { error: `Catégorie invalide. Valeurs autorisées: ${ALLOWED.join(", ")}` },
        { status: 400 }
      );
    }
    update.category = normalized;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin
    .from("places")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/* =========================
   DELETE PLACE
========================= */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("places").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
