import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

/* =========================
   AUTH ADMIN
========================= */
async function requireAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_auth")?.value === "1";
}

/* =========================
   GET PLACE
========================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID manquant" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("places")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Place introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    place: {
      ...data,
      media_urls: Array.isArray(data.media_urls) ? data.media_urls : [],
    },
  });
}

/* =========================
   UPDATE PLACE
========================= */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID manquant" },
      { status: 400 }
    );
  }

  const body = await req.json();

  const { error } = await supabaseAdmin
    .from("places")
    .update({
      name: body.name,
      category: body.category,
      location: body.location,
      image: body.image,
      whatsapp: body.whatsapp,
      description: body.description,
      is_featured: body.is_featured,
      featured_rank: body.featured_rank,
      media_urls: Array.isArray(body.media_urls)
        ? body.media_urls
        : undefined,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
