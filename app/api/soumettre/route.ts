import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.data)
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const table = body.type === "place" ? "pending_places" : "pending_events";
  const { error } = await supabaseAdmin.from(table).insert({ ...body.data, status: "pending" });

  if (error) {
    console.error("Supabase error:", error); // ← ajoute ça
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}