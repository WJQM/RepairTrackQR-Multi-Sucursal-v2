"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => setMounted(true), []);
  useEffect(() => { fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {}); }, []);

  const SECRET_CODE = "RTQR-2026";

  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) { setImageUrl(data.url); setImagePreview(URL.createObjectURL(file)); }
    } catch {}
    setUploading(false);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === SECRET_CODE) { setUnlocked(true); setError(""); }
    else { setError("Código de acceso incorrecto"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    if (mode === "register") {
      try {
        const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role: "superadmin", phone: phone || null, image: imageUrl || null }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error al registrar"); setLoading(false); return; }
        setSuccess("✅ Super Admin creado. Ahora inicia sesión.");
        setMode("login"); setName(""); setPhone("");
      } catch { setError("Error de conexión"); }
    } else {
      try {
        const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "x-from": "setup" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error al iniciar sesión"); setLoading(false); return; }
        if (data.user.role !== "superadmin") { setError("Esta página es solo para Super Admins."); setLoading(false); return; }
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        try {
          const bRes = await fetch("/api/branches", { headers: { "Authorization": `Bearer ${data.token}` } });
          const branches = await bRes.json();
          if (branches.length > 0) sessionStorage.setItem("activeBranchId", branches[0].id);
        } catch {}
        router.push("/dashboard");
      } catch { setError("Error de conexión"); }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0a1628 0%, #0f2040 40%, #0a1a30 70%, #071220 100%)" }}>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,15px) scale(0.95)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,20px) scale(0.95)} 66%{transform:translate(20px,-15px) scale(1.05)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,-25px)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(32px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .s-input {
          width:100%; padding:13px 16px;
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:12px; color:#ffffff;
          font-size:14px; outline:none;
          transition:all 0.25s;
          font-family:inherit;
        }
        .s-input:focus { border-color:#1ab8c4; background:rgba(26,184,196,0.08); box-shadow:0 0 0 3px rgba(26,184,196,0.15); }
        .s-input::placeholder { color:rgba(255,255,255,0.25); }
      `}</style>

      {/* Animated background orbs */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        {/* Grid pattern */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(26,184,196,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,184,196,0.04) 1px,transparent 1px)", backgroundSize:"50px 50px" }} />
        {/* Orbs */}
        <div style={{ position:"absolute", top:"10%", left:"15%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(26,184,196,0.15),transparent 70%)", animation:"float1 12s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"10%", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)", animation:"float2 15s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"50%", right:"25%", width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(26,184,196,0.08),transparent 70%)", animation:"float3 10s ease-in-out infinite" }} />
        {/* Dots */}
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ position:"absolute", width:3, height:3, borderRadius:"50%", background:`rgba(26,184,196,${0.2+i*0.08})`, top:`${15+i*14}%`, left:`${5+i*17}%`, animation:`float${(i%3)+1} ${8+i*2}s ease-in-out infinite ${i*0.8}s` }} />
        ))}
      </div>

      {/* Glass card */}
      <div style={{
        maxWidth: 440, width: "92%", position:"relative", zIndex:1,
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(26,184,196,0.08), inset 0 1px 0 rgba(255,255,255,0.1)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)",
        transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
      }}>
        {/* Top glow line */}
        <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(26,184,196,0.8),rgba(99,102,241,0.5),transparent)" }} />

        <div style={{ padding:"36px 32px 32px" }}>
          {/* Logo + title */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ width:72, height:72, borderRadius:20, margin:"0 auto 18px", background:"linear-gradient(135deg,rgba(26,184,196,0.2),rgba(26,184,196,0.08))", border:"1.5px solid rgba(26,184,196,0.35)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 40px rgba(26,184,196,0.2), 0 8px 24px rgba(0,0,0,0.3)" }}>
              {settings.logo
                ? <img src={settings.logo} alt="" style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:20 }} />
                : <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1ab8c4" strokeWidth="2" strokeLinecap="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
              }
            </div>
            <h1 style={{ fontSize:26, fontWeight:800, color:"#ffffff", letterSpacing:"-0.5px", marginBottom:6 }}>{settings.companyName}</h1>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:99, background:"rgba(26,184,196,0.10)", border:"1px solid rgba(26,184,196,0.25)" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#1ab8c4", boxShadow:"0 0 6px #1ab8c4" }} />
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(26,184,196,0.9)", letterSpacing:"1.5px", textTransform:"uppercase" }}>Panel Super Admin</span>
            </div>
          </div>

          {!unlocked ? (
            <form onSubmit={handleUnlock} style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {error && (
                <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, color:"#fca5a5", fontSize:13 }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"rgba(26,184,196,0.85)", marginBottom:8, display:"flex", alignItems:"center", gap:6, letterSpacing:"0.5px", textTransform:"uppercase" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Código de Acceso
                </label>
                <input className="s-input" type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Ingresa el código secreto" required />
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.30)", marginTop:7 }}>Contacta al desarrollador si no tienes el código</p>
              </div>
              <button type="submit" style={{ padding:"14px", border:"none", borderRadius:14, fontWeight:700, fontSize:14, cursor:"pointer", background:"linear-gradient(135deg,#149aa5,#1ab8c4,#2dd4df)", color:"#fff", boxShadow:"0 4px 24px rgba(26,184,196,0.35), 0 1px 0 rgba(255,255,255,0.1) inset", letterSpacing:"0.3px" }}>
                Desbloquear
              </button>
              <div style={{ textAlign:"center" }}>
                <button onClick={() => router.push("/")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer", transition:"color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(26,184,196,0.8)") as any}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)") as any}>
                  ← Volver al login normal
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tab toggle */}
              <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:14, padding:4, marginBottom:24, border:"1px solid rgba(255,255,255,0.10)" }}>
                {["Iniciar Sesión","Registrar Super Admin"].map((label,i) => {
                  const active = i===0 ? mode==="login" : mode==="register";
                  return (
                    <button key={i} onClick={() => { setMode(i===0?"login":"register"); setError(""); setSuccess(""); }} style={{ flex:1, padding:"11px 8px", borderRadius:11, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.25s", background:active?"linear-gradient(135deg,rgba(26,184,196,0.20),rgba(26,184,196,0.10))":"transparent", color:active?"#2dd4df":"rgba(255,255,255,0.40)", boxShadow:active?"0 0 20px rgba(26,184,196,0.1)":"none" }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {error && <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, color:"#fca5a5", fontSize:13 }}>{error}</div>}
                {success && <div style={{ padding:"12px 16px", background:"rgba(16,185,129,0.10)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:12, color:"#6ee7b7", fontSize:13 }}>{success}</div>}

                {mode==="register" && (
                  <>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.50)", marginBottom:6, display:"block" }}>Nombre completo</label>
                      <input className="s-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" required />
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.50)", marginBottom:6, display:"block" }}>Teléfono (opcional)</label>
                      <input className="s-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="71234567" />
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.50)", marginBottom:6, display:"block" }}>Foto de perfil (opcional)</label>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:52, height:52, borderRadius:14, background:imagePreview?"transparent":"rgba(26,184,196,0.08)", border:"1.5px dashed rgba(26,184,196,0.3)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                          {imagePreview ? <img src={imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(26,184,196,0.5)" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                        </div>
                        <label style={{ padding:"8px 14px", background:"rgba(26,184,196,0.10)", border:"1px solid rgba(26,184,196,0.25)", borderRadius:10, color:"#2dd4df", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                          {uploading?"Subiendo...":imagePreview?"Cambiar foto":"Subir foto"}
                          <input type="file" accept="image/*" onChange={e=>{if(e.target.files?.[0])handleImageUpload(e.target.files[0]);}} style={{ display:"none" }} />
                        </label>
                        {imagePreview && <button type="button" onClick={()=>{setImageUrl("");setImagePreview("");}} style={{ background:"none", border:"none", color:"#fca5a5", fontSize:11, cursor:"pointer" }}>✕</button>}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.50)", marginBottom:6, display:"block" }}>Correo electrónico</label>
                  <input className="s-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.50)", marginBottom:6, display:"block" }}>Contraseña</label>
                  <input className="s-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
                </div>

                <button type="submit" disabled={loading} style={{ padding:"14px", border:"none", borderRadius:14, fontWeight:700, fontSize:14, cursor:loading?"wait":"pointer", background:"linear-gradient(135deg,#149aa5,#1ab8c4,#2dd4df)", color:"#fff", boxShadow:"0 4px 24px rgba(26,184,196,0.35)", opacity:loading?0.75:1, letterSpacing:"0.3px" }}>
                  {loading ? (
                    <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite", display:"inline-block" }} />
                      Procesando...
                    </span>
                  ) : mode==="register" ? "Crear Super Admin" : "Iniciar Sesión"}
                </button>
              </form>

              <div style={{ textAlign:"center", marginTop:16 }}>
                <button onClick={() => router.push("/")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="rgba(26,184,196,0.8)") as any}
                  onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.35)") as any}>
                  ← Volver al login normal
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom glow line */}
        <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(26,184,196,0.3),transparent)" }} />
      </div>
    </div>
  );
}
