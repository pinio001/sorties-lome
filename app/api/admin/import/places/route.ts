// app/api/admin/import/places/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

const ALLOWED = ["Bar/Resto", "Loisirs", "Night Clubs", "Hôtels", "Populaires"] as const;
type AllowedCategory = (typeof ALLOWED)[number];

function normalizeCategory(input: any): AllowedCategory | null {
  if (input === undefined || input === null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  if ((ALLOWED as readonly string[]).includes(raw)) return raw as AllowedCategory;

  const s = raw.toLowerCase();

  if (s.includes("bar") && (s.includes("resto") || s.includes("restaurant"))) return "Bar/Resto";
  if (s.includes("loisir")) return "Loisirs";
  if (s.includes("club")) return "Night Clubs";
  if (s.includes("hotel") || s.includes("hôtel") || s.includes("auberge")) return "Hôtels";
  if (s.includes("pop")) return "Populaires";

  return null;
}

function parseMediaField(v: any): string[] {
  if (!v) return [];
  const parts = String(v)
    .split("|")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  const uniq: string[] = [];
  for (const p of parts) if (!uniq.includes(p)) uniq.push(p);

  return uniq.slice(0, 4);
}

function cleanText(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function cleanWhatsApp(v: any) {
  return cleanText(v);
}

function toBool(v: any) {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === "1") return true;
  const s = String(v ?? "").toLowerCase().trim();
  return ["true", "yes", "oui", "y"].includes(s);
}

function toNumber(v: any, fallback = 0) {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function keyOf(name: string, location: string | null) {
  return `${name.trim().toLowerCase()}||${(location ?? "").trim().toLowerCase()}`;
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : null;

    const rows = Array.isArray(body?.rows) ? body.rows : null;
    if (!rows) {
      return NextResponse.json({ error: "rows manquant" }, { status: 400 });
    }

    // 1) charger l’existant pour skip doublons sans écraser
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("places")
      .select("name,location");

    if (exErr) {
      return NextResponse.json(
        { error: "Erreur serveur", detail: exErr.message },
        { status: 500 }
      );
    }

    const existingKeys = new Set<string>();
    for (const p of existing ?? []) {
      const n = (p as any).name;
      const l = (p as any).location;
      if (typeof n === "string") existingKeys.add(keyOf(n, l ?? null));
    }

    let skipped = 0;
    const errors: Array<{ rowIndex: number; name?: string; error: string }> = [];
    const toInsert: any[] = [];

    rows.forEach((r: any, idx: number) => {
      const name = cleanText(r.name);
      if (!name) {
        skipped++;
        return;
      }

      const location = cleanText(r.location);
      const k = keyOf(name, location);

      if (existingKeys.has(k)) {
        skipped++;
        return;
      }

      const category = normalizeCategory(r.category);
      if (!category) {
        errors.push({ rowIndex: idx, name, error: "Catégorie invalide" });
        return;
      }

      const media_urls = parseMediaField(r.media_urls);
      const image = cleanText(r.image) ?? (media_urls.length ? media_urls[0] : null);

      toInsert.push({
        name,
        category,
        location,
        image,
        whatsapp: cleanWhatsApp(r.whatsapp),
        description: cleanText(r.description),
        is_featured: r.is_featured !== undefined ? toBool(r.is_featured) : false,
        featured_rank: toNumber(r.featured_rank, 0),
        media_urls,
      });

      existingKeys.add(k);
    });

    if (toInsert.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        skipped,
        errors,
        note: "Rien à insérer",
      });
    }

    // 2) insert en batch
    let inserted = 0;
    const CHUNK = 100;

    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin.from("places").insert(slice);

      if (error) {
        return NextResponse.json(
          {
            error: "Erreur serveur",
            detail: error.message,
            insertedSoFar: inserted,
            skipped,
            firstChunkIndex: i,
          },
          { status: 500 }
        );
      }

      inserted += slice.length;
    }

    return NextResponse.json({ ok: true, inserted, skipped, errors });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
