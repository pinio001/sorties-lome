// app/api/feedback-site/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rating  = Number(body?.rating);
    const comment = body?.comment ?? null;

    if (!rating || rating < 1 || rating > 5)
      return NextResponse.json({ error: "Note invalide" }, { status: 400 });

    // Récupérer le path de la page depuis le referer
    const referer = req.headers.get("referer") ?? "";
    let page = "/";
    try { page = new URL(referer).pathname; } catch (_) {}

    const { error } = await supabaseAdmin
      .from("site_feedback")
      .insert({ rating, comment, page });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[feedback-site]", err);
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: 500 });
  }
}