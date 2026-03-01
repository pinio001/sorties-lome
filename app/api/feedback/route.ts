import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

function clean(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body manquant" }, { status: 400 });
    }

    const payload = {
      source: clean(body.source),
      page_path: clean(body.page_path),
      name: clean(body.name),
      phone: clean(body.phone),
      message: clean(body.message),
      rating:
        body.rating === undefined || body.rating === null || body.rating === ""
          ? null
          : Number(body.rating),
    };

    if (!payload.message) {
      return NextResponse.json({ error: "Message manquant" }, { status: 400 });
    }

    if (payload.rating !== null) {
      const r = Number(payload.rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return NextResponse.json({ error: "Rating invalide" }, { status: 400 });
      }
    }

    const { error } = await supabaseAdmin.from("feedback").insert(payload);
    if (error) {
      return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}