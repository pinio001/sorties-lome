import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

function getEventIdFromPath(req: NextRequest) {
  // /api/events/<id>/interest
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.length - 2];
}

export async function POST(req: NextRequest) {
  const eventId = getEventIdFromPath(req);
  const body = await req.json().catch(() => ({}));
  const deviceId = body?.deviceId;

  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  // Enregistrer l'intérêt (unique event_id + device_id)
  const { error: insErr } = await supabaseAdmin
    .from("event_interests")
    .insert([{ event_id: eventId, device_id: deviceId }]);

  // Déjà liké -> on renvoie OK sans incrémenter
  if (insErr) {
    const msg = (insErr.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Incrémenter compteur
  const { error: rpcErr } = await supabaseAdmin.rpc("inc_interest", { eid: eventId });
  if (rpcErr) {
    // intérêt enregistré, mais compteur pas mis à jour
    return NextResponse.json({ ok: true, warn: rpcErr.message });
  }

  return NextResponse.json({ ok: true, already: false });
}
