import { useState, useRef, useCallback } from "react";

const FIELDS = [
  { key: "title", label: "Titre", type: "text" },
  { key: "location", label: "Lieu", type: "text" },
  { key: "event_date", label: "Date", type: "date", half: true },
  { key: "event_time", label: "Heure", type: "text", placeholder: "22:00", half: true },
  { key: "whatsapp", label: "WhatsApp / Contact", type: "text", placeholder: "+22890000000" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "image", label: "Image URL (optionnel)", type: "text", placeholder: "https://..." },
];

const SYSTEM = `Tu es un assistant spécialisé dans l'extraction d'informations d'événements à partir de flyers ou stories Instagram/TikTok.
Analyse l'image et retourne UNIQUEMENT un objet JSON valide (sans markdown, sans backticks) avec ces champs :
{"title":"nom de l'événement","location":"nom du lieu","event_date":"YYYY-MM-DD ou vide","event_time":"HH:MM ou vide","whatsapp":"numéro ou compte social","description":"1-3 phrases","image":""}
Si une info est absente mets "". Ne renvoie rien d'autre que le JSON brut.`;

const empty = () => ({ title:"", location:"", event_date:"", event_time:"", whatsapp:"", description:"", image:"" });

// Compress via canvas using dataURL as src (works in sandboxed iframes)
function compressViaCanvas(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 700;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.70);
      const b64 = compressed.split(",")[1];
      const kb = Math.round(b64.length * 0.75 / 1024);
      resolve({ b64, kb });
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl; // use dataURL directly, not blob URL
  });
}

