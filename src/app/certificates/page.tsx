"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

const WINDOWS_EDITIONS = [
  "Windows 11 Pro","Windows 11 Home","Windows 11 Enterprise","Windows 11 Education","Windows 11 Pro for Workstations",
  "Windows 10 Pro","Windows 10 Home","Windows 10 Enterprise","Windows 10 Enterprise LTSC","Windows 10 Education","Windows 10 Pro for Workstations",
  "Windows 8.1 Pro","Windows 8.1","Windows 8.1 Enterprise","Windows 8 Pro","Windows 8","Windows 8 Enterprise",
  "Windows 7 Ultimate","Windows 7 Professional","Windows 7 Home Premium","Windows 7 Home Basic","Windows 7 Enterprise","Windows 7 Starter",
];

const OFFICE_EDITIONS = [
  "Microsoft Office LTSC Professional Plus 2024","Microsoft Office LTSC Standard 2024",
  "Microsoft Office Professional Plus 2021","Microsoft Office Standard 2021","Microsoft Office Home & Business 2021","Microsoft Office Home & Student 2021",
  "Microsoft Office LTSC Professional Plus 2021","Microsoft Office LTSC Standard 2021",
  "Microsoft Office Professional Plus 2019","Microsoft Office Standard 2019","Microsoft Office Home & Business 2019","Microsoft Office Home & Student 2019",
  "Microsoft Office Professional Plus 2016","Microsoft Office Standard 2016","Microsoft Office Home & Business 2016","Microsoft Office Home & Student 2016",
  "Microsoft Office Professional Plus 2013","Microsoft Office Standard 2013","Microsoft Office Home & Business 2013","Microsoft Office Home & Student 2013",
  "Microsoft Office Professional Plus 2010","Microsoft Office Standard 2010","Microsoft Office Home & Business 2010","Microsoft Office Home & Student 2010",
  "Microsoft 365 Apps for Enterprise","Microsoft 365 Apps for Business","Microsoft 365 Personal","Microsoft 365 Family",
];

const defaultForm = {
  clientName: "", computerName: "", windowsEdition: "Windows 11 Pro", windowsSerial: "",
  officeEdition: "Microsoft Office LTSC Professional Plus 2024", officeSerial: "",
  date: new Date().toISOString().split("T")[0], technician: "", notes: "",
};

