"use client";
import { sileo } from "@/lib/toast";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { AppSidebar } from "@/components/AppSidebar";

interface Settings { id: string; companyName: string; slogan: string; logo: string | null; phone: string | null; email: string | null; address: string | null; website: string | null; }

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranchState] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const parsed = (() => { try { return JSON.parse(userData); } catch { return null; } })();
    if (parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);

    // Load branches for sidebar
    apiFetch("/api/branches").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) {
        setBranches(d.map((b: any) => ({ id: b.id, name: b.name })));
        const ab = sessionStorage.getItem("activeBranchId");
        if (ab) setActiveBranchState(ab);
        else if (d.length > 0) { setActiveBranchState(d[0].id); setActiveBranchId(d[0].id); }
      }
    });

    // Load settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const s: Settings = await res.json();
        setCompanyName(s.companyName);
        setSlogan(s.slogan);
        setLogo(s.logo);
        setPhone(s.phone || "");
        setEmail(s.email || "");
        setAddress(s.address || "");
        setWebsite(s.website || "");
      }
    } catch {} finally { setLoading(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { sileo.error({ title: "La imagen no debe superar 2MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogo(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const resetDefaults = () => {
    setCompanyName("RepairTrackQR");
    setSlogan("Servicio Técnico Especializado");
    setLogo(null);
    setPhone("");
    setEmail("");
    setAddress("");
    setWebsite("");
    sileo.info({ title: "Valores por defecto restaurados — presiona Guardar para aplicar" });
  };

  const handleSave = async () => {
    if (!companyName.trim()) { sileo.error({ title: "El nombre de empresa es obligatorio" }); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName: companyName.trim(),
          slogan: slogan.trim(),
          logo,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          website: website.trim() || null,
        }),
      });
      if (res.ok) { sileo.success({ title: "Configuración guardada correctamente" }); }
      else { const d = await res.json(); sileo.error({ title: `${d.error}` }); }
    } catch { sileo.error({ title: "Error al guardar" }); }
    finally { setSaving(false); }
  };

  const logout = () => { apiFetch("/api/auth/logout", { method: "POST" }).then(() => { sessionStorage.removeItem("token"); sessionStorage.removeItem("user"); router.push("/"); }); };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  const inputStyle = { width: "100%", padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <style>{`
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
        @media(max-width:1024px) {
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          .settings-main{margin-left:0!important;padding-top:70px!important}
          .settings-form-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      <AppSidebar user={user} />

      {/* CONTENT */}
      <main className="settings-main" style={{ marginLeft: 210, padding: "32px 28px", minHeight: "100vh" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px" }}>⚙️ Configuración de Empresa</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Personaliza el nombre, logo y datos de contacto. Estos datos se reflejan en todo el sistema: login, impresiones, seguimiento, cotizaciones y más.</p>
          </div>

          {/* LOGO SECTION */}
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8", marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#2dd4df", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>Logo de la Empresa</label>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 100, height: 100, borderRadius: 12, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--bg-tertiary)", flexShrink: 0, cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                {logo ? (
                  <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 28 }}>🖼️</div>
                    <div style={{ fontSize: 9, marginTop: 4 }}>Click para subir</div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input type="file" ref={fileRef} accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} style={{ padding: "8px 16px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 8, color: "#2dd4df", fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: 6, display: "block" }}>📁 Subir imagen</button>
                {logo && <button onClick={() => setLogo(null)} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>🗑️ Quitar logo</button>}
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>PNG, JPG o SVG. Máximo 2MB. Se muestra en login, impresiones y documentos.</p>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8", marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#2dd4df", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>Datos de la Empresa</label>
            <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Nombre de la Empresa *</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ej: TechFix Bolivia" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Slogan / Descripción</label>
                <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Ej: Servicio Técnico Especializado" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Teléfono</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 71234567" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: info@techfix.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Dirección</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Av. Principal #123" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Sitio Web (para impresiones)</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Ej: www.techfix.com" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8", marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>👁️ Vista Previa</label>
            <div style={{ padding: 20, background: "#fff", borderRadius: 10, color: "#111" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {logo ? (
                  <img src={logo} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #1ab8c4, #149aa5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff" }}>🔧</div>
                )}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1a1a2e" }}>{companyName || "Nombre de Empresa"}</h3>
                  <p style={{ fontSize: 9, color: "#888", margin: 0, marginTop: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>{slogan || "Slogan"}</p>
                </div>
              </div>
              <div style={{ height: 2, background: "linear-gradient(90deg, #1a1a2e, #1ab8c4, #a5b4fc, transparent)", borderRadius: 1, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 16, fontSize: 9, color: "#888" }}>
                {phone && <span>📞 {phone}</span>}
                {email && <span>✉️ {email}</span>}
                {address && <span>📍 {address}</span>}
                {website && <span>🌐 {website}</span>}
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={resetDefaults} style={{ flex: "0 0 auto", padding: "14px 24px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, color: "#f59e0b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🔄 Default</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: saving ? "var(--bg-tertiary)" : "linear-gradient(135deg, #1ab8c4, #149aa5)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "⏳ Guardando..." : "💾 Guardar Configuración"}
            </button>
          </div>
        </div>
      </main>

      {/* TOAST */}
</div>
  );
}
