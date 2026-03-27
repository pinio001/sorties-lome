import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const IMPORT_SECRET = process.env.IMPORT_SECRET_KEY ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "https://claude.ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-import-key",
};

// Preflight OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function requireAdmin(req: NextRequest) {
  const headerKey = req.headers.get("x-import-key");
  if (IMPORT_SECRET && headerKey === IMPORT_SECRET) return true;
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.data)
    return NextResponse.json({ error: "Body invalide" }, { status: 400, headers: CORS });

  const table = body.type === "place" ? "places" : "events";

  const { error } = await supabaseAdmin.from(table).insert(body.data);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
