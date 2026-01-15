import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type Ctx = { params: Promise<{ id: string }> };

function requireAdmin() {
  return cookies().get("admin_auth")?.value === "1";
}

export async function DELETE(_: Request, { params }: Ctx) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => ({}));

  const allowed = ["title", "date", "time", "location", "image", "whatsapp", "is_featured"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await supabaseAdmin.from("events").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
