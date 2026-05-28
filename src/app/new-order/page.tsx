"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

const ACCESSORIES_LIST = ["Cargador", "Batería", "Disco Duro", "Memoria RAM", "Cable de Poder", "Pantalla", "Tornillos", "Maletín/Bolsa", "Otros"];
const ACCESSORIES_HINTS: Record<string, string> = { "Cargador": "Ej: 65W, USB-C, modelo...", "Batería": "Ej: 6 celdas, modelo...", "Disco Duro": "Ej: 500GB SSD, 1TB HDD...", "Memoria RAM": "Ej: 8GB DDR4, 16GB DDR5...", "Cable de Poder": "Ej: 3 pines, tipo...", "Pantalla": "Ej: 15.6\", táctil...", "Tornillos": "Ej: completo, incompleto, cantidad...", "Maletín/Bolsa": "Ej: color, tamaño...", "Otros": "Especificar qué accesorios..." };

interface ServiceItem { id: string; name: string; price: number; icon: string; }
interface SoftwareItem { id: string; name: string; category: string | null; image: string | null; }
interface VideogameItem { id: string; name: string; platform: string | null; genre: string | null; image: string | null; }

export default function NewOrderPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [device, setDevice] = useState(""); const [brand, setBrand] = useState(""); const [model, setModel] = useState("");
  const [issue, setIssue] = useState(""); const [cost, setCost] = useState(""); const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState(""); const [clientPhone, setClientPhone] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false); const [saving, setSaving] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]); const [accessoryDetails, setAccessoryDetails] = useState<Record<string, string>>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]); const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]); const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([]);
  const [selectedVideogames, setSelectedVideogames] = useState<string[]>([]); const [videogamesList, setVideogamesList] = useState<VideogameItem[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]); const [imagePreviews, setImagePreviews] = useState<string[]>([]);
 const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [techniciansList, setTechniciansList] = useState<{ id: string; name: string }[]>([]);
  const [showServices, setShowServices] = useState(false); const [showSoftware, setShowSoftware] = useState(false); const [showVideogames, setShowVideogames] = useState(false);
  const [searchServices, setSearchServices] = useState(""); const [searchSoftware, setSearchSoftware] = useState(""); const [searchVideogames, setSearchVideogames] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });
  const toggleAcc = (acc: string) => { setSelectedAccessories(prev => { if (prev.includes(acc)) { setAccessoryDetails(d => { const copy = { ...d }; delete copy[acc]; return copy; }); return prev.filter(a => a !== acc); } return [...prev, acc]; }); };
  const updateDetail = (acc: string, detail: string) => { setAccessoryDetails(prev => ({ ...prev, [acc]: detail })); };
  const toggleService = (serviceName: string) => { setSelectedServices(prev => { const next = prev.includes(serviceName) ? prev.filter(s => s !== serviceName) : [...prev, serviceName]; const total = next.reduce((sum, name) => { const svc = servicesList.find(s => s.name === name); return sum + (svc?.price || 0); }, 0); setCost(String(total)); return next; }); };
  const toggleSoftware = (name: string) => { setSelectedSoftware(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]); };
  const toggleVideogame = (name: string) => { setSelectedVideogames(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]); };
  const buildAccessoriesArray = (): string[] => { return selectedAccessories.map(acc => { const detail = accessoryDetails[acc]?.trim(); return detail ? `${acc} (${detail})` : acc; }); };

  const filteredServices = servicesList.filter(s => searchServices === "" || s.name.toLowerCase().includes(searchServices.toLowerCase()));
  const filteredSoftware = softwareList.filter(s => searchSoftware === "" || s.name.toLowerCase().includes(searchSoftware.toLowerCase()) || (s.category || "").toLowerCase().includes(searchSoftware.toLowerCase()));
  const filteredVideogames = videogamesList.filter(v => searchVideogames === "" || v.name.toLowerCase().includes(searchVideogames.toLowerCase()) || (v.platform || "").toLowerCase().includes(searchVideogames.toLowerCase()) || (v.genre || "").toLowerCase().includes(searchVideogames.toLowerCase()));

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    const token = sessionStorage.getItem("token"); const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const parsedUser = (() => { try { return JSON.parse(userData); } catch { return null; } })(); setUser(parsedUser);
    // Load branches for superadmin
    if (parsedUser.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(parsedUser.branchId || ""); }

    if (parsedUser.role !== "admin" && parsedUser.role !== "superadmin") { router.push("/dashboard"); return; }
    apiFetch("/api/services").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setServicesList(data); }).catch(() => {});
    apiFetch("/api/software").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setSoftwareList(data); }).catch(() => {});
    apiFetch("/api/videogames").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setVideogamesList(data); }).catch(() => {});
    apiFetch("/api/technicians", { }).then(res => res.json()).then(data => { if (Array.isArray(data)) setTechniciansList(data); }).catch(() => {});
    const savedForm = sessionStorage.getItem("newOrderForm");
    if (savedForm) { try { const data = (() => { try { return JSON.parse(savedForm); } catch { return null; } })(); setDevice(data.device || ""); setBrand(data.brand || ""); setModel(data.model || ""); setIssue(data.issue || ""); setCost(data.cost || ""); setNotes(data.notes || ""); setClientName(data.clientName || ""); setClientPhone(data.clientPhone || ""); setSelectedAccessories(data.selectedAccessories || []); setAccessoryDetails(data.accessoryDetails || {}); setSelectedServices(data.selectedServices || []); setSelectedSoftware(data.selectedSoftware || []); setSelectedVideogames(data.selectedVideogames || []); setImageUrls(data.imageUrls || []); setImagePreviews(data.imagePreviews || []); } catch {} sessionStorage.removeItem("newOrderForm"); }
    const capturedData = sessionStorage.getItem("capturedImage");
    if (capturedData) { try { const { url, preview } = (() => { try { return JSON.parse(capturedData); } catch { return {}; } })(); setImageUrls(prev => [...prev, url]); setImagePreviews(prev => [...prev, preview]); sileo.success({ title: "Foto capturada" }); } catch {} sessionStorage.removeItem("capturedImage"); }
  }, []);

  const saveFormToSession = () => { sessionStorage.setItem("newOrderForm", JSON.stringify({ device, brand, model, issue, cost, notes, clientName, clientPhone, selectedAccessories, accessoryDetails, selectedServices, selectedSoftware, selectedVideogames, imageUrls, imagePreviews })); };

  // Autocomplete de cliente: busca al escribir el teléfono o nombre
  useEffect(() => {
    const q = clientPhone.trim() || clientName.trim();
    if (q.length < 3) { setClientSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/clients?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const d = await res.json();
          setClientSuggestions((d.clients || []).slice(0, 5));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [clientPhone, clientName]);

  const pickSuggestion = (c: any) => {
    setClientName(c.name); setClientPhone(c.phone);
    setShowSuggestions(false); setClientSuggestions([]);
  };
  const uploadFiles = async (files: FileList) => { setUploading(true); for (let i = 0; i < files.length; i++) { const file = files[i]; const reader = new FileReader(); reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(file); const formData = new FormData(); formData.append("file", file); try { const res = await apiFetch("/api/upload", { method: "POST", body: formData }); if (res.ok) { const data = await res.json(); setImageUrls(prev => [...prev, data.url]); } } catch {} } sileo.success({ title: `${files.length} imagen${files.length > 1 ? "es subidas" : " subida"}` }); setUploading(false); };
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files || files.length === 0) return; await uploadFiles(files); e.target.value = ""; };
  const handleTakePhoto = () => { saveFormToSession(); sessionStorage.setItem("cameraReturnUrl", "/new-order"); window.location.href = "/camera.html"; };
  const removeImage = (index: number) => { setImageUrls(prev => prev.filter((_, i) => i !== index)); setImagePreviews(prev => prev.filter((_, i) => i !== index)); };

  const createRepair = async (e: React.FormEvent) => {
    e.preventDefault(); const token = sessionStorage.getItem("token"); if (!token) return; setSaving(true);
    try {
      const imageData = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null; const accArray = buildAccessoriesArray();
      const servicesNote = selectedServices.length > 0 ? `Servicios: ${selectedServices.join(", ")}` : "";
      const softwareNote = selectedSoftware.length > 0 ? `Programas: ${selectedSoftware.join(", ")}` : "";
      const videogamesNote = selectedVideogames.length > 0 ? `Videojuegos: ${selectedVideogames.join(", ")}` : "";
      const finalNotes = [notes, servicesNote, softwareNote, videogamesNote].filter(Boolean).join(" | ");
      const res = await apiFetch("/api/repairs", { method: "POST", body: JSON.stringify({ device, brand, model, issue, priority: "media", estimatedCost: parseFloat(cost) || 0, notes: finalNotes || null, clientName, clientPhone, clientEmail: "", image: imageData, accessories: accArray.length > 0 ? JSON.stringify(accArray) : null, technicianId: technicianId || null }) });
      if (res.ok) { const nr = await res.json(); sileo.success({ title: `Orden ${nr.code} creada` }); sessionStorage.removeItem("newOrderForm"); setTimeout(() => router.push("/dashboard"), 800); } else { sileo.error({ title: "Error al crear la orden" }); }
    } catch { sileo.error({ title: "Error de conexión" }); } setSaving(false);
  };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", paddingLeft: 200 }}>
