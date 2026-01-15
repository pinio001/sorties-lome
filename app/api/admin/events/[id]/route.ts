import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

function requireAdmin() {
  return cookies().get("admin_auth")?.value === "1";
}

function getIdFromPath(req: NextRequest) {
  // /api/admin/events/<id>
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.length - 1]; // dernier segment
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getIdFromPath(req);

  const { error } = await supabaseAdmin.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getIdFromPath(req);

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
