import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

function getPlaceId(req: NextRequest) {
  // /api/places/<id>/interest
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.length - 2];
}

export async function POST(req: NextRequest) {
  try {
    const placeId = getPlaceId(req);
    const body = await req.json().catch(() => ({}));
    const deviceId = body?.deviceId;

    if (!placeId) {
      return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
    }
    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }

    const { error: insErr } = await supabaseAdmin
      .from("place_interests")
      .insert([{ place_id: placeId, device_id: deviceId }]);

    if (insErr) {
      const msg = (insErr.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return NextResponse.json({ ok: true, already: true });
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const { error: rpcErr } = await supabaseAdmin.rpc("inc_place_interest", {
      pid: placeId,
    });

    if (rpcErr) {
      return NextResponse.json({ ok: true, warn: rpcErr.message });
    }

    return NextResponse.json({ ok: true, already: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Impossible" }, { status: 500 });
  }
}
