"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("tech");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null });

  const refreshSettings = () => { fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, slogan: d.slogan, logo: d.logo }).catch(() => {}); }).catch(() => {}); };

  useEffect(() => {
    setMounted(true);
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");
    if (token && userData) {
      try {
        const parsed = (() => { try { return JSON.parse(userData); } catch { return null; } })();
        setTimeout(() => router.push(parsed.role === "tech" ? "/asignaciones" : "/dashboard"), 10);
        return;
      } catch {}
    }
    fetch("/api/branches", { headers: { "Content-Type": "application/json" } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setBranches(d); })
      .catch(() => {});
    refreshSettings();
  }, []);

  useEffect(() => { const interval = setInterval(refreshSettings, 30000); return () => clearInterval(interval); }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!branchId) { setError("Selecciona una sucursal"); setLoading(false); return; }
        const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role, phone: phone || null, branchId, image: imageUrl || null }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error al registrar"); setLoading(false); return; }
        setIsRegister(false); setError(""); alert("¡Cuenta creada! Tu solicitud está pendiente de aprobación.");
      } else {
        const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error en la solicitud"); setLoading(false); return; }
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        if (data.user.role === "superadmin") {
          try {
            const bRes = await fetch("/api/branches", { headers: { "Authorization": `Bearer ${data.token}` } });
            const b = await bRes.json();
            if (b.length > 0) sessionStorage.setItem("activeBranchId", b[0].id);
          } catch {}
          setTimeout(() => router.push("/dashboard"), 10);
        } else if (data.user.role === "tech") {
          setTimeout(() => router.push("/asignaciones"), 10);
        } else {
          setTimeout(() => router.push("/dashboard"), 10);
        }
      }
    } catch { setError("Error de conexión al servidor"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #e8f4f8 0%, #f0f3f8 50%, #e8ecf4 100%)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .l-input { width:100%; padding:13px 16px; background:#f5f7fc; border:1px solid #dde3f0; border-radius:11px; color:#1a1d2e; font-size:14px; outline:none; transition:all 0.2s; font-family:inherit; }
        .l-input:focus { border-color:#1ab8c4; box-shadow:0 0 0 3px rgba(212,168,67,0.1); }
        .l-input::placeholder { color:#9298ae; }
        .l-input option { background:#ffffff; }
      `}</style>

      {/* Background decorations */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "linear-gradient(rgba(212,168,67,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.6) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,184,196,0.05), transparent 70%)", animation: "pulse 7s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "10%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.04), transparent 70%)", animation: "pulse 9s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "40%", right: "8%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,184,196,0.04), transparent 70%)", animation: "pulse 8s ease-in-out infinite 1s" }} />
        {/* Floating dots */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{ position: "absolute", width: 4+i*1.5, height: 4+i*1.5, borderRadius: "50%", background: `rgba(26,184,196,${0.15+i*0.05})`, top: `${20+i*18}%`, left: `${8+i*22}%`, animation: `float ${5+i}s ease-in-out infinite ${i*0.7}s` }} />
        ))}
      </div>

      {/* Card */}
      <div style={{
        maxWidth: 440, width: "92%", padding: "36px 30px",
        position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.98)",
        borderRadius: 14,
        border: "1px solid rgba(226,229,238,0.9)",
        boxShadow: "0 30px 80px rgba(26,29,46,0.40), 0 0 0 1px rgba(26,184,196,0.04)",
        backdropFilter: "blur(20px)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(24px)",
        transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.5), transparent)", borderRadius: 1 }} />

        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            onClick={() => { const n = tapCount+1; if (n>=5){router.push("/setup");return;} setTapCount(n); setTimeout(()=>setTapCount(0),2000); }}
            style={{ width: 68, height: 68, borderRadius: 12, margin: "0 auto 16px", cursor: "pointer", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              ...(settings.logo ? {} : { background: "linear-gradient(135deg,#149aa5,#1ab8c4,#149aa5)", backgroundSize: "200% 200%", animation: "gradientShift 5s ease-in-out infinite", boxShadow: "0 8px 32px rgba(26,184,196,0.14), 0 0 0 1px rgba(26,184,196,0.10)" })
            }}>
            {settings.logo
              ? <img src={settings.logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.97)" strokeWidth="2.2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            }
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#1a1d2e", marginBottom: 6 }}>{settings.companyName}</h1>
          <p style={{ color: "#9298ae", fontSize: 13, letterSpacing: "0.3px" }}>{settings.slogan}</p>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", background: "rgba(248,249,251,0.9)", borderRadius: 12, padding: 3, marginBottom: 28, border: "1px solid rgba(226,229,238,0.8)" }}>
          {["Iniciar Sesión","Registrarse"].map((label,i) => {
            const active = i===0 ? !isRegister : isRegister;
            return (
              <button key={i} onClick={() => { setIsRegister(i===1); setError(""); }} style={{
                flex:1, padding:"11px", borderRadius:9, border:"none", fontSize:13, fontWeight:600, cursor:"pointer",
                background: active ? "linear-gradient(135deg,#149aa5,#1ab8c4)" : "transparent",
                color: active ? "#f8f9fb" : "#9298ae",
                boxShadow: active ? "0 3px 12px rgba(26,184,196,0.14)" : "none",
                transition: "all 0.25s",
              }}>{label}</button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:"12px 14px", background:"rgba(244,63,94,0.06)", border:"1px solid rgba(244,63,94,0.15)", borderRadius:10, color:"#e11d48", fontSize:13, marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {isRegister && (
            <>
              <div>
                <label style={labelSt}>Nombre completo</label>
                <input className="l-input" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo" required />
              </div>
              <div>
                <label style={labelSt}>Foto de perfil (opcional)</label>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:50, height:50, borderRadius:13, background:imagePreview?"transparent":"rgba(26,184,196,0.05)", border:"1px dashed rgba(212,168,67,0.2)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                    {imagePreview ? <img src={imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9298ae" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ display:"inline-block", padding:"7px 14px", background:"rgba(26,184,196,0.05)", border:"1px solid rgba(26,184,196,0.10)", borderRadius:9, color:"#1ab8c4", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      {uploading ? "Subiendo..." : imagePreview ? "Cambiar foto" : "Subir foto"}
                      <input type="file" accept="image/*" onChange={e=>{ if(e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} style={{ display:"none" }} />
                    </label>
                    {imagePreview && <button type="button" onClick={()=>{setImageUrl("");setImagePreview("");}} style={{ marginLeft:8, background:"none", border:"none", color:"#e11d48", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Quitar</button>}
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={labelSt}>Correo electrónico</label>
            <input className="l-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
          </div>
          <div>
            <label style={labelSt}>Contraseña</label>
            <input className="l-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {isRegister && (
            <>
              <div>
                <label style={labelSt}>Teléfono (opcional)</label>
                <input className="l-input" type="text" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="71234567" />
              </div>
              <div>
                <label style={labelSt}>Tipo de cuenta</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { val:"admin", label:"Administrador", desc:"Control total de la sucursal",
                      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                    { val:"tech",  label:"Técnico",        desc:"Gestiona reparaciones asignadas",
                      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
                  ].map(opt => {
                    const active = role===opt.val;
                    return (
                      <button key={opt.val} type="button" onClick={()=>setRole(opt.val)} style={{
                        flex:1, padding:"14px 12px", borderRadius:12,
                        border:`1.5px solid ${active?"rgba(212,168,67,0.5)":"rgba(226,229,238,0.8)"}`,
                        background: active?"rgba(26,184,196,0.05)":"transparent",
                        cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                      }}>
                        <div style={{ color:active?"#1ab8c4":"#9298ae", marginBottom:6 }}>{opt.icon}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:active?"#1ab8c4":"#1a1d2e", marginBottom:3 }}>{opt.label}</div>
                        <div style={{ fontSize:10, color:"#9298ae", lineHeight:1.4 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelSt}>Sucursal</label>
                <select className="l-input" value={branchId} onChange={e=>setBranchId(e.target.value)} required style={{ cursor:"pointer" }}>
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={{
            width:"100%", padding:"14px", border:"none", borderRadius:12, fontSize:14, fontWeight:700,
            cursor:loading?"wait":"pointer", marginTop:4, letterSpacing:"0.2px",
            background: loading ? "var(--bg-tertiary)" : "linear-gradient(135deg,#149aa5,#1ab8c4)",
            color: loading ? "#9298ae" : "#f8f9fb",
            boxShadow: loading ? "none" : "0 6px 24px rgba(26,184,196,0.3)",
            transition:"all 0.2s",
          }}>
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.15)", borderTopColor:"#1ab8c4", borderRadius:"50%", animation:"spin 0.6s linear infinite", display:"inline-block" }} />
                Procesando...
              </span>
            ) : isRegister ? "Crear Cuenta" : "Ingresar al Sistema"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:24 }}>
          {!isRegister
            ? <p style={{ fontSize:13, color:"#9298ae" }}>¿No tienes cuenta?{" "}<span onClick={()=>setIsRegister(true)} style={{ color:"#1ab8c4", cursor:"pointer", fontWeight:600 }}>Regístrate</span></p>
            : <p style={{ fontSize:13, color:"#9298ae" }}>¿Ya tienes cuenta?{" "}<span onClick={()=>setIsRegister(false)} style={{ color:"#1ab8c4", cursor:"pointer", fontWeight:600 }}>Inicia sesión</span></p>
          }
        </div>

        <div style={{ position:"absolute", bottom:-1, left:"30%", right:"30%", height:1, background:"linear-gradient(90deg,transparent,rgba(212,168,67,0.2),transparent)", borderRadius:1 }} />
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display:"block", fontSize:11, fontWeight:600, color:"#4a5068",
  marginBottom:7, letterSpacing:"0.3px",
};