export default function CertificatesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; website: string | null; phone: string | null; address: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico", logo: null, website: null, phone: null, address: null });
  const [form, setForm] = useState(defaultForm);
  const [preview, setPreview] = useState(false);
  const [previewCode, setPreviewCode] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"form" | "history">("form");
  const certRef = useRef<HTMLDivElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const formatSerial = (val: string) => { const c = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase(); return (c.match(/.{1,5}/g) || []).join("-"); };
  const handleSerialChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: formatSerial(e.target.value) }));

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName || "RepairTrackQR", slogan: d.slogan || "Servicio Técnico", logo: d.logo || null, website: d.website || null, phone: d.phone || null, address: d.address || null }).catch(() => {}); }).catch(() => {});
    const token = sessionStorage.getItem("token"); const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const parsed = (() => { try { return JSON.parse(userData); } catch { return null; } })();
    setUser(parsed);
    setForm(f => ({ ...f, technician: parsed.name || "" }));
    if (parsed.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    }
    loadCertificates();
  }, [router]);

  const loadCertificates = async () => {
    try {
      const res = await apiFetch("/api/certificates");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        // Handle ?view=CL-X&branchId=xxx from scanner/search
        const params = new URLSearchParams(window.location.search);
        const viewCode = params.get("view");
        if (viewCode) {
          const viewBranch = params.get("branchId");
          // Try to find in current branch list first
          let found = data.find((c: any) => c.code === viewCode);
          // If not found and branchId provided, fetch directly from that branch
          if (!found && viewBranch) {
            try {
              const r2 = await apiFetch(`/api/certificates?code=${viewCode}&branchId=${viewBranch}`);
              if (r2.ok) found = await r2.json();
            } catch {}
          }
          if (found) {
            setForm({ clientName: found.clientName, computerName: found.computerName || "", windowsEdition: found.windowsEdition || "Windows 11 Pro", windowsSerial: found.windowsSerial || "", officeEdition: found.officeEdition || "Microsoft Office LTSC Professional Plus 2024", officeSerial: found.officeSerial || "", date: found.date, technician: found.technician, notes: found.notes || "" });
            setPreviewCode(found.code);
            setPreview(true);
          }
          window.history.replaceState({}, "", "/certificates");
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!form.clientName.trim()) { sileo.error("El nombre del cliente es obligatorio"); return; }
    if (!form.windowsSerial && !form.officeSerial) { sileo.error("Ingresa al menos una clave de producto"); return; }
    setSaving(true);
    try {
      if (editingId) {
        const res = await apiFetch("/api/certificates", { method: "PATCH", body: JSON.stringify({ id: editingId, ...form }) });
        if (res.ok) { const u = await res.json(); sileo.success(`Certificado ${u.code} actualizado`); setPreviewCode(u.code); setPreview(true); setEditingId(null); loadCertificates(); }
        else { const d = await res.json(); sileo.error(d.error || "Error al actualizar"); }
      } else {
        const res = await apiFetch("/api/certificates", { method: "POST", body: JSON.stringify(form) });
        if (res.ok) { const c = await res.json(); sileo.success(`Certificado ${c.code} guardado en DB`); setPreviewCode(c.code); setPreview(true); loadCertificates(); }
        else { const d = await res.json(); sileo.error(d.error || "Error al crear"); }
      }
    } catch { sileo.error("Error de conexión"); } finally { setSaving(false); }
  };

  const loadFromHistory = (entry: any) => {
    setForm({ clientName: entry.clientName, computerName: entry.computerName || "", windowsEdition: entry.windowsEdition || "Windows 11 Pro", windowsSerial: entry.windowsSerial || "", officeEdition: entry.officeEdition || "Microsoft Office LTSC Professional Plus 2024", officeSerial: entry.officeSerial || "", date: entry.date, technician: entry.technician, notes: entry.notes || "" });
    setEditingId(entry.id); setTab("form"); sileo.success(`${entry.code} cargado para edición`);
  };

  const viewCertificate = (entry: any) => {
    setForm({ clientName: entry.clientName, computerName: entry.computerName || "", windowsEdition: entry.windowsEdition || "Windows 11 Pro", windowsSerial: entry.windowsSerial || "", officeEdition: entry.officeEdition || "Microsoft Office LTSC Professional Plus 2024", officeSerial: entry.officeSerial || "", date: entry.date, technician: entry.technician, notes: entry.notes || "" });
    setPreviewCode(entry.code); setPreview(true);
  };

  const deleteFromHistory = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar el certificado ${code}?`)) return;
    try { const res = await apiFetch(`/api/certificates?id=${id}`, { method: "DELETE" }); if (res.ok) { sileo.success("Certificado eliminado"); loadCertificates(); } else { sileo.error("Error al eliminar"); } } catch { sileo.error("Error de conexión"); }
  };

  const handlePrint = () => {
    const branchId = getActiveBranchId();
    window.open(`/certificate-view/${previewCode}${branchId ? `?branchId=${branchId}` : ""}`, "_blank");
  };

  const canGenerate = form.clientName.trim() && (form.windowsSerial || form.officeSerial);
  const isTech = user?.role === "tech";
  const navItems = isTech
    ? [{ label: "Mis Asignaciones", path: "/asignaciones", icon: "📋" },{ label: "Escáner", path: "/scanner", icon: "📷" },{ label: "Cotizaciones", path: "/quotations", icon: "🧾" },{ label: "Certificados", path: "/certificates", icon: "🏅", active: true }]
    : [{ label: "Panel Principal", path: "/dashboard", icon: "📋" },{ label: "Servicios", path: "/services", icon: "🛠️" },{ label: "Inventario", path: "/inventory", icon: "📦" },{ label: "Software", path: "/software", icon: "🎮" },{ label: "Escáner", path: "/scanner", icon: "📷" },{ label: "Cotizaciones", path: "/quotations", icon: "🧾" },{ label: "Extracto", path: "/extracto", icon: "📊" },{ label: "Certificados", path: "/certificates", icon: "🏅", active: true },
      ...(user?.role === "superadmin" ? [{ label: "Usuarios", path: "/admin/users", icon: "👥" },{ label: "Sucursales", path: "/admin/branches", icon: "🏢" },{ label: "Configuración", path: "/admin/settings", icon: "⚙️" }] : [])];

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "#2dd4df" }}>⏳ Cargando...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", display: "flex" }}>
      <style>{`
        .sidebar-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:10px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:var(--text-muted);transition:all .15s;text-align:left}
        .sidebar-btn:hover{background:rgba(26,184,196,0.05);color:var(--text-secondary)}
        .sidebar-btn.active{background:rgba(26,184,196,0.07);color:#2dd4df}
        .sidebar-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .cert-input{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:#ffffff;color:#1e2a3a;outline:none;transition:border-color .2s,box-shadow .2s}
        .cert-input:focus{border-color:#1ab8c4;box-shadow:0 0 0 3px rgba(26,184,196,0.07)}
        .cert-input::placeholder{color:var(--text-muted)}
        .cert-select{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:#ffffff;color:var(--text-primary);outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23818cf8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
        .cert-select:focus{border-color:#1ab8c4;box-shadow:0 0 0 3px rgba(26,184,196,0.07)}
        .cert-select option{background:#1a1a2e;color:#e2e8f0}
        @media(max-width:1024px){.sidebar-desktop{transform:translateX(-100%)!important}.sidebar-desktop.open{transform:translateX(0)!important}.main-content{margin-left:0!important;padding-top:56px!important}.sidebar-overlay{display:block!important}}
      `}</style>

      <AppSidebar user={user} />

      {/* Main content */}
      <main className="main-content" style={{ marginLeft: 210, flex: 1, padding: "20px 24px", minHeight: "100vh" }}>
        {!preview ? (
          <>
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🏅 Certificados de Autenticidad</h1>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Genera certificados con código CL auto-incremental por sucursal · Guardados en base de datos</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setTab("form"); setEditingId(null); setForm({ ...defaultForm, technician: user?.name || "" }); }} style={{ padding: "8px 18px", borderRadius: 10, border: tab === "form" ? "none" : "1px solid var(--border)", background: tab === "form" ? "linear-gradient(135deg,#1ab8c4,#149aa5)" : "transparent", color: tab === "form" ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📝 Nuevo</button>
                <button onClick={() => setTab("history")} style={{ padding: "8px 18px", borderRadius: 10, border: tab === "history" ? "none" : "1px solid var(--border)", background: tab === "history" ? "linear-gradient(135deg,#1ab8c4,#149aa5)" : "transparent", color: tab === "history" ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📋 Historial ({history.length})</button>
              </div>
            </div>
            </div>

            {tab === "form" ? (
              <div style={{ maxWidth: 700, margin: "0 auto" }}>
                {editingId && (
                  <div style={{ marginBottom: 14, padding: "10px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>✏️ Editando certificado existente</span>
                    <button onClick={() => { setEditingId(null); setForm({ ...defaultForm, technician: user?.name || "" }); }} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Cancelar</button>
                  </div>
                )}

                {/* Client Info */}
                <div style={{ background: "var(--bg-secondary)", border: "1.5px solid #cbd5e8", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#2dd4df", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>👤 Información del Cliente</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Nombre del Cliente *</label><input className="cert-input" value={form.clientName} onChange={set("clientName")} placeholder="Juan Pérez" /></div>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Nombre del Equipo</label><input className="cert-input" value={form.computerName} onChange={set("computerName")} placeholder="PC-OFICINA-01" /></div>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Fecha</label><input type="date" className="cert-input" value={form.date} onChange={set("date")} /></div>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Técnico Responsable</label><input className="cert-input" value={form.technician} onChange={set("technician")} placeholder="Nombre del técnico" /></div>
                  </div>
                </div>

                {/* Windows */}
                <div style={{ background: "var(--bg-secondary)", border: "1.5px solid #cbd5e8", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0078D4", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="15" y="2" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="2" y="15" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="15" y="15" width="11" height="11" rx="1.5" fill="#0078D4"/></svg>
                    Licencia de Windows
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Edición</label><select className="cert-select" value={form.windowsEdition} onChange={set("windowsEdition")}>{(WINDOWS_EDITIONS || []).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Clave de Producto</label><input className="cert-input" style={{ fontFamily: "'Courier New', monospace", letterSpacing: 1.5 }} value={form.windowsSerial} onChange={handleSerialChange("windowsSerial")} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" maxLength={29} /></div>
                  </div>
                </div>

                {/* Office */}
                <div style={{ background: "var(--bg-secondary)", border: "1.5px solid #cbd5e8", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#D83B01", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="4" fill="#D83B01"/><text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="serif">O</text></svg>
                    Licencia de Microsoft Office
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Edición</label><select className="cert-select" value={form.officeEdition} onChange={set("officeEdition")}>{(OFFICE_EDITIONS || []).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Clave de Producto</label><input className="cert-input" style={{ fontFamily: "'Courier New', monospace", letterSpacing: 1.5 }} value={form.officeSerial} onChange={handleSerialChange("officeSerial")} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" maxLength={29} /></div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: "var(--bg-secondary)", border: "1.5px solid #cbd5e8", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 5 }}>Notas Adicionales</label>
                  <textarea className="cert-input" style={{ minHeight: 60, resize: "vertical" }} value={form.notes} onChange={set("notes") as any} placeholder="Observaciones opcionales..." />
                </div>

                <button disabled={!canGenerate || saving} onClick={handleGenerate} style={{ width: "100%", padding: "14px 0", border: "none", borderRadius: 12, background: canGenerate && !saving ? "linear-gradient(135deg,#1ab8c4,#149aa5)" : "rgba(26,184,196,0.10)", color: canGenerate && !saving ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 700, cursor: canGenerate && !saving ? "pointer" : "not-allowed", letterSpacing: 1, textTransform: "uppercase", boxShadow: canGenerate && !saving ? "0 4px 16px rgba(26,184,196,0.14)" : "none", transition: "all .2s" }}>
                  {saving ? "⏳ Guardando en DB..." : editingId ? "✏️ Actualizar Certificado" : "🏅 Generar Certificado (CL)"}
                </button>
                {!canGenerate && <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Ingresa el nombre del cliente y al menos una clave de producto</p>}
              </div>
            ) : (
              <div style={{ maxWidth: 700, margin: "0 auto" }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><p style={{ fontSize: 13 }}>No hay certificados en la base de datos</p></div>
                ) : history.map(h => (
                  <div key={h.id} style={{ background: "#ffffff", border: "1.5px solid #cbd5e8", borderRadius: 14, padding: 16, boxShadow: "var(--shadow-sm)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#2dd4df", background: "rgba(26,184,196,0.06)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(26,184,196,0.08)" }}>{h.code}</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{h.clientName}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {h.computerName && `${h.computerName} · `}{h.technician && `Téc: ${h.technician} · `}{new Date(h.createdAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}{h.user?.name && ` · ${h.user.name}`}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {h.windowsSerial && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(0,120,212,0.1)", color: "#0078D4", fontWeight: 600 }}>{h.windowsEdition}</span>}
                        {h.officeSerial && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(216,59,1,0.1)", color: "#D83B01", fontWeight: 600 }}>{h.officeEdition}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => viewCertificate(h)} title="Ver/Imprimir" style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)", color: "#10b981", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>👁️</button>
                      <button onClick={() => loadFromHistory(h)} title="Editar" style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(26,184,196,0.10)", background: "rgba(26,184,196,0.05)", color: "#2dd4df", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📝</button>
                      <button onClick={() => deleteFromHistory(h.id, h.code)} title="Eliminar" style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setPreview(false)} style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Volver</button>
              <button onClick={handlePrint} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1ab8c4,#149aa5)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,184,196,0.14)" }}>🖨️ Imprimir</button>
              <button onClick={() => { setForm({ ...defaultForm, technician: user?.name || "" }); setEditingId(null); setPreview(false); }} style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)", color: "#10b981", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>＋ Nuevo</button>
            </div>
            {previewCode && <div style={{ textAlign: "center", marginBottom: 12 }}><span style={{ fontSize: 14, fontWeight: 700, color: "#2dd4df", background: "rgba(26,184,196,0.06)", padding: "6px 20px", borderRadius: 10, border: "1px solid rgba(26,184,196,0.10)", letterSpacing: 1.5 }}>📋 {previewCode}</span></div>}
            <div ref={certRef}>
              <div style={{ maxWidth: "7.5in", margin: "0 auto", padding: "40px 38px", border: "3px solid #1e3a5f", position: "relative", background: "#fff", borderRadius: 4, fontFamily: "'Source Sans 3','Segoe UI',sans-serif", color: "#1a1a2e" }}>
                <div style={{ position: "absolute", inset: 6, border: "1px solid #b0c4de", pointerEvents: "none", borderRadius: 2 }} />
                <div style={{ position: "absolute", top: 14, left: 14, width: 32, height: 32, borderTop: "2px solid #1e3a5f", borderLeft: "2px solid #1e3a5f" }} />
                <div style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderTop: "2px solid #1e3a5f", borderRight: "2px solid #1e3a5f" }} />
                <div style={{ position: "absolute", bottom: 14, left: 14, width: 32, height: 32, borderBottom: "2px solid #1e3a5f", borderLeft: "2px solid #1e3a5f" }} />
                <div style={{ position: "absolute", bottom: 14, right: 14, width: 32, height: 32, borderBottom: "2px solid #1e3a5f", borderRight: "2px solid #1e3a5f" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-30deg)", fontFamily: "'Playfair Display',serif", fontSize: 100, fontWeight: 700, color: "rgba(30,58,95,0.03)", pointerEvents: "none", whiteSpace: "nowrap", letterSpacing: 10 }}>AUTÉNTICO</div>
                <div style={{ textAlign: "center", marginBottom: 22, paddingBottom: 18, borderBottom: "2px solid #e2e8f0" }}>
                  {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 40, objectFit: "contain", marginBottom: 6 }} />}
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>{settings.companyName}</div>
                  {settings.slogan && <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginBottom: 4 }}>{settings.slogan}</div>}
                  <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 8px" }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 4L6 12v12c0 11.1 7.68 21.48 18 24 10.32-2.52 18-12.9 18-24V12L24 4z" fill="url(#sg2)" stroke="#1e3a5f" strokeWidth="1.5"/><path d="M20 24l4 4 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="sg2" x1="6" y1="4" x2="42" y2="40"><stop offset="0%" stopColor="#1e3a5f"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs></svg>
                  </div>
                  <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: "#1e3a5f", letterSpacing: 3, textTransform: "uppercase", margin: "4px 0" }}>Certificado de Autenticidad</h1>
                  {previewCode && <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#1e3a5f", background: "#e8f0fe", border: "1px solid #b0c4de", borderRadius: 6, padding: "3px 12px", letterSpacing: 1.5, marginTop: 4 }}>{previewCode}</div>}
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>{[settings.phone, settings.website, settings.address].filter(Boolean).join(" · ")}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>Información del Equipo</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
                    <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Cliente</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{form.clientName}</div></div>
                    {form.computerName && <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Equipo</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{form.computerName}</div></div>}
                    <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Fecha de Emisión</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{new Date(form.date + "T12:00:00").toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" })}</div></div>
                    {form.technician && <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Técnico Responsable</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{form.technician}</div></div>}
                  </div>
                </div>
                {form.windowsSerial && <div style={{ marginBottom: 16 }}><h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}><svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="15" y="2" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="2" y="15" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="15" y="15" width="11" height="11" rx="1.5" fill="#0078D4"/></svg>Licencia de Windows</h3><div style={{ padding: "5px 0", marginBottom: 6 }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Edición</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{form.windowsEdition}</div></div><div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Clave de Producto</div><div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "10px 16px", fontFamily: "'Courier New',monospace", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "#1e3a5f", textAlign: "center", marginTop: 4 }}>{form.windowsSerial}</div></div></div>}
                {form.officeSerial && <div style={{ marginBottom: 16 }}><h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}><svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="4" fill="#D83B01"/><text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="serif">O</text></svg>Licencia de Microsoft Office</h3><div style={{ padding: "5px 0", marginBottom: 6 }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Edición</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{form.officeEdition}</div></div><div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Clave de Producto</div><div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "10px 16px", fontFamily: "'Courier New',monospace", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "#1e3a5f", textAlign: "center", marginTop: 4 }}>{form.officeSerial}</div></div></div>}
                {form.notes && <div style={{ marginBottom: 16 }}><h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>Observaciones</h3><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#475569" }}>{form.notes}</div></div>}
                <div style={{ marginTop: 28, paddingTop: 16, borderTop: "2px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ textAlign: "center", width: 220 }}><div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 4 }} /><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8" }}>Firma del Técnico</div></div>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "conic-gradient(from 180deg,#00bfff,#149aa5,#ec4899,#f59e0b,#10b981,#00bfff)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}><div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontSize: 10, fontWeight: 700, color: "#1e3a5f", textAlign: "center", lineHeight: 1.2 }}>SELLO DE<br/>GARANTÍA</div></div>
                  <div style={{ textAlign: "center", width: 220 }}><div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 4 }} /><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8" }}>Firma del Cliente</div></div>
                </div>
                <p style={{ textAlign: "center", fontSize: 9, color: "#94a3b8", marginTop: 14, lineHeight: 1.5 }}>Este certificado garantiza que las licencias de software indicadas son productos originales y legítimos.<br/>El uso de las claves de producto está sujeto a los términos y condiciones de Microsoft Corporation.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
