import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body manquant" }, { status: 400 });

    const entity_type = String(body.entity_type ?? "");
    const entity_id = String(body.entity_id ?? "");
    const click_type = String(body.click_type ?? "");
    const device_id = body.device_id ? String(body.device_id) : null;

    const utm_source = body.utm_source ? String(body.utm_source) : null;
    const utm_medium = body.utm_medium ? String(body.utm_medium) : null;
    const utm_campaign = body.utm_campaign ? String(body.utm_campaign) : null;

    if (!["place", "event"].includes(entity_type)) {
      return NextResponse.json({ error: "entity_type invalide" }, { status: 400 });
    }
    if (!entity_id) return NextResponse.json({ error: "entity_id manquant" }, { status: 400 });
    if (!["whatsapp", "maps", "website", "instagram", "tiktok"].includes(click_type)) {
      return NextResponse.json({ error: "click_type invalide" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("click_events").insert({
      entity_type,
      entity_id,
      click_type,
      device_id,
      utm_source,
      utm_medium,
      utm_campaign,
    });

    if (error) {
      return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur serveur", detail: e?.message || String(e) }, { status: 500 });
  }
}