<style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(80px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expandIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 60px; } }
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

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeIn 0.4s ease-out" }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, #1ab8c4, #149aa5)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16, boxShadow: "0 8px 30px rgba(26,184,196,0.14)" }}>📝</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Nueva Orden de Trabajo</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>Completa los datos para registrar el equipo</p>
        </div>

        <form onSubmit={createRepair} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.5s ease-out" }}>
          {/* FOTOS */}
          <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>📷 Fotos del equipo</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              {(imagePreviews || []).map((preview, idx) => (
                <div key={idx} style={{ width: 110, height: 110, borderRadius: 12, overflow: "hidden", position: "relative", border: "2px solid #1ab8c4", flexShrink: 0 }}>
                  <img src={preview} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => removeImage(idx)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  {uploading && idx === imagePreviews.length - 1 && <div style={{ position: "absolute", inset: 0, background: "rgba(26,29,46,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>...</div></div>}
                </div>
              ))}
              <div onClick={() => fileInputRef.current?.click()} style={{ width: 110, height: 110, borderRadius: 12, border: "2px dashed var(--border)", background: "var(--bg-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 26 }}>＋</span><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Subir foto</span></div>
              <div onClick={handleTakePhoto} style={{ width: 110, height: 110, borderRadius: 12, border: "2px dashed rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 26 }}>📸</span><span style={{ fontSize: 10, color: "#10b981" }}>Cámara</span></div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: "none" }} />
            </div>
            {imagePreviews.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>📷 {imagePreviews.length} foto{imagePreviews.length > 1 ? "s" : ""}</div>}
          </div>

          {/* CLIENTE */}
          <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(26,184,196,0.07)", position: "relative" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2dd4df", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              👤 Datos del Cliente
              {clientSuggestions.length > 0 && <span style={{ fontSize: 9, padding: "2px 8px", background: "rgba(16,185,129,0.12)", color: "#10b981", borderRadius: 6, fontWeight: 700 }}>💡 {clientSuggestions.length} cliente{clientSuggestions.length > 1 ? "s" : ""} frecuente{clientSuggestions.length > 1 ? "s" : ""}</span>}
            </div>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>Nombre del cliente *</label>
                <input value={clientName} onChange={(e) => { setClientName(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} placeholder="Ej: Juan Pérez" required style={fieldStyle} />
              </div>
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>Celular *</label>
                <input value={clientPhone} onChange={(e) => { setClientPhone(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} placeholder="Ej: 70012345" required style={fieldStyle} />
              </div>
            </div>
            {/* Dropdown sugerencias */}
            {showSuggestions && clientSuggestions.length > 0 && (
              <div style={{ marginTop: 10, background: "var(--bg-tertiary)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 8, maxHeight: 220, overflow: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px", borderBottom: "1.5px solid #cbd5e8", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", fontWeight: 700 }}>💡 Clientes frecuentes encontrados — click para autocompletar</span>
                  <button type="button" onClick={() => setShowSuggestions(false)} style={{ fontSize: 9, padding: "2px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", cursor: "pointer" }}>Ocultar</button>
                </div>
                {(clientSuggestions || []).map((c: any) => (
                  <div key={c.phoneKey} onClick={() => pickSuggestion(c)} style={{ padding: "8px 10px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1ab8c4,#2dd4df)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{c.name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("") || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>📱 {c.phone}</div>
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>
                      <div style={{ color: "#1ab8c4", fontWeight: 700 }}>{c.totalRepairs} OTs</div>
                      <div style={{ color: "#10b981", fontWeight: 700 }}>Bs. {(c.totalSpent || 0).toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ASIGNAR TÉCNICO */}
          <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(168,85,247,0.12)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>🔧 Asignar Técnico</div>
            {techniciansList.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No hay técnicos registrados. Registra usuarios con rol "tech" para asignar.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {techniciansList.map(tech => {
                  const isSelected = technicianId === tech.id;
                  return (
                    <div key={tech.id} onClick={() => setTechnicianId(isSelected ? "" : tech.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `2px solid ${isSelected ? "#a855f7" : "var(--border)"}`, background: isSelected ? "rgba(168,85,247,0.08)" : "var(--bg-tertiary)", transition: "all 0.15s" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isSelected ? "linear-gradient(135deg, #a855f7, #149aa5)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: isSelected ? "#fff" : "var(--text-muted)", border: isSelected ? "none" : "1px solid var(--border)" }}>
                        {tech.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#a855f7" : "var(--text-primary)" }}>{tech.name}</div>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: isSelected ? "none" : "2px solid var(--border)", background: isSelected ? "#a855f7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800 }}>{isSelected ? "✓" : ""}</div>
                    </div>
                  );
                })}
                {!technicianId && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Opcional — puedes asignar después desde el panel</p>}
              </div>
            )}
          </div>

          {/* EQUIPO */}
          <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(245,158,11,0.12)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>💻 Datos del Equipo</div>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div><label style={labelStyle}>Tipo de dispositivo *</label><input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Laptop, PC, Tablet..." required style={fieldStyle} /></div>
              <div><label style={labelStyle}>Marca *</label><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="HP, Dell, Lenovo..." required style={fieldStyle} /></div>
              <div><label style={labelStyle}>Modelo</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Pavilion 15, ThinkPad..." style={fieldStyle} /></div>
            </div>
          </div>

          {/* ACCESORIOS */}
          <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.12)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>🎒 Accesorios que entrega el cliente</div>
            <div translate="no" className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {(ACCESSORIES_LIST || []).map((acc) => {
                const checked = selectedAccessories.includes(acc); const hint = ACCESSORIES_HINTS[acc]; const detail = accessoryDetails[acc] || "";
                return (
                  <div key={acc} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    <div onClick={() => toggleAcc(acc)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderTop: `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderLeft: `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderRight: `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderBottom: checked && hint ? "1px solid rgba(16,185,129,0.2)" : `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderRadius: checked && hint ? "12px 12px 0 0" : 12, background: checked ? "rgba(16,185,129,0.1)" : "var(--bg-tertiary)", userSelect: "none", transition: "all 0.15s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: checked ? "none" : "2px solid var(--border)", background: checked ? "#10b981" : "transparent", color: "#fff", fontSize: 12, fontWeight: 800 }}>{checked ? "✓" : ""}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? "#10b981" : "var(--text-muted)" }}>{acc}</span>
                    </div>
                    {checked && hint && (<div style={{ borderRadius: "0 0 12px 12px", borderLeft: "2px solid #10b981", borderRight: "2px solid #10b981", borderBottom: "2px solid #10b981", background: "rgba(16,185,129,0.05)", padding: "8px 10px", animation: "expandIn 0.2s ease-out" }}><input value={detail} onChange={(e) => updateDetail(acc, e.target.value)} placeholder={hint} onClick={(e) => e.stopPropagation()} style={{ width: "100%", padding: "6px 8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 6, color: "var(--text-primary)", fontSize: 11, outline: "none" }} /></div>)}
                  </div>
                );
              })}
            </div>
            {selectedAccessories.length > 0 && (<div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(16,185,129,0.04)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.1)" }}><div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>✓ {selectedAccessories.length} accesorio{selectedAccessories.length > 1 ? "s" : ""}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(selectedAccessories || []).map(acc => { const detail = accessoryDetails[acc]?.trim(); return <span key={acc} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>{acc}{detail ? ` (${detail})` : ""}</span>; })}</div></div>)}
          </div>

          {/* PROBLEMA + OBSERVACIONES */}
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>🔧 Problema Reportado</div>
              <label style={labelStyle}>Descripción del problema *</label>
              <textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe el problema que presenta el equipo..." required rows={5} style={{ ...fieldStyle, resize: "vertical" }} />
            </div>
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(245,158,11,0.12)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>📋 Observaciones del Equipo</div>
              <label style={labelStyle}>Estado físico, detalles visibles</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Rayones en la tapa, tecla F5 suelta, bisagra floja..." rows={5} style={{ ...fieldStyle, resize: "vertical" }} />
            </div>
          </div>

          {/* SERVICIOS */}
          {servicesList.length > 0 && (
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${showServices ? "rgba(168,85,247,0.25)" : "rgba(168,85,247,0.12)"}`, transition: "all 0.2s" }}>
              <div onClick={() => setShowServices(!showServices)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", display: "flex", alignItems: "center", gap: 8 }}>🛠️ Servicios y Costos {selectedServices.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(168,85,247,0.15)", color: "#c084fc", fontWeight: 800 }}>{selectedServices.length}</span>}</div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Selecciona los servicios a realizar</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: showServices ? "rgba(168,85,247,0.15)" : "var(--bg-tertiary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#a855f7", transition: "all 0.2s", transform: showServices ? "rotate(180deg)" : "none" }}>▾</div>
              </div>
              {selectedServices.length > 0 && !showServices && (
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(selectedServices || []).map(name => { const svc = servicesList.find(s => s.name === name); return <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7" }}>{svc?.icon} {name} — Bs.{svc?.price}</span>; })}
                </div>
              )}
              {showServices && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: 8, padding: "0 12px", border: "1px solid var(--border)", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔍</span>
                    <input value={searchServices} onChange={(e) => setSearchServices(e.target.value)} placeholder="Buscar servicio..." style={{ flex: 1, border: "none", background: "none", padding: "9px 0", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                    {searchServices && <span onClick={() => setSearchServices("")} style={{ cursor: "pointer", fontSize: 11, color: "var(--text-muted)" }}>✕</span>}
                  </div>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 280, overflow: "auto" }}>
                    {(filteredServices || []).map((svc) => { const active = selectedServices.includes(svc.name); return (
                      <div key={svc.id || svc.name} onClick={() => toggleService(svc.name)} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#a855f7" : "var(--border)"}`, background: active ? "rgba(168,85,247,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#a855f7" : "transparent", color: "#fff", fontSize: 11, fontWeight: 800 }}>{active ? "✓" : ""}</div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, color: active ? "#a855f7" : "var(--text-muted)", lineHeight: 1.3 }}>{svc.icon} {svc.name}</div><div style={{ fontSize: 12, fontWeight: 800, color: active ? "#c084fc" : "var(--text-muted)", marginTop: 2 }}>Bs. {svc.price}</div></div>
                      </div>
                    ); })}
                  </div>
                  {filteredServices.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No se encontraron servicios</div>}
                </div>
              )}
            </div>
          )}

          {/* PROGRAMAS */}
          {softwareList.length > 0 && (
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${showSoftware ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)"}`, transition: "all 0.2s" }}>
              <div onClick={() => setShowSoftware(!showSoftware)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6", display: "flex", alignItems: "center", gap: 8 }}>💿 Programas a Instalar {selectedSoftware.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(139,92,246,0.15)", color: "#7c3aed", fontWeight: 800 }}>{selectedSoftware.length}</span>}</div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Selecciona los programas a instalar</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: showSoftware ? "rgba(139,92,246,0.15)" : "var(--bg-tertiary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#8b5cf6", transition: "all 0.2s", transform: showSoftware ? "rotate(180deg)" : "none" }}>▾</div>
              </div>
              {selectedSoftware.length > 0 && !showSoftware && (
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(selectedSoftware || []).map(name => <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#8b5cf6" }}>{name}</span>)}
                </div>
              )}
              {showSoftware && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: 8, padding: "0 12px", border: "1px solid var(--border)", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔍</span>
                    <input value={searchSoftware} onChange={(e) => setSearchSoftware(e.target.value)} placeholder="Buscar programa..." style={{ flex: 1, border: "none", background: "none", padding: "9px 0", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                    {searchSoftware && <span onClick={() => setSearchSoftware("")} style={{ cursor: "pointer", fontSize: 11, color: "var(--text-muted)" }}>✕</span>}
                  </div>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 280, overflow: "auto" }}>
                    {(filteredSoftware || []).map((sw) => { const active = selectedSoftware.includes(sw.name); return (
                      <div key={sw.id} onClick={() => toggleSoftware(sw.name)} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#8b5cf6" : "var(--border)"}`, background: active ? "rgba(139,92,246,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#8b5cf6" : "transparent", color: "#fff", fontSize: 11, fontWeight: 800 }}>{active ? "✓" : ""}</div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, color: active ? "#8b5cf6" : "var(--text-muted)", lineHeight: 1.3 }}>{sw.name}</div>{sw.category && <div style={{ fontSize: 9, color: active ? "#7c3aed" : "var(--text-muted)", marginTop: 1 }}>{sw.category}</div>}</div>
                      </div>
                    ); })}
                  </div>
                  {filteredSoftware.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No se encontraron programas</div>}
                </div>
              )}
            </div>
          )}

          {/* VIDEOJUEGOS */}
          {videogamesList.length > 0 && (
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${showVideogames ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.12)"}`, transition: "all 0.2s" }}>
              <div onClick={() => setShowVideogames(!showVideogames)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>🎮 Videojuegos a Instalar {selectedVideogames.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(239,68,68,0.15)", color: "#f87171", fontWeight: 800 }}>{selectedVideogames.length}</span>}</div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Selecciona los videojuegos a instalar</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: showVideogames ? "rgba(239,68,68,0.15)" : "var(--bg-tertiary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#ef4444", transition: "all 0.2s", transform: showVideogames ? "rotate(180deg)" : "none" }}>▾</div>
              </div>
              {selectedVideogames.length > 0 && !showVideogames && (
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(selectedVideogames || []).map(name => <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>{name}</span>)}
                </div>
              )}
              {showVideogames && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: 8, padding: "0 12px", border: "1px solid var(--border)", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔍</span>
                    <input value={searchVideogames} onChange={(e) => setSearchVideogames(e.target.value)} placeholder="Buscar videojuego..." style={{ flex: 1, border: "none", background: "none", padding: "9px 0", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                    {searchVideogames && <span onClick={() => setSearchVideogames("")} style={{ cursor: "pointer", fontSize: 11, color: "var(--text-muted)" }}>✕</span>}
                  </div>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 280, overflow: "auto" }}>
                    {(filteredVideogames || []).map((vg) => { const active = selectedVideogames.includes(vg.name); return (
                      <div key={vg.id} onClick={() => toggleVideogame(vg.name)} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#ef4444" : "var(--border)"}`, background: active ? "rgba(239,68,68,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#ef4444" : "transparent", color: "#fff", fontSize: 11, fontWeight: 800 }}>{active ? "✓" : ""}</div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, color: active ? "#ef4444" : "var(--text-muted)", lineHeight: 1.3 }}>{vg.name}</div>{(vg.platform || vg.genre) && <div style={{ fontSize: 9, color: active ? "#f87171" : "var(--text-muted)", marginTop: 1 }}>{[vg.platform, vg.genre].filter(Boolean).join(" · ")}</div>}</div>
                      </div>
                    ); })}
                  </div>
                  {filteredVideogames.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No se encontraron videojuegos</div>}
                </div>
              )}
            </div>
          )}

          {/* COSTO + SERVICIOS + SOFTWARE */}
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>💰 Costo Estimado</div>
              <label style={labelStyle}>Monto en Bolivianos</label>
              <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" type="number" style={fieldStyle} />
              {selectedServices.length > 0 && <div style={{ marginTop: 6, fontSize: 10, color: "#a855f7", fontWeight: 600 }}>💡 Calculado desde {selectedServices.length} servicio{selectedServices.length > 1 ? "s" : ""}</div>}
            </div>
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(168,85,247,0.12)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>🛠️ Servicios</div>
              {selectedServices.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}><div style={{ fontSize: 24, marginBottom: 4, opacity: 0.3 }}>🛠️</div>Sin servicios</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{(selectedServices || []).map(name => { const svc = servicesList.find(s => s.name === name); return (<div key={name} style={{ padding: "5px 8px", background: "rgba(168,85,247,0.06)", borderRadius: 6, border: "1px solid rgba(168,85,247,0.1)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#a855f7" }}>{svc?.icon} {name}</span></div>); })}</div>
              )}
            </div>
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(139,92,246,0.12)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>💿 Programas</div>
              {selectedSoftware.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}><div style={{ fontSize: 24, marginBottom: 4, opacity: 0.3 }}>💿</div>Sin programas</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{(selectedSoftware || []).map(name => (<div key={name} style={{ padding: "5px 8px", background: "rgba(139,92,246,0.06)", borderRadius: 6, border: "1px solid rgba(139,92,246,0.1)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#8b5cf6" }}>{name}</span></div>))}</div>
              )}
            </div>
            <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.12)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>🎮 Videojuegos</div>
              {selectedVideogames.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}><div style={{ fontSize: 24, marginBottom: 4, opacity: 0.3 }}>🎮</div>Sin videojuegos</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{(selectedVideogames || []).map(name => (<div key={name} style={{ padding: "5px 8px", background: "rgba(239,68,68,0.06)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.1)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444" }}>{name}</span></div>))}</div>
              )}
            </div>
          </div>

          {/* BOTONES */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, marginBottom: 40 }}>
            <button type="button" onClick={() => { sessionStorage.removeItem("newOrderForm"); router.push("/dashboard"); }} style={{ flex: 1, padding: "16px", background: "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", borderRadius: 14, color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Cancelar</button>
            <button type="submit" disabled={uploading || saving} style={{ flex: 1, padding: "16px", background: "linear-gradient(135deg, #1ab8c4, #149aa5)", border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15, cursor: (uploading || saving) ? "wait" : "pointer", boxShadow: "0 6px 24px rgba(26,184,196,0.20)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? "⏳ Guardando..." : "🔧 Crear Orden de Trabajo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "13px 16px", background: "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none" };