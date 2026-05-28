"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

interface SoftwareItem {
  id: string;
  name: string;
  category: string | null;
  size: string | null;
  description: string | null;
  language: string | null;
  rating: string | null;
  minRequirements: string | null;
  recRequirements: string | null;
  image: string | null;
  active: boolean;
}

const INITIAL_CATEGORIES = ["Programas", "Sistemas Operativos", "Drivers", "Utilidades", "Office", "Diseño", "Antivirus"];
const RATINGS = ["", "PEGI 3", "PEGI 7", "PEGI 12", "PEGI 16", "PEGI 18", "ESRB E", "ESRB E10+", "ESRB T", "ESRB M", "ESRB AO"];

function parseImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr; } catch {}
  return img.trim() ? [img] : [];
}

export default function SoftwarePage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [items, setItems] = useState<SoftwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [rating, setRating] = useState("");
  const [minRequirements, setMinRequirements] = useState("");
  const [recRequirements, setRecRequirements] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    try { const res = await apiFetch("/api/software"); if (res.ok) setItems(await res.json()); } catch {}
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
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(parsed.branchId || ""); }

    loadItems();
    apiFetch("/api/software/categories")
      .then(r => r.json())
      .then(d => {
        if (d.categories?.length) {
          setCategories(d.categories);
        } else {
          const saved = sessionStorage.getItem("softwareCategories");
          if (saved) try {
            const cats = JSON.parse(saved);
            if (Array.isArray(cats) && cats.length > 0) {
              setCategories(cats);
              apiFetch("/api/software/categories", {
                method: "POST",
                body: JSON.stringify({ categories: cats }),
              }).catch(() => {});
            }
          } catch {}
        }
      })
      .catch(() => {
        const saved = sessionStorage.getItem("softwareCategories");
        if (saved) try { setCategories(JSON.parse(saved)); } catch {}
      });

    const savedForm = sessionStorage.getItem("softwareFormData");
    if (savedForm) {
      try {
        const data = (() => { try { return JSON.parse(savedForm); } catch { return null; } })();
        setEditingId(data.editingId || null); setName(data.name || ""); setCategory(data.category || "");
        setSize(data.size || "");
        setDescription(data.description || ""); setLanguage(data.language || ""); setRating(data.rating || "");
        setMinRequirements(data.minRequirements || ""); setRecRequirements(data.recRequirements || "");
        setImageUrls(data.imageUrls || []); setImagePreviews(data.imagePreviews || []);
        setShowForm(true);
      } catch {}
      sessionStorage.removeItem("softwareFormData");
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

  const saveCategories = (cats: string[]) => {
    setCategories(cats);
    sessionStorage.setItem("softwareCategories", JSON.stringify(cats));
    apiFetch("/api/software/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: cats }) }).catch(() => {});
  };
  const addCategory = () => { const t = newCategoryName.trim(); if (!t) return; if (categories.includes(t)) { sileo.error({ title: "Ya existe" }); return; } saveCategories([...categories, t]); setNewCategoryName(""); sileo.success({ title: `"${t}" creada` }); };
  const deleteCategory = (idx: number) => { const cat = categories[idx]; if (!confirm(`¿Eliminar "${cat}"?`)) return; saveCategories(categories.filter((_, i) => i !== idx)); if (filterCategory === cat) setFilterCategory("all"); sileo.success({ title: `"${cat}" eliminada` }); };
  const saveEditCategory = (idx: number) => { const t = editingCatName.trim(); if (!t || t === categories[idx]) { setEditingCatIdx(null); return; } if (categories.includes(t)) { sileo.error({ title: "Ya existe" }); return; } const old = categories[idx]; const u = [...categories]; u[idx] = t; saveCategories(u); if (filterCategory === old) setFilterCategory(t); setEditingCatIdx(null); sileo.success({ title: `Renombrada` }); };

  const resetForm = () => {
    setName(""); setCategory(""); setSize("");
    setDescription(""); setLanguage(""); setRating("");
    setMinRequirements(""); setRecRequirements("");
    setImageUrls([]); setImagePreviews([]);
    setEditingId(null); setShowForm(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try { const res = await apiFetch("/api/upload", { method: "POST", body: formData }); if (res.ok) { const data = await res.json(); setImageUrls(prev => [...prev, data.url]); } } catch {}
    }
    sileo.success({ title: `${files.length} imagen${files.length > 1 ? "es subidas" : " subida"}` });
    setUploading(false);
    e.target.value = "";
  };

  const handleTakePhoto = () => {
    sessionStorage.setItem("softwareFormData", JSON.stringify({
      editingId, name, category, size, description, language, rating,
      minRequirements, recRequirements, imageUrls, imagePreviews,
    }));
    sessionStorage.setItem("cameraReturnUrl", "/software");
    window.location.href = "/camera.html";
  };

  const removeImage = (idx: number) => { setImageUrls(prev => prev.filter((_, i) => i !== idx)); setImagePreviews(prev => prev.filter((_, i) => i !== idx)); };

  const saveItem = async () => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    if (!name.trim()) { sileo.error({ title: "Nombre es requerido" }); return; }
    const imageData = imageUrls.length > 1 ? JSON.stringify(imageUrls) : imageUrls[0] || null;
    const payload = {
      name: name.trim(),
      category: category || null,
      size: size.trim() || null,
      description: description.trim() || null,
      language: language.trim() || null,
      rating: rating || null,
      minRequirements: minRequirements.trim() || null,
      recRequirements: recRequirements.trim() || null,
      image: imageData,
    };
    try {
      if (editingId) {
        const res = await apiFetch("/api/software", { method: "PATCH", body: JSON.stringify({ id: editingId, ...payload }) });
        if (res.ok) { sileo.success({ title: "Actualizado" }); resetForm(); loadItems(); }
      } else {
        const res = await apiFetch("/api/software", { method: "POST", body: JSON.stringify(payload) });
        if (res.ok) { sileo.success({ title: "Agregado" }); resetForm(); loadItems(); }
      }
    } catch { sileo.error({ title: "Error" }); }
  };

  const editItem = (item: SoftwareItem) => {
    setEditingId(item.id); setName(item.name); setCategory(item.category || "");
    setSize(item.size || "");
    setDescription(item.description || ""); setLanguage(item.language || ""); setRating(item.rating || "");
    setMinRequirements(item.minRequirements || ""); setRecRequirements(item.recRequirements || "");
    const imgs = parseImages(item.image);
    setImageUrls(imgs); setImagePreviews(imgs);
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("¿Eliminar este item?")) return;
    const token = sessionStorage.getItem("token"); if (!token) return;
    try { const res = await apiFetch("/api/software", { method: "DELETE", body: JSON.stringify({ id }) }); if (res.ok) { sileo.success({ title: "Eliminado" }); loadItems(); } } catch {}
  };

  const filteredItems = items.filter(item => {
    const matchSearch = searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const usedCategories = [...new Set(items.map(i => i.category).filter(Boolean))] as string[];

  const getCategoryColor = (cat: string | null): string => {
    if (!cat) return "#6b7280";
    const map: Record<string, string> = { "Programas": "#3b82f6", "Sistemas Operativos": "#10b981", "Drivers": "#f59e0b", "Utilidades": "#8b5cf6", "Office": "#0ea5e9", "Diseño": "#ec4899", "Antivirus": "#14b8a6" };
    return map[cat] || "#1ab8c4";
  };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingLeft: 210, paddingTop: 0 }}>
{viewImage && (
        <div onClick={() => setViewImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, cursor: "pointer" }}>
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
            <img src={viewImage} alt="Programa" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 20px 60px rgba(26,29,46,0.40)" }} />
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


      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Programas", value: items.length, icon: "🎮", color: "#8b5cf6" },
            { label: "Categorías", value: usedCategories.length, icon: "🏷️", color: "#10b981" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 18px", background: "#ffffff", borderRadius: 12, border: "1.5px solid #cbd5e8", borderTop: `4px solid ${s.color}`, boxShadow: "0 4px 18px rgba(30,42,58,0.10), 0 1px 3px rgba(30,42,58,0.05)", animation: `fadeIn 0.4s ease-out ${i * 0.06}s both`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 8, right: 12, fontSize: 28, opacity: 0.12 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 8, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", borderRadius: 10, padding: "0 14px", border: "1px solid var(--border)", flex: 1, maxWidth: 300 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>🔍</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar programa..." style={{ border: "none", background: "none", padding: "10px 0", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" }} />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="all">Todas las categorías</option>
              {(categories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCategoryPanel(!showCategoryPanel)} style={{ padding: "8px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏷️ Categorías</button>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "8px 14px", background: "linear-gradient(135deg, #8b5cf6, #149aa5)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>＋ Nuevo</button>
          </div>
        </div>

        {showCategoryPanel && (
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1px solid rgba(16,185,129,0.15)", marginBottom: 20, animation: "fadeScale 0.2s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>🏷️ Gestión de Categorías</h3>
              <button onClick={() => setShowCategoryPanel(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="Nueva categoría..." style={{ flex: 1, padding: "9px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
              <button onClick={addCategory} style={{ padding: "9px 16px", background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>＋ Crear</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(categories || []).map((cat, idx) => (
                <div key={idx} style={{ padding: "5px 8px", borderRadius: 8, background: `${getCategoryColor(cat)}10`, border: `1px solid ${getCategoryColor(cat)}25`, fontSize: 11, fontWeight: 600, color: getCategoryColor(cat), display: "flex", alignItems: "center", gap: 6 }}>
                  {editingCatIdx === idx ? (
                    <input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEditCategory(idx); if (e.key === "Escape") setEditingCatIdx(null); }} onBlur={() => saveEditCategory(idx)} autoFocus style={{ width: 100, padding: "2px 6px", background: "var(--bg-tertiary)", border: `1px solid ${getCategoryColor(cat)}`, borderRadius: 4, color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
                  ) : (<>{cat}<span onClick={() => { setEditingCatIdx(idx); setEditingCatName(cat); }} style={{ cursor: "pointer", fontSize: 10 }}>✏️</span><span onClick={() => deleteCategory(idx)} style={{ cursor: "pointer", fontSize: 10, color: "#ef4444", fontWeight: 800 }}>✕</span></>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(139,92,246,0.2)", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#8b5cf6" }}>{editingId ? "✏️ Editar Programa" : "＋ Nuevo Programa"}</h3>
                <button onClick={resetForm} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>📷 Imágenes / Portada</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(imagePreviews || []).map((preview, idx) => (
                      <div key={idx} style={{ width: 100, height: 130, borderRadius: 10, overflow: "hidden", position: "relative", border: "2px solid #8b5cf6", flexShrink: 0 }}>
                        <img src={preview} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeImage(idx)} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        {uploading && idx === imagePreviews.length - 1 && <div style={{ position: "absolute", inset: 0, background: "rgba(26,29,46,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>...</div></div>}
                      </div>
                    ))}
                    <div onClick={() => fileInputRef.current?.click()} style={{ width: 100, height: 130, borderRadius: 10, border: "2px dashed var(--border)", background: "var(--bg-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 24 }}>📷</span><span style={{ fontSize: 9, color: "var(--text-muted)" }}>Subir</span></div>
                    <div onClick={handleTakePhoto} style={{ width: 100, height: 130, borderRadius: 10, border: "2px dashed rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 24 }}>📸</span><span style={{ fontSize: 9, color: "#10b981" }}>Cámara</span></div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: "none" }} />
                  </div>
                </div>

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Nombre *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Windows 11 Pro, Adobe Photoshop..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Categoría</label><select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}><option value="">Sin categoría</option>{(categories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                  <div><label style={labelStyle}>💾 Peso</label><input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Ej: 50 GB, 1.2 GB..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>🌐 Idioma</label><input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Español, Inglés, Multi..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>🔞 Clasificación</label><select value={rating} onChange={(e) => setRating(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>{(RATINGS || []).map(r => <option key={r} value={r}>{r || "Sin clasificar"}</option>)}</select></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>📝 Descripción</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descripción del programa..." rows={3} style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>⚙️ Requisitos mínimos</label><textarea value={minRequirements} onChange={(e) => setMinRequirements(e.target.value)} placeholder="CPU: Intel i3 | RAM: 4GB | GPU: GTX 650..." rows={2} style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>⚡ Requisitos recomendados</label><textarea value={recRequirements} onChange={(e) => setRecRequirements(e.target.value)} placeholder="CPU: Intel i5 | RAM: 8GB | GPU: GTX 1060..." rows={2} style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={resetForm} style={{ padding: "10px 20px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                  <button onClick={saveItem} disabled={uploading} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #8b5cf6, #149aa5)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: uploading ? "wait" : "pointer", flex: 1 }}>{editingId ? "💾 Guardar" : "＋ Agregar"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No hay programas agregados</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Agrega juegos, programas y sistemas operativos</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #8b5cf6, #149aa5)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>＋ Agregar</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {(filteredItems || []).map((item, i) => {
              const imgs = parseImages(item.image);
              const firstImg = imgs[0] || null;
              const catColor = getCategoryColor(item.category);
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} onClick={() => setExpandedId(isExpanded ? null : item.id)} style={{ background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", overflow: "hidden", animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`, position: "relative", cursor: "pointer" }}>
                  {item.category && <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: `${catColor}dd`, color: "#fff", fontSize: 9, fontWeight: 700 }}>{item.category}</div>}
                  {item.size && <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, fontWeight: 700 }}>💾 {item.size}</div>}
                  {imgs.length > 1 && <div style={{ position: "absolute", ...(item.size ? { top: 34 } : { top: 10 }), right: 10, zIndex: 2, padding: "2px 6px", borderRadius: 5, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, fontWeight: 700 }}>📷 {imgs.length}</div>}

                  <div onClick={(e) => { if (firstImg) { e.stopPropagation(); setViewImage(firstImg); } }} style={{ width: "100%", height: 300, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", cursor: firstImg ? "pointer" : "default" }}>
                    {firstImg ? (<img src={firstImg} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{ fontSize: 48, opacity: 0.15 }}>🎮</span><span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5 }}>Sin imagen</span></div>)}
                  </div>

                  <div style={{ padding: "14px 16px" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>{item.name}</h3>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); editItem(item); }} style={{ flex: 1, padding: "8px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 8, color: "#8b5cf6", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️ Editar</button>
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