export default function EventExtractor() {
  const [img, setImg] = useState(null); // preview src (dataURL)
  const [b64, setB64] = useState(null);
  const [origKb, setOrigKb] = useState(null);
  const [compKb, setCompKb] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [fields, setFields] = useState(empty());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [showCfg, setShowCfg] = useState(false);
  const [apiUrl, setApiUrl] = useState("https://bingo228.com/api/admin/import");
  const [apiKey, setApiKey] = useState("");
  const [drag, setDrag] = useState(false);
  const [payload, setPayload] = useState(null);
  const fileRef = useRef();

  const loadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setFields(empty()); setStatus(null); setPayload(null); setB64(null); setCompKb(null);
    setOrigKb(Math.round(file.size / 1024));
    setCompressing(true);

    // Read as dataURL first
    const dataUrl = await new Promise((res) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.readAsDataURL(file);
    });

    setImg(dataUrl); // show preview immediately

    try {
      const { b64: compressed, kb } = await compressViaCanvas(dataUrl);
      setB64(compressed);
      setCompKb(kb);
    } catch {
      // fallback: use original if canvas fails
      const b64raw = dataUrl.split(",")[1];
      setB64(b64raw);
      setCompKb(Math.round(file.size / 1024));
    }
    setCompressing(false);
  }, []);

  const buildPayload = (f) => {
    const d = { ...f };
    if (d.event_time && d.event_time.split(":").length === 2) d.event_time += ":00";
    if (d.image) d.media_urls = [d.image];
    d.is_featured = false; d.display_order = 0;
    return { type: "event", data: d };
  };

  const extract = async () => {
    if (!b64) return;
    setLoading(true); setStatus(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: SYSTEM,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
            { type: "text", text: "Extrais les informations de cet événement." }
          ]}]
        })
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").trim().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      const next = { ...empty(), ...parsed };
      setFields(next); setPayload(buildPayload(next));
      setStatus({ ok: true, msg: "Infos extraites — vérifie et corrige si besoin" });
    } catch (e) {
      setStatus({ ok: false, msg: "Erreur : " + e.message });
    }
    setLoading(false);
  };

  const send = async () => {
    if (!apiUrl) return;
    setSending(true); setStatus(null);
    try {
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["x-import-key"] = apiKey;
      const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(buildPayload(fields)) });
      if (!res.ok) { const t = await res.text(); throw new Error("HTTP " + res.status + " — " + t.slice(0, 100)); }
      setStatus({ ok: true, msg: "Événement créé sur Bingo228 !" });
    } catch (e) {
      setStatus({ ok: false, msg: "Erreur envoi : " + e.message });
    }
    setSending(false);
  };

  const reset = () => {
    setImg(null); setB64(null); setOrigKb(null); setCompKb(null);
    setFields(empty()); setStatus(null); setPayload(null); setCompressing(false);
  };

  const hasFields = Object.values(fields).some(v => v);
  const ready = b64 && !compressing;

  const inp = { width:"100%", padding:"8px 10px", fontSize:13, fontFamily:"inherit", border:"0.5px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-primary)", color:"var(--color-text-primary)", outline:"none", boxSizing:"border-box" };
  const btnStyle = (extra={}) => ({ padding:"9px 16px", fontSize:13, fontFamily:"inherit", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, background:"transparent", color:"var(--color-text-primary)", width:"100%", ...extra });

  const renderField = (f) => (
    <div key={f.key}>
      <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:3 }}>{f.label}</label>
      {f.type === "textarea"
        ? <textarea rows={3} value={fields[f.key]} onChange={e => setFields(p => ({...p, [f.key]: e.target.value}))} style={{...inp, resize:"vertical", lineHeight:1.5}} />
        : <input type={f.type} value={fields[f.key]} placeholder={f.placeholder||""} onChange={e => setFields(p => ({...p, [f.key]: e.target.value}))} style={inp} />
      }
    </div>
  );

  return (
    <div style={{ fontFamily:"var(--font-sans, system-ui)", maxWidth:740, margin:"0 auto", padding:"1.5rem 0" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:500, margin:0 }}>Extraction d'événement</h2>
          <p style={{ fontSize:13, color:"var(--color-text-secondary)", marginTop:2 }}>Flyer Instagram / TikTok → Bingo228</p>
        </div>
        <button onClick={() => setShowCfg(v=>!v)} style={btnStyle({ width:"auto" })}>{showCfg ? "Fermer" : "Config API"}</button>
      </div>

      {showCfg && (
        <div style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.25rem" }}>
          <p style={{ fontSize:13, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:10 }}>Configuration endpoint Bingo228</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:3}}>URL endpoint</label><input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:3}}>Clé secrète (x-import-key)</label><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="IMPORT_SECRET_KEY" style={inp}/></div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div
            onClick={() => !img && fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }}
            style={{ border: drag ? "1.5px solid var(--color-border-primary)" : "0.5px dashed var(--color-border-secondary)", borderRadius:12, cursor: img ? "default" : "pointer", minHeight: img ? "auto" : 180, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", background: drag ? "var(--color-background-secondary)" : "transparent" }}
          >
            {img
              ? <img src={img} alt="flyer" style={{ width:"100%", display:"block", borderRadius:12 }} />
              : <div style={{ textAlign:"center", padding:"2rem 1rem" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" style={{ margin:"0 auto 8px", display:"block" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                  </svg>
                  <p style={{ fontSize:13, color:"var(--color-text-secondary)", margin:0 }}>Glisse une image ou clique</p>
                </div>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])} />

          {origKb && (
            <p style={{ fontSize:11, color:"var(--color-text-secondary)", margin:0, textAlign:"center" }}>
              {compressing
                ? `Compression en cours...`
                : `${origKb} KB → ${compKb} KB envoyés`}
            </p>
          )}

          {img && (
            <button onClick={extract} disabled={loading || !ready} style={btnStyle({ fontWeight:500, opacity:(loading||!ready)?0.6:1 })}>
              {loading ? "Extraction en cours..." : compressing ? "Compression..." : "Extraire les infos"}
            </button>
          )}
          {img && (
            <button onClick={reset} style={btnStyle({ fontSize:12 })}>Nouvelle image</button>
          )}

          {payload && (
            <div style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:10, fontSize:11, fontFamily:"var(--font-mono, monospace)", color:"var(--color-text-secondary)", wordBreak:"break-all", whiteSpace:"pre-wrap", maxHeight:160, overflow:"auto", border:"0.5px solid var(--color-border-tertiary)" }}>
              {JSON.stringify(payload, null, 2)}
            </div>
          )}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {renderField(FIELDS[0])}
          {renderField(FIELDS[1])}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {renderField(FIELDS[2])}
            {renderField(FIELDS[3])}
          </div>
          {renderField(FIELDS[4])}
          {renderField(FIELDS[5])}
          {renderField(FIELDS[6])}

          {hasFields && (
            <button onClick={send} disabled={sending} style={btnStyle({ fontWeight:500, background:"var(--color-background-info)", color:"var(--color-text-info)", borderColor:"var(--color-border-info)", opacity:sending?0.6:1 })}>
              {sending ? "Envoi..." : "Envoyer à Bingo228 (draft)"}
            </button>
          )}

          {status && (
            <div style={{ padding:"10px 14px", borderRadius:8, fontSize:13, background:status.ok?"var(--color-background-success)":"var(--color-background-danger)", color:status.ok?"var(--color-text-success)":"var(--color-text-danger)", border:`0.5px solid ${status.ok?"var(--color-border-success)":"var(--color-border-danger)"}` }}>
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}