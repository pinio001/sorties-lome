import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { Resend } from "resend";


export async function POST(req: NextRequest) {
		
  const resend = new Resend(process.env.RESEND_API_KEY);
  const ADMIN_EMAIL = "luxe004.0@gmail.com";
  const FROM_EMAIL = "Bingo228 <noreply@bingo228.com>";
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const { source, page_path, name, phone, email, message, rating } = body;

  if (!message?.trim())
    return NextResponse.json({ error: "Message manquant" }, { status: 400 });

  // ── 1. Sauvegarde en base ──────────────────────────────────────────────────
  const { error: dbError } = await supabaseAdmin.from("feedback").insert({
    source: source || "site",
    page_path: page_path || null,
    name: name || null,
    phone: phone || null,
    email: email || null,
    message: message.trim(),
    rating: rating ?? null,
  });

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  // ── 2. Mail à l'admin ─────────────────────────────────────────────────────
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📩 Nouveau message Bingo228 — ${name || "Anonyme"}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="width:40px;height:40px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#000;">B</div>
            <div>
              <div style="font-weight:700;font-size:16px;">Bingo228</div>
              <div style="font-size:12px;color:#888;">Nouveau message reçu</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;width:120px;">Nom</td>
              <td style="padding:10px 0;border-bottom:1px solid #222;">${name || "—"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #222;">${email || "—"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;">Téléphone</td>
              <td style="padding:10px 0;border-bottom:1px solid #222;">${phone || "—"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;">Note</td>
              <td style="padding:10px 0;border-bottom:1px solid #222;">${rating ? "⭐".repeat(rating) + ` (${rating}/5)` : "—"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;">Source</td>
              <td style="padding:10px 0;border-bottom:1px solid #222;">${source || "site"}</td>
            </tr>
          </table>

          <div style="margin-top:20px;background:#1a1a1a;border-radius:12px;padding:16px;">
            <div style="color:#888;font-size:12px;margin-bottom:8px;">MESSAGE</div>
            <p style="margin:0;line-height:1.6;white-space:pre-line;">${message.trim()}</p>
          </div>

          <div style="margin-top:20px;text-align:center;font-size:11px;color:#555;">
            Bingo228 · Lomé · 228
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error("Erreur envoi mail admin:", e);
    // On ne bloque pas la réponse si le mail échoue
  }

  // ── 3. Mail de confirmation à l'utilisateur (si email fourni) ─────────────
  if (email?.trim()) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email.trim(),
        subject: "✅ Votre message a bien été reçu — Bingo228",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:16px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
              <div style="width:40px;height:40px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#000;">B</div>
              <div>
                <div style="font-weight:700;font-size:16px;">Bingo228</div>
                <div style="font-size:12px;color:#888;">Lomé</div>
              </div>
            </div>

            <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">
              Bonjour ${name || ""}${name ? "," : ""}
            </h2>
            <p style="color:#aaa;line-height:1.7;margin-bottom:20px;">
              Nous avons bien reçu votre message et nous vous en remercions.
              Notre équipe vous répondra dans les plus brefs délais.
            </p>

            <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px;">
              <div style="color:#666;font-size:12px;margin-bottom:8px;">VOTRE MESSAGE</div>
              <p style="margin:0;color:#ccc;line-height:1.6;font-style:italic;white-space:pre-line;">"${message.trim()}"</p>
            </div>

            <p style="color:#aaa;line-height:1.7;">
              À bientôt sur <a href="https://bingo228.com" style="color:#fff;font-weight:600;">bingo228.com</a> 🎉
            </p>

            <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />

            <p style="color:#555;font-size:13px;line-height:1.6;">
              Bien cordialement,<br/>
              <strong style="color:#888;">L'équipe Bingo228</strong>
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Erreur envoi mail utilisateur:", e);
    }
  }

  return NextResponse.json({ ok: true });
}