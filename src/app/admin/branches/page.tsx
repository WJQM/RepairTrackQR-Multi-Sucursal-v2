"use client";
import { sileo } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { AppSidebar } from "@/components/AppSidebar";

interface Branch { id: string; name: string; address: string | null; phone: string | null; active: boolean; createdAt: string; _count: { users: number; repairs: number }; }

export default function AdminBranchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allBranches, setAllBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranchState] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const parsed = (() => { try { return JSON.parse(userData); } catch { return null; } })();
    if (parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await apiFetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
        setAllBranches(data.map((b: Branch) => ({ id: b.id, name: b.name })));
        const ab = sessionStorage.getItem("activeBranchId");
        if (ab) setActiveBranchState(ab);
        else if (data.length > 0) { setActiveBranchState(data[0].id); setActiveBranchId(data[0].id); }
      }
    } catch {} setLoading(false);
  };

  const resetForm = () => { setFormName(""); setFormAddress(""); setFormPhone(""); setEditId(null); };

  const handleSubmit = async () => {
    if (!formName) return;
    const body = { name: formName, address: formAddress || null, phone: formPhone || null };
    try {
      const res = editId
        ? await apiFetch("/api/branches", { method: "PATCH", body: JSON.stringify({ id: editId, ...body }) })
        : await apiFetch("/api/branches", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        sileo.success({ title: editId ? "Sucursal actualizada" : "Sucursal creada" });
        setShowForm(false); resetForm(); loadData();
      } else { const d = await res.json(); sileo.error({ title: `${d.error}` }); }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const startEdit = (b: Branch) => { setEditId(b.id); setFormName(b.name); setFormAddress(b.address || ""); setFormPhone(b.phone || ""); setShowForm(true); };

  const handleDelete = async (b: Branch) => {
    if (!confirm(`¿Desactivar sucursal "${b.name}"? Los datos se conservarán.`)) return;
    try {
      const res = await apiFetch("/api/branches", { method: "DELETE", body: JSON.stringify({ id: b.id }) });
      if (res.ok) { sileo.success({ title: "Sucursal desactivada" }); loadData(); }
    } catch {}
  };

  const logout = async () => { sessionStorage.clear(); await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <style>{`
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
        @media(max-width:768px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{margin-left:0!important;padding-top:72px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
        }
        .form-input { width: 100%; padding: 10px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: 10px; color:#1e2a3a; font-size: 13px; outline: none; }
        .form-input:focus { border-color: #1ab8c4; box-shadow: 0 0 0 3px rgba(26,184,196,0.12); background: #ffffff; }
      `}</style>

      <AppSidebar user={user} />

      {/* MAIN */}
      <main className="main-content" style={{ marginLeft: 210, padding: "24px 28px", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>🏢 Gestión de Sucursales</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{branches.length} sucursales activas</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1ab8c4, #149aa5)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,184,196,0.14)" }}>＋ Nueva Sucursal</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Cargando...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {branches.map(b => (
              <div key={b.id} style={{ background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8", padding: "22px 20px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg, rgba(26,184,196,0.08), rgba(26,184,196,0.04))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏢</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{b.name}</div>
                      {b.address && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>📍 {b.address}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEdit(b)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", color: "#2dd4df", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                    <button onClick={() => handleDelete(b)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1ab8c4" }}>{b._count.users}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Usuarios</div>
                  </div>
                  <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{b._count.repairs}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Órdenes</div>
                  </div>
                  {b.phone && (
                    <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>📱</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{b.phone}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setShowForm(false); resetForm(); }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", padding: "28px 24px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editId ? "✏️ Editar Sucursal" : "➕ Nueva Sucursal"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Nombre *</label>
                <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Sucursal Centro" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Dirección</label>
                <input className="form-input" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Dirección (opcional)" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Teléfono</label>
                <input className="form-input" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Teléfono (opcional)" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: "12px", background: "#f5f7fc", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSubmit} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #1ab8c4, #149aa5)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{editId ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
