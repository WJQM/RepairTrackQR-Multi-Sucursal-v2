"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

interface Equipment { id: string; code: string; name: string; type: string; brand: string | null; model: string | null; processor: string | null; ram: string | null; storage: string | null; storage2: string | null; screenSize: string | null; graphicsCard: string | null; os: string | null; cabinet: string | null; powerSupply: string | null; motherboard: string | null; accessories: string | null; condition: string; price: number; notes: string | null; image: string | null; createdAt: string; }

function parseImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr; } catch {}
  return img.trim() ? [img] : [];
}

const CONDITIONS = [
  { value: "disponible", label: "Disponible", icon: "✅", color: "#10b981" },
  { value: "vendido", label: "Vendido", icon: "💰", color: "#1ab8c4" },
  { value: "en_reparacion", label: "En reparación", icon: "🔧", color: "#f59e0b" },
];

function getDisplayName(eq: Equipment): string {
  if (eq.type === "desktop") {
    const cab = (eq.cabinet || "").trim();
    return cab ? `PC Escritorio ${cab}` : "PC Escritorio";
  }
  return ["Laptop", eq.brand, eq.model].filter(Boolean).join(" ");
}

export default function EquipmentPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  // Form fields (no name - auto generated)
  const [type, setType] = useState<"laptop" | "desktop">("laptop");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [processor, setProcessor] = useState("");
  const [ram, setRam] = useState("");
  const [storage, setStorage] = useState("");
  const [storage2, setStorage2] = useState("");
  const [screenSize, setScreenSize] = useState("");
  const [graphicsCard, setGraphicsCard] = useState("");
  const [os, setOs] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [powerSupply, setPowerSupply] = useState("");
  const [motherboard, setMotherboard] = useState("");
  const [accessories, setAccessories] = useState("");
  const [condition, setCondition] = useState("disponible");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterType, setFilterType] = useState<"all" | "laptop" | "desktop">("all");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<Equipment | null>(null);

  const loadItems = async () => {
    try { const res = await apiFetch("/api/equipment"); if (res.ok) setItems(await res.json()); } catch {}
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
    if (parsed.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(parsed.branchId || ""); }
    loadItems();

    const savedForm = sessionStorage.getItem("equipmentFormData");
    if (savedForm) {
      try {
        const data = (() => { try { return JSON.parse(savedForm); } catch { return null; } })();
        setEditingId(data.editingId || null); setType(data.type || "laptop");
        setBrand(data.brand || ""); setModel(data.model || ""); setProcessor(data.processor || "");
        setRam(data.ram || ""); setStorage(data.storage || ""); setStorage2(data.storage2 || "");
        setScreenSize(data.screenSize || ""); setGraphicsCard(data.graphicsCard || ""); setOs(data.os || "");
        setCabinet(data.cabinet || ""); setPowerSupply(data.powerSupply || ""); setMotherboard(data.motherboard || ""); setAccessories(data.accessories || "");
        setCondition(data.condition || "disponible"); setPrice(data.price || ""); setNotes(data.notes || "");
        setImageUrls(data.imageUrls || []); setImagePreviews(data.imagePreviews || []);
        setShowForm(true);
      } catch {}
      sessionStorage.removeItem("equipmentFormData");
    }

    const capturedData = sessionStorage.getItem("capturedImage");
    if (capturedData) {
      try {
        const { url, preview } = (() => { try { return JSON.parse(capturedData); } catch { return {}; } })();
        setImageUrls(prev => [...prev, url]); setImagePreviews(prev => [...prev, preview]);
        setShowForm(true);
        setTimeout(() => sileo.success({ title: "Foto capturada" }), 500);
      } catch {}
      sessionStorage.removeItem("capturedImage");
    }
  }, []);

  const resetForm = () => {
    setType("laptop"); setBrand(""); setModel(""); setProcessor("");
    setRam(""); setStorage(""); setStorage2(""); setScreenSize(""); setGraphicsCard(""); setOs("");
    setCabinet(""); setPowerSupply(""); setMotherboard(""); setAccessories("");
    setCondition("disponible"); setPrice(""); setNotes("");
    setImageUrls([]); setImagePreviews([]); setEditingId(null); setShowForm(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
      const formData = new FormData(); formData.append("file", file);
      try { const res = await apiFetch("/api/upload", { method: "POST", body: formData }); if (res.ok) { const data = await res.json(); setImageUrls(prev => [...prev, data.url]); } } catch {}
    }
    sileo.success({ title: `${files.length} imagen${files.length > 1 ? "es subidas" : " subida"}` });
    setUploading(false); e.target.value = "";
  };

  const handleTakePhoto = () => {
    sessionStorage.setItem("equipmentFormData", JSON.stringify({ editingId, type, brand, model, processor, ram, storage, storage2, screenSize, graphicsCard, os, cabinet, powerSupply, motherboard, accessories, condition, price, notes, imageUrls, imagePreviews }));
    sessionStorage.setItem("cameraReturnUrl", "/equipment");
    window.location.href = "/camera.html";
  };

  const removeImage = (idx: number) => { setImageUrls(prev => prev.filter((_, i) => i !== idx)); setImagePreviews(prev => prev.filter((_, i) => i !== idx)); };

  const saveItem = async () => {
    if (type === "laptop" && !brand.trim() && !model.trim()) { sileo.error({ title: "Ingresa al menos la marca o modelo" }); return; }
    if (type === "desktop" && !cabinet.trim()) { sileo.error({ title: "Ingresa al menos el gabinete" }); return; }
    const imageData = imageUrls.length > 1 ? JSON.stringify(imageUrls) : imageUrls[0] || null;
    try {
      if (editingId) {
        const res = await apiFetch("/api/equipment", { method: "PATCH", body: JSON.stringify({ id: editingId, type, brand, model, processor, ram, storage, storage2, screenSize, graphicsCard, os, cabinet, powerSupply, motherboard, accessories, condition, price, notes, image: imageData }) });
        if (res.ok) { sileo.success({ title: "Equipo actualizado" }); resetForm(); loadItems(); }
      } else {
        const res = await apiFetch("/api/equipment", { method: "POST", body: JSON.stringify({ type, brand, model, processor, ram, storage, storage2, screenSize, graphicsCard, os, cabinet, powerSupply, motherboard, accessories, condition, price, notes, image: imageData }) });
        if (res.ok) { sileo.success({ title: "Equipo agregado" }); resetForm(); loadItems(); }
      }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const editItem = (item: Equipment) => {
    setEditingId(item.id); setType(item.type as "laptop" | "desktop");
    setBrand(item.brand || ""); setModel(item.model || ""); setProcessor(item.processor || "");
    setRam(item.ram || ""); setStorage(item.storage || ""); setStorage2(item.storage2 || "");
    setScreenSize(item.screenSize || ""); setGraphicsCard(item.graphicsCard || ""); setOs(item.os || "");
    setCabinet(item.cabinet || ""); setPowerSupply(item.powerSupply || ""); setMotherboard(item.motherboard || ""); setAccessories(item.accessories || "");
    setCondition(item.condition); setPrice(String(item.price)); setNotes(item.notes || "");
    const imgs = parseImages(item.image);
    setImageUrls(imgs); setImagePreviews(imgs);
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("¿Eliminar este equipo?")) return;
    try { const res = await apiFetch("/api/equipment", { method: "DELETE", body: JSON.stringify({ id }) }); if (res.ok) { sileo.success({ title: "Eliminado" }); loadItems(); setViewDetail(null); } } catch {}
  };

  const filteredItems = items.filter(item => {
    const matchSearch = searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) || (item.model || "").toLowerCase().includes(searchQuery.toLowerCase()) || (item.processor || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === "all" || item.type === filterType;
    const matchCondition = filterCondition === "all" || item.condition === filterCondition;
    return matchSearch && matchType && matchCondition;
  });

  const stats = {
    total: items.length,
    laptops: items.filter(i => i.type === "laptop").length,
    desktops: items.filter(i => i.type === "desktop").length,
    disponibles: items.filter(i => i.condition === "disponible").length,
  };

  const getCondition = (c: string) => CONDITIONS.find(x => x.value === c) || CONDITIONS[0];

  // Preview name in form
  const previewName = type === "desktop"
    ? (cabinet.trim() ? `PC Escritorio ${cabinet.trim()}` : "")
    : [brand, model].filter(Boolean).join(" ") ? `Laptop ${[brand, model].filter(Boolean).join(" ")}` : "";

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingLeft: 210, paddingTop: 0 }}>
      {viewImage && (
        <div onClick={() => setViewImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, cursor: "pointer" }}>
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
            <img src={viewImage} alt="Equipo" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 20px 60px rgba(26,29,46,0.40)" }} />
            <button onClick={() => setViewImage(null)} style={{ position: "absolute", top: -14, right: -14, width: 32, height: 32, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(80px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
        .sidebar-group-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 14px;border-radius:10px;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;text-align:left;margin-top:4px}
        .sidebar-group-btn:hover{filter:brightness(1.2)}
        .group-arrow{font-size:10px;transition:transform 0.2s}
        .sidebar-group-btn.open .group-arrow{transform:rotate(180deg)}
        .sidebar-sub-list{max-height:0;overflow:hidden;transition:max-height 0.25s ease-out}
        .sidebar-sub-list.open{max-height:300px}
        .sidebar-sub{padding-left:18px!important;font-size:11px!important}
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .eq-grid{grid-template-columns:repeat(auto-fill, minmax(220px, 1fr))!important}
          .filter-row{flex-direction:column!important;align-items:stretch!important}
          .filter-row .filter-left{flex-direction:column!important}
          .filter-row .search-box{max-width:100%!important}
        }
        @media(max-width:640px){
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .eq-grid{grid-template-columns:1fr!important}
          .form-grid{grid-template-columns:1fr!important}
          .filter-btns{overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap!important}
        }
      `}</style>

      <AppSidebar user={user} />

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>💻 Equipos para la venta</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Laptops y equipos de escritorio — cada equipo es único, sin stock</p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Equipos", value: stats.total, icon: "💻", color: "#3b82f6" },
            { label: "Laptops", value: stats.laptops, icon: "💻", color: "#8b5cf6" },
            { label: "Escritorio", value: stats.desktops, icon: "🖥️", color: "#0891b2" },
            { label: "Disponibles", value: stats.disponibles, icon: "✅", color: "#10b981" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 18px", background: "#ffffff", borderRadius: 12, border: "1.5px solid #cbd5e8", borderTop: `4px solid ${s.color}`, boxShadow: "0 4px 18px rgba(30,42,58,0.10), 0 1px 3px rgba(30,42,58,0.05)", animation: `fadeIn 0.4s ease-out ${i * 0.06}s both`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 8, right: 12, fontSize: 28, opacity: 0.12 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 8 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div className="filter-left" style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
            <div className="search-box" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", borderRadius: 10, padding: "0 14px", border: "1px solid var(--border)", flex: 1, maxWidth: 300 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>🔍</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar marca, modelo, procesador..." style={{ border: "none", background: "none", padding: "10px 0", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" }} />
            </div>
            <div className="filter-btns" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {([{ key: "all", label: "Todos", icon: "📄" }, { key: "laptop", label: "Laptops", icon: "💻" }, { key: "desktop", label: "Escritorio", icon: "🖥️" }] as const).map(f => {
                const isActive = filterType === f.key;
                return (<button key={f.key} onClick={() => setFilterType(f.key)} style={{ padding: "8px 12px", borderRadius: 10, fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: isActive ? "rgba(26,184,196,0.07)" : "var(--bg-card)", border: isActive ? "1.5px solid rgba(26,184,196,0.25)" : "1.5px solid var(--border)", color: isActive ? "#2dd4df" : "var(--text-muted)", whiteSpace: "nowrap" }}><span style={{ fontSize: 12 }}>{f.icon}</span>{f.label}</button>);
              })}
            </div>
            <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="all">Todos los estados</option>
              {(CONDITIONS || []).map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.open("/equipment/print", "_blank")} style={{ padding: "10px 16px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 12, color: "#1ab8c4", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🖨️ Extracto</button>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>＋ Nuevo Equipo</button>
          </div>
        </div>

        {/* ═══ FORM MODAL ═══ */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>{editingId ? "✏️ Editar Equipo" : "＋ Nuevo Equipo"}</h3>
                  {previewName && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>→ {previewName}</div>}
                </div>
                <button onClick={resetForm} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Images */}
                <div>
                  <label style={labelStyle}>📷 Fotos del equipo</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(imagePreviews || []).map((preview, idx) => (
                      <div key={idx} style={{ width: 100, height: 130, borderRadius: 10, overflow: "hidden", position: "relative", border: "2px solid #3b82f6", flexShrink: 0 }}>
                        <img src={preview} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeImage(idx)} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    ))}
                    <div onClick={() => fileInputRef.current?.click()} style={{ width: 100, height: 130, borderRadius: 10, border: "2px dashed var(--border)", background: "var(--bg-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                      <span style={{ fontSize: 24 }}>📷</span><span style={{ fontSize: 9, color: "var(--text-muted)" }}>Subir</span>
                    </div>
                    <div onClick={handleTakePhoto} style={{ width: 100, height: 130, borderRadius: 10, border: "2px dashed rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                      <span style={{ fontSize: 24 }}>📸</span><span style={{ fontSize: 9, color: "#10b981" }}>Cámara</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: "none" }} />
                  </div>
                </div>

                {/* Type + Condition */}
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tipo *</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setType("laptop")} style={{ flex: 1, padding: "10px", borderRadius: 10, border: type === "laptop" ? "2px solid #8b5cf6" : "1px solid var(--border)", background: type === "laptop" ? "rgba(139,92,246,0.1)" : "var(--bg-tertiary)", color: type === "laptop" ? "#8b5cf6" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💻 Laptop</button>
                      <button onClick={() => setType("desktop")} style={{ flex: 1, padding: "10px", borderRadius: 10, border: type === "desktop" ? "2px solid #0891b2" : "1px solid var(--border)", background: type === "desktop" ? "rgba(6,182,212,0.1)" : "var(--bg-tertiary)", color: type === "desktop" ? "#0891b2" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖥️ Escritorio</button>
                    </div>
                  </div>
                  <div><label style={labelStyle}>Estado</label>
                    <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>
                      {(CONDITIONS || []).map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Brand + Model (solo para laptops) */}
                {type === "laptop" && (
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>Marca *</label><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: HP, Dell, Lenovo" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Modelo *</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: Pavilion 245 G8" style={fieldStyle} /></div>
                  </div>
                )}

                {/* Specs - all unified */}
                <div style={{ padding: "12px 14px", background: "rgba(26,184,196,0.04)", borderRadius: 12, border: "1px solid rgba(26,184,196,0.06)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1ab8c4", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>⚙️ Especificaciones</div>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>Procesador</label><input value={processor} onChange={(e) => setProcessor(e.target.value)} placeholder="Ej: Intel Core i5-1135G7" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Memoria RAM</label><input value={ram} onChange={(e) => setRam(e.target.value)} placeholder="Ej: 16GB DDR4" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Disco 1</label><input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="Ej: 512GB SSD NVMe" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Disco 2</label><input value={storage2} onChange={(e) => setStorage2(e.target.value)} placeholder="Ej: 1TB HDD" style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Tarjeta gráfica</label><input value={graphicsCard} onChange={(e) => setGraphicsCard(e.target.value)} placeholder="Ej: NVIDIA GTX 1650" style={fieldStyle} /></div>
                    {type === "laptop" && <div><label style={labelStyle}>Pantalla</label><input value={screenSize} onChange={(e) => setScreenSize(e.target.value)} placeholder='Ej: 15.6" FHD IPS' style={fieldStyle} /></div>}
                    <div><label style={labelStyle}>Sistema Operativo</label><input value={os} onChange={(e) => setOs(e.target.value)} placeholder="Ej: Windows 11 Pro" style={fieldStyle} /></div>
                    {type === "desktop" && <>
                      <div><label style={labelStyle}>Gabinete *</label><input value={cabinet} onChange={(e) => setCabinet(e.target.value)} placeholder="Ej: Corsair 4000D" style={fieldStyle} /></div>
                      <div><label style={labelStyle}>Placa madre</label><input value={motherboard} onChange={(e) => setMotherboard(e.target.value)} placeholder="Ej: ASUS PRIME B550M-A" style={fieldStyle} /></div>
                      <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Fuente de poder</label><input value={powerSupply} onChange={(e) => setPowerSupply(e.target.value)} placeholder="Ej: EVGA 650W 80+ Gold" style={fieldStyle} /></div>
                    </>}
                  </div>
                </div>

                {/* Accessories */}
                <div><label style={labelStyle}>🎒 Accesorios extras</label><input value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="Ej: Mouse, teclado, cargador, mochila, monitor..." style={fieldStyle} /></div>

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Precio (Bs.)</label><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" type="number" style={fieldStyle} /></div>
                </div>
                <div><label style={labelStyle}>Notas / Observaciones</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles adicionales, estado de la batería, daños, etc." rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={resetForm} style={{ padding: "10px 20px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                  <button onClick={saveItem} disabled={uploading} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: uploading ? "wait" : "pointer", flex: 1 }}>{editingId ? "💾 Guardar" : "＋ Agregar Equipo"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DETAIL MODAL ═══ */}
        {viewDetail && (() => {
          const eq = viewDetail;
          const cond = getCondition(eq.condition);
          const imgs = parseImages(eq.image);
          const dName = getDisplayName(eq);
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
              <div style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{eq.type === "laptop" ? "💻" : "🖥️"} {dName}</h3>
                    {eq.code && <span style={{ fontSize: 11, fontWeight: 800, color: "#0891b2", padding: "3px 10px", borderRadius: 6, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", fontFamily: "monospace", letterSpacing: "0.3px" }}>{eq.code}</span>}
                  </div>
                  <button onClick={() => setViewDetail(null)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
                {imgs.length > 0 && (
                  <div style={{ display: "flex", gap: 8, padding: "16px 20px", overflowX: "auto" }}>
                    {(imgs || []).map((img, idx) => (<img key={idx} src={img} alt="" onClick={() => setViewImage(img)} style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 10, cursor: "pointer", border: "2px solid var(--border)", flexShrink: 0 }} />))}
                  </div>
                )}
                <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: eq.type === "laptop" ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)", color: eq.type === "laptop" ? "#8b5cf6" : "#0891b2" }}>{eq.type === "laptop" ? "💻 Laptop" : "🖥️ Escritorio"}</span>
                    <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${cond.color}15`, color: cond.color }}>{cond.icon} {cond.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>Bs. {Math.round(eq.price || 0).toLocaleString()}</div>

                  <div style={{ padding: "12px 14px", background: "var(--bg-tertiary)", borderRadius: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {eq.processor && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>CPU:</span> <span style={{ fontWeight: 600 }}>{eq.processor}</span></div>}
                    {eq.ram && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>RAM:</span> <span style={{ fontWeight: 600 }}>{eq.ram}</span></div>}
                    {eq.storage && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>Disco 1:</span> <span style={{ fontWeight: 600 }}>{eq.storage}</span></div>}
                    {eq.storage2 && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>Disco 2:</span> <span style={{ fontWeight: 600 }}>{eq.storage2}</span></div>}
                    {eq.graphicsCard && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>GPU:</span> <span style={{ fontWeight: 600 }}>{eq.graphicsCard}</span></div>}
                    {eq.screenSize && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>Pantalla:</span> <span style={{ fontWeight: 600 }}>{eq.screenSize}</span></div>}
                    {eq.os && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>SO:</span> <span style={{ fontWeight: 600 }}>{eq.os}</span></div>}
                    {eq.cabinet && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>Gabinete:</span> <span style={{ fontWeight: 600 }}>{eq.cabinet}</span></div>}
                    {eq.motherboard && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>Placa madre:</span> <span style={{ fontWeight: 600 }}>{eq.motherboard}</span></div>}
                    {eq.powerSupply && <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}>Fuente:</span> <span style={{ fontWeight: 600 }}>{eq.powerSupply}</span></div>}
                  </div>
                  {eq.accessories && <div style={{ padding: "10px 14px", background: "rgba(139,92,246,0.05)", borderRadius: 10, border: "1px solid rgba(139,92,246,0.1)", fontSize: 12, color: "var(--text-secondary)" }}>🎒 <strong>Accesorios:</strong> {eq.accessories}</div>}
                  {eq.notes && <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.05)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.1)", fontSize: 12, color: "var(--text-secondary)" }}>📝 {eq.notes}</div>}
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Registrado: {new Date(eq.createdAt).toLocaleDateString("es-BO")}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <button onClick={() => { editItem(eq); setViewDetail(null); }} style={{ flex: "1 1 90px", padding: "10px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 10, color: "#1ab8c4", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
                    <button onClick={() => { window.open(`/equipment/print/${eq.id}`, "_blank"); }} style={{ flex: "1 1 110px", padding: "10px", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 10, color: "#0891b2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🏷️ Ficha</button>
                    <button onClick={() => { window.open(`/equipment/print/${eq.id}?mode=sticker`, "_blank"); }} style={{ flex: "1 1 110px", padding: "10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, color: "#10b981", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🏷️ Solo QR</button>
                    <button onClick={() => deleteItem(eq.id)} style={{ padding: "10px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️ Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ EQUIPMENT GRID ═══ */}
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No hay equipos registrados</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Agrega tu primer equipo de cómputo</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>＋ Agregar</button>
          </div>
        ) : (
          <div className="eq-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            {(filteredItems || []).map((item, i) => {
              const imgs = parseImages(item.image);
              const firstImg = imgs[0] || null;
              const cond = getCondition(item.condition);
              const dName = getDisplayName(item);
              const disks = [item.storage, item.storage2].filter(Boolean);
              return (
                <div key={item.id} onClick={() => setViewDetail(item)} style={{ background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", overflow: "hidden", animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`, cursor: "pointer", transition: "all 0.25s", position: "relative" }}>
                  <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${cond.color}20`, color: cond.color, backdropFilter: "blur(8px)" }}>{cond.icon} {cond.label}</div>
                  <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: item.type === "laptop" ? "rgba(139,92,246,0.85)" : "rgba(6,182,212,0.85)", color: "#fff", fontSize: 9, fontWeight: 700 }}>{item.type === "laptop" ? "💻 Laptop" : "🖥️ Desktop"}</div>
                  {imgs.length > 1 && <div style={{ position: "absolute", top: 34, right: 10, zIndex: 2, padding: "2px 6px", borderRadius: 5, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, fontWeight: 700 }}>📷 {imgs.length}</div>}
                  <div onClick={(e) => { e.stopPropagation(); if (firstImg) setViewImage(firstImg); }} style={{ width: "100%", height: 200, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    {firstImg ? (<img src={firstImg} alt={dName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{ fontSize: 48, opacity: 0.15 }}>{item.type === "laptop" ? "💻" : "🖥️"}</span><span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5 }}>Sin imagen</span></div>)}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 14px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Bs. {Math.round(item.price || 0).toLocaleString()}</div></div>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    {item.code && <div style={{ marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 800, color: "#0891b2", padding: "2px 8px", borderRadius: 6, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", fontFamily: "monospace", letterSpacing: "0.3px" }}>{item.code}</span></div>}
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>{dName}</h3>
                    
                    {/* Specs badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {item.processor && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.06)", fontSize: 10, color: "#2dd4df", fontWeight: 600 }}>⚡ {item.processor}</span>}
                      {item.ram && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)", fontSize: 10, color: "#10b981", fontWeight: 600 }}>🧠 {item.ram}</span>}
                      {(disks || []).map((d, di) => <span key={di} style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)", fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>💾 {d}</span>)}
                      {item.graphicsCard && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.1)", fontSize: 10, color: "#ec4899", fontWeight: 600 }}>🎮 {item.graphicsCard}</span>}
                      {item.os && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)", fontSize: 10, color: "#0891b2", fontWeight: 600 }}>🖥️ {item.os}</span>}
                      {item.screenSize && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.1)", fontSize: 10, color: "#a855f7", fontWeight: 600 }}>📐 {item.screenSize}</span>}
                      {item.cabinet && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.1)", fontSize: 10, color: "#e11d48", fontWeight: 600 }}>🏗️ {item.cabinet}</span>}
                      {item.motherboard && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.1)", fontSize: 10, color: "#14b8a6", fontWeight: 600 }}>🔌 {item.motherboard}</span>}
                      {item.powerSupply && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.1)", fontSize: 10, color: "#ea580c", fontWeight: 600 }}>⚡ {item.powerSupply}</span>}
                      {item.accessories && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)", fontSize: 10, color: "#8b5cf6", fontWeight: 600 }}>🎒 {item.accessories.length > 35 ? item.accessories.slice(0, 35) + "..." : item.accessories}</span>}
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); editItem(item); }} style={{ flex: 1, padding: "8px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", borderRadius: 8, color: "#1ab8c4", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️ Editar</button>
                      <button onClick={(e) => { e.stopPropagation(); window.open(`/equipment/print/${item.id}`, "_blank"); }} title="Ficha técnica" style={{ padding: "8px 10px", background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8, color: "#0891b2", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🏷️</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} style={{ padding: "8px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, outline: "none" };
