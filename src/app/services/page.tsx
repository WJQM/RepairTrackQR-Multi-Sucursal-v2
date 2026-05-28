"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

interface Service { id: string; name: string; price: number; icon: string; active: boolean; createdAt: string; }

const ICON_OPTIONS = ["🔧", "🔍", "🧹", "💿", "🌡️", "💾", "🧠", "🖥️", "💧", "⌨️", "🔋", "📂", "🛠️", "⚡", "🖨️", "📡", "🔌", "💻", "📱", "🎮"];

export default function ServicesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [icon, setIcon] = useState("🔧");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  const loadServices = async () => {
    try { const res = await apiFetch("/api/services"); if (res.ok) setServices(await res.json()); } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const parsed = (() => { try { return JSON.parse(userData); } catch { return null; } })();
    if (parsed.role !== "admin" && parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);
    // Load branches for superadmin
    if (parsed.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.ok ? r.json() : Promise.reject(r.status)).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(parsed.branchId || ""); }

    loadServices();
  }, []);

  const resetForm = () => { setName(""); setPrice(""); setIcon("🔧"); setEditingId(null); setShowForm(false); };

  const saveService = async () => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    if (!name.trim() || !price.trim()) { sileo.error({ title: "Nombre y precio son requeridos" }); return; }
    try {
      if (editingId) {
        const res = await apiFetch("/api/services", { method: "PATCH", body: JSON.stringify({ id: editingId, name, price, icon }) });
        if (res.ok) { sileo.success({ title: "Servicio actualizado" }); resetForm(); loadServices(); }
      } else {
        const res = await apiFetch("/api/services", { method: "POST", body: JSON.stringify({ name, price, icon }) });
        if (res.ok) { sileo.success({ title: "Servicio creado" }); resetForm(); loadServices(); }
      }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const editService = (svc: Service) => {
    setEditingId(svc.id); setName(svc.name); setPrice(String(svc.price)); setIcon(svc.icon); setShowForm(true);
  };

  const deleteService = async (id: string) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    const token = sessionStorage.getItem("token"); if (!token) return;
    try {
      const res = await apiFetch("/api/services", { method: "DELETE", body: JSON.stringify({ id }) });
      if (res.ok) { sileo.success({ title: "Servicio eliminado" }); loadServices(); }
    } catch {}
  };

  const totalRevenue = services.reduce((sum, s) => sum + s.price, 0);

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingLeft: 210, paddingTop: 0 }}>
<style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(80px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
      
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          [style*="grid-template-columns"]{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .card-compact{flex-direction:column!important}
          .card-img{width:100%!important;min-height:160px!important;max-height:200px!important}
          .card-compact p{max-width:100%!important}
          .msg-layout{grid-template-columns:1fr!important}
          .filter-btns{overflow-x:auto;-webkit-overflow-scrolling:touch}
        }
      `}</style>

      
      <AppSidebar user={user} />


      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Servicios", value: services.length, icon: "🛠️", color: "#a855f7" },

          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 18px", background: "#ffffff", borderRadius: 12, border: "1.5px solid #cbd5e8", borderTop: `4px solid ${s.color}`, boxShadow: "0 4px 18px rgba(30,42,58,0.10), 0 1px 3px rgba(30,42,58,0.05)", animation: `fadeIn 0.4s ease-out ${i * 0.06}s both`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 8, right: 12, fontSize: 28, opacity: 0.12 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 8, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>🛠️ Catálogo de Servicios</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Los servicios aparecerán automáticamente en las órdenes de trabajo</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #a855f7, #149aa5)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}>＋ Nuevo Servicio</button>
        </div>

        {showForm && (
          <div style={{ padding: 24, background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(168,85,247,0.2)", marginBottom: 24, animation: "fadeScale 0.3s ease-out" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#a855f7" }}>{editingId ? "✏️ Editar Servicio" : "＋ Nuevo Servicio"}</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>Selecciona un icono</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(ICON_OPTIONS || []).map(ic => (
                  <div key={ic} onClick={() => setIcon(ic)} style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", border: icon === ic ? "2px solid #a855f7" : "2px solid var(--border)", background: icon === ic ? "rgba(168,85,247,0.15)" : "var(--bg-tertiary)", transition: "all 0.15s" }}>{ic}</div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14, alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Nombre del servicio *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mantenimiento General" style={{ width: "100%", padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Precio (Bs.) *</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" type="number" style={{ width: "100%", padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveService} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #a855f7, #149aa5)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 12px rgba(168,85,247,0.3)" }}>{editingId ? "💾 Guardar" : "＋ Crear"}</button>
                <button onClick={resetForm} style={{ padding: "12px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
        ) : services.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛠️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No hay servicios</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Crea tu primer servicio para el catálogo</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #a855f7, #149aa5)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>＋ Crear Servicio</button>
          </div>
        ) : (
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {services.map((svc, i) => (
              <div key={svc.id} style={{ padding: 20, background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(168,85,247,0.1)", animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`, display: "flex", flexDirection: "column", gap: 12, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{svc.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#a855f7", marginTop: 2 }}>Bs. {svc.price}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editService(svc)} style={{ flex: 1, padding: "9px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", borderRadius: 10, color: "#1ab8c4", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>✏️ Editar</button>
                  <button onClick={() => deleteService(svc.id)} style={{ flex: 1, padding: "9px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>🗑️ Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}