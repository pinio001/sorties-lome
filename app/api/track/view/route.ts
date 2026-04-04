// app/api/track/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const path =
      typeof body.path === "string" && body.path.trim() ? body.path.trim() : null;
    const device_id =
      typeof body.device_id === "string" && body.device_id.trim()
        ? body.device_id.trim()
        : null;

    if (!path || !device_id) {
      return NextResponse.json(
        { error: "Missing path/device_id" },
        { status: 400 }
      );
    }

    // Pays via header Vercel (disponible en production uniquement)
    const country  = req.headers.get("x-vercel-ip-country")      ?? null;
    const city     = req.headers.get("x-vercel-ip-city")         ?? null;

    const payload = {
      path,
      referrer:     typeof body.referrer     === "string" ? body.referrer     : null,
      device_id,
      entity_type:  typeof body.entity_type  === "string" ? body.entity_type  : null,
      entity_id:    typeof body.entity_id    === "string" ? body.entity_id    : null,
      utm_source:   typeof body.utm_source   === "string" ? body.utm_source   : null,
      utm_medium:   typeof body.utm_medium   === "string" ? body.utm_medium   : null,
      utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
      country,
      city,
    };

    const { error } = await supabaseAdmin.from("page_views").insert(payload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}