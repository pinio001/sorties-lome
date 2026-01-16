import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

// Vérifie le cookie admin directement depuis la requête
function requireAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "1";
}

// Récupère l'id depuis l'URL (/api/admin/events/<id>)
function getIdFromPath(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.length - 1];
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getIdFromPath(req);

  const { error } = await supabaseAdmin
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getIdFromPath(req);

  const body = await req.json().catch(() => ({}));

  const allowed = [
  "title",
  "location",
  "image",
  "whatsapp",
  "is_featured",
  "featured_rank",
  "event_date",
  "event_time",
  "description",
];


  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
