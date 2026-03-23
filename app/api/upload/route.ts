// app/api/upload/route.ts
// Upload une image vers Bunny.net Storage et retourne l'URL CDN
import { NextRequest, NextResponse } from "next/server";

const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const STORAGE_ZONE    = process.env.BUNNY_STORAGE_ZONE!;
const CDN_URL         = process.env.BUNNY_CDN_URL!; // ex: https://bingo228.b-cdn.net
const STORAGE_HOST    = "storage.bunnycdn.com";

// Extensions autorisées
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB   = 5;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const folder   = (formData.get("folder") as string) || "misc";

    if (!file) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

    // Vérifications
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Format non supporté. Utilisez JPG, PNG ou WebP." }, { status: 400 });

    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return NextResponse.json({ error: `Fichier trop lourd (max ${MAX_SIZE_MB}MB)` }, { status: 400 });

    // Générer un nom de fichier unique
    const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path     = `${folder}/${safeName}`;

    // Upload vers Bunny Storage
    const buffer = await file.arrayBuffer();
    const bunnyRes = await fetch(
      `https://${STORAGE_HOST}/${STORAGE_ZONE}/${path}`,
      {
        method: "PUT",
        headers: {
          AccessKey: STORAGE_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      }
    );

    if (!bunnyRes.ok) {
      const errText = await bunnyRes.text();
      console.error("[upload] Bunny error:", bunnyRes.status, errText);
      return NextResponse.json({ error: "Erreur Bunny.net" }, { status: 500 });
    }

    // Retourner l'URL CDN publique
    const cdnUrl = `${CDN_URL}/${path}`;
    return NextResponse.json({ ok: true, url: cdnUrl });

  } catch (err: any) {
    console.error("[upload]", err);
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: 500 });
  }
}