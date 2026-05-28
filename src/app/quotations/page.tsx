"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

interface User { id: string; name: string; email: string; role: string; }
interface InventoryItemData { id: string; name: string; category: string | null; quantity: number; price: number; minStock: number; image: string | null; }
interface EquipmentData { id: string; name: string; type: string; brand: string | null; model: string | null; processor: string | null; ram: string | null; storage: string | null; price: number; condition: string; image: string | null; }
interface QuotationItem { inventoryId: string; name: string; price: number; qty: number; stock: number; isEquipment?: boolean; }
interface Quotation { id: string; code: string; type: "quotation" | "sale"; clientName: string; clientPhone: string; items: QuotationItem[]; total: number; notes: string; createdAt: string; }

export default function QuotationsPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [inventoryList, setInventoryList] = useState<InventoryItemData[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentData[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"quotation" | "sale">("quotation");
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<QuotationItem[]>([]);
  const [searchInventory, setSearchInventory] = useState("");
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [searchEquipment, setSearchEquipment] = useState("");
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);

  const [filterType, setFilterType] = useState<"all" | "quotation" | "sale">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });
  const [qPage, setQPage] = useState(1);
  const Q_PAGE_SIZE = 10;

  const filteredInventory = inventoryList.filter(item =>
    item.quantity > 0 && (searchInventory === "" || item.name.toLowerCase().includes(searchInventory.toLowerCase()) || (item.category || "").toLowerCase().includes(searchInventory.toLowerCase()))
  );

  const filteredEquipment = equipmentList.filter(item =>
    item.condition === "disponible" && (searchEquipment === "" || item.name.toLowerCase().includes(searchEquipment.toLowerCase()) || (item.brand || "").toLowerCase().includes(searchEquipment.toLowerCase()) || (item.model || "").toLowerCase().includes(searchEquipment.toLowerCase()))
  );

  const filteredQuotations = quotations.filter(q => {
    const matchType = filterType === "all" || q.type === filterType;
    const matchSearch = searchQuery === "" || q.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || q.clientPhone.includes(searchQuery) || q.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const qTotalPages = Math.ceil(filteredQuotations.length / Q_PAGE_SIZE);
  const paginatedQuotations = filteredQuotations.slice((qPage - 1) * Q_PAGE_SIZE, qPage * Q_PAGE_SIZE);
  const goQPage = (p: number) => { setQPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const total = selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const addItem = (inv: InventoryItemData) => {
    const existing = selectedItems.find(i => i.inventoryId === inv.id);
    if (existing) {
      if (existing.qty < inv.quantity) {
        setSelectedItems(prev => prev.map(i => i.inventoryId === inv.id ? { ...i, qty: i.qty + 1 } : i));
      } else { sileo.warning({ title: "Stock insuficiente" }); }
      return;
    }
    setSelectedItems(prev => [...prev, { inventoryId: inv.id, name: inv.name, price: inv.price, qty: 1, stock: inv.quantity }]);
  };

  const updateQty = (inventoryId: string, newQty: number) => {
    const item = selectedItems.find(i => i.inventoryId === inventoryId);
    if (!item) return;
    if (newQty <= 0) { removeItem(inventoryId); return; }
    const inv = inventoryList.find(i => i.id === inventoryId);
    const maxStock = inv?.quantity || item.stock;
    if (newQty > maxStock) { sileo.warning({ title: "Stock insuficiente" }); return; }
    setSelectedItems(prev => prev.map(i => i.inventoryId === inventoryId ? { ...i, qty: newQty } : i));
  };

  const removeItem = (inventoryId: string) => {
    setSelectedItems(prev => prev.filter(i => i.inventoryId !== inventoryId));
  };

  const addEquipment = (eq: EquipmentData) => {
    const existing = selectedItems.find(i => i.inventoryId === eq.id && i.isEquipment);
    if (existing) { sileo.warning({ title: "Equipo ya agregado" }); return; }
    setSelectedItems(prev => [...prev, { inventoryId: eq.id, name: eq.name, price: eq.price, qty: 1, stock: 1, isEquipment: true }]);
  };



  const openCreateModal = (type: "quotation" | "sale") => {
    setModalType(type); setEditingQuotation(null); setShowModal(true);
    setClientName(""); setClientPhone(""); setNotes("");
    setSelectedItems([]); setSearchInventory(""); setShowInventoryPicker(false); setSearchEquipment(""); setShowEquipmentPicker(false);
  };

  const openEditModal = (q: Quotation) => {
    setEditingQuotation(q); setModalType(q.type); setShowModal(true);
    setClientName(q.clientName); setClientPhone(q.clientPhone); setNotes(q.notes);
    setSelectedItems(q.items.map(item => ({ ...item })));
    setSearchInventory(""); setShowInventoryPicker(false); setSearchEquipment(""); setShowEquipmentPicker(false);
    setViewQuotation(null);
  };

  const reloadInventory = async () => {
    try { const res = await apiFetch("/api/inventory"); if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setInventoryList(data); } } catch {}
  };

  const loadQuotations = async () => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    try {
      const res = await apiFetch("/api/quotations", { });
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setQuotations(data); }
    } catch {}
    setLoading(false);
  };

  const restoreStock = async (items: QuotationItem[]) => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    for (const item of items) {
      if (item.isEquipment) continue;
      const inv = inventoryList.find(i => i.id === item.inventoryId);
      if (inv) {
        await apiFetch("/api/inventory", { method: "PATCH", body: JSON.stringify({ id: item.inventoryId, quantity: inv.quantity + item.qty }) });
      }
    }
    await reloadInventory();
  };

  const reduceStock = async (items: QuotationItem[]) => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    for (const item of items) {
      if (item.isEquipment) continue;
      const inv = inventoryList.find(i => i.id === item.inventoryId);
      if (inv) {
        if (inv.quantity < item.qty) { sileo.warning({ title: `Stock insuficiente para ${item.name}` }); return false; }
        await apiFetch("/api/inventory", { method: "PATCH", body: JSON.stringify({ id: item.inventoryId, quantity: inv.quantity - item.qty }) });
      }
    }
    await reloadInventory();
    return true;
  };

  const adjustStockByDiff = async (oldItems: QuotationItem[], newItems: QuotationItem[]) => {
    const token = sessionStorage.getItem("token"); if (!token) return false;
    const oldInv = oldItems.filter(i => !i.isEquipment);
    const newInv = newItems.filter(i => !i.isEquipment);
    // Calcular diferencias: positivo = devolver al stock, negativo = reducir del stock
    const diffs: { inventoryId: string; name: string; diff: number }[] = [];
    // Items que estaban antes
    for (const old of oldInv) {
      const updated = newInv.find(n => n.inventoryId === old.inventoryId);
      const newQty = updated ? updated.qty : 0; // Si fue eliminado, newQty = 0
      if (old.qty !== newQty) diffs.push({ inventoryId: old.inventoryId, name: old.name, diff: old.qty - newQty });
    }
    // Items nuevos que no existían antes
    for (const n of newInv) {
      if (!oldInv.find(o => o.inventoryId === n.inventoryId)) {
        diffs.push({ inventoryId: n.inventoryId, name: n.name, diff: -n.qty });
      }
    }
    if (diffs.length === 0) return true;
    // Verificar stock suficiente para los que necesitan reducir
    for (const d of diffs) {
      if (d.diff < 0) { // Necesita reducir stock
        const inv = inventoryList.find(i => i.id === d.inventoryId);
        if (inv && inv.quantity < Math.abs(d.diff)) { sileo.warning({ title: `Stock insuficiente para ${d.name}` }); return false; }
      }
    }
    // Aplicar cambios
    for (const d of diffs) {
      const inv = inventoryList.find(i => i.id === d.inventoryId);
      if (inv) {
        const newQuantity = inv.quantity + d.diff; // diff positivo = suma, negativo = resta
        await apiFetch("/api/inventory", { method: "PATCH", body: JSON.stringify({ id: d.inventoryId, quantity: newQuantity }) });
      }
    }
    await reloadInventory();
    return true;
  };

  const saveQuotation = async () => {
    if (selectedItems.length === 0) { sileo.warning({ title: "Agrega al menos un artículo" }); return; }
    if (!clientName.trim()) { sileo.warning({ title: "Ingresa el nombre del cliente" }); return; }
    const token = sessionStorage.getItem("token"); if (!token) return;

    if (editingQuotation) {
      // Editando una venta: ajustar stock solo por la diferencia
      if (editingQuotation.type === "sale" && modalType === "sale") {
        const ok = await adjustStockByDiff(editingQuotation.items, selectedItems);
        if (ok === false) return;
      }
      // Convirtiendo cotización a venta: reducir stock completo
      if (editingQuotation.type === "quotation" && modalType === "sale") {
        const ok = await reduceStock(selectedItems);
        if (ok === false) return;
      }
      try {
        const res = await apiFetch("/api/quotations", { method: "PATCH", body: JSON.stringify({ id: editingQuotation.id, type: modalType, clientName: clientName.trim(), clientPhone: clientPhone.trim(), items: selectedItems, total, notes: notes.trim(), code: editingQuotation.code }) });
        if (res.ok) { if (modalType === "sale") await markEquipmentSold(selectedItems); await loadQuotations(); setShowModal(false); sileo.success({ title: "Documento actualizado" }); }
      } catch {}
    } else {
      if (modalType === "sale") {
        const ok = await reduceStock(selectedItems);
        if (ok === false) return;
      }
      try {
        const res = await apiFetch("/api/quotations", { method: "POST", body: JSON.stringify({ type: modalType, clientName: clientName.trim(), clientPhone: clientPhone.trim(), items: selectedItems, total, notes: notes.trim() }) });
        if (res.ok) { if (modalType === "sale") await markEquipmentSold(selectedItems); await loadQuotations(); setShowModal(false); sileo.success({ title: modalType === "quotation" ? "Cotización creada" : "Nota de venta registrada" }); }
      } catch {}
    }
  };

  const deleteQuotation = async (q: Quotation) => {
    if (!confirm("¿Eliminar este documento?")) return;
    const token = sessionStorage.getItem("token"); if (!token) return;
    try {
      const res = await apiFetch(`/api/quotations?id=${q.id}`, { method: "DELETE" });
      if (res.ok) { await loadQuotations(); setViewQuotation(null); sileo.success({ title: "Documento eliminado" }); }
    } catch {}
  };

  const convertToSale = async (quotation: Quotation) => {
    if (!confirm("¿Convertir esta cotización en nota de venta? Se reducirá el stock.")) return;
    const token = sessionStorage.getItem("token"); if (!token) return;
    for (const item of quotation.items) {
      if (item.isEquipment) continue;
      const inv = inventoryList.find(i => i.id === item.inventoryId);
      if (inv && inv.quantity < item.qty) { sileo.warning({ title: `Stock insuficiente para ${item.name}` }); return; }
    }
    const ok = await reduceStock(quotation.items);
    if (ok === false) return;
    try {
      const res = await apiFetch("/api/quotations", { method: "PATCH", body: JSON.stringify({ id: quotation.id, type: "sale", code: quotation.code }) });
      if (res.ok) { await loadQuotations(); await markEquipmentSold(quotation.items); setViewQuotation(null); sileo.success({ title: "Cotización convertida a nota de venta" }); }
    } catch {}
  };

  // Marca equipos como vendidos cuando se convierte a venta o se crea venta con equipos
  const markEquipmentSold = async (items: QuotationItem[]) => {
    for (const item of items) {
      if (!item.isEquipment) continue;
      try { await apiFetch("/api/equipment", { method: "PATCH", body: JSON.stringify({ id: item.inventoryId, condition: "vendido" }) }); } catch {}
    }
    await reloadEquipment();
  };

  const reloadEquipment = async () => {
    try { const res = await apiFetch("/api/equipment"); if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setEquipmentList(data); } } catch {}
  };

  const printDocument = (q: Quotation) => {
    window.open(`/quotations/print/${q.code}?branchId=${activeBranch}`, "_blank");
  };

  // ═══ IMPRIMIR SOLO QR ═══
  const printQROnly = (q: Quotation) => {
    const urlType = q.type === "quotation" ? "cot" : "nv";
    const bid = activeBranch ? `?branchId=${activeBranch}` : "";
    window.open(`/print-qr/${urlType}/${q.code}${bid}`, "_blank");
  };

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const _u = (() => { try { return JSON.parse(userData); } catch { return null; } })(); setUser(_u);
    // Load branches for superadmin
    if (_u.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.ok ? r.json() : Promise.reject(r.status)).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(_u.branchId || ""); }

    apiFetch("/api/inventory").then(res => res.json()).then(data => { if (Array.isArray(data)) setInventoryList(data); }).catch(() => {});
    apiFetch("/api/equipment").then(res => res.json()).then(data => { if (Array.isArray(data)) setEquipmentList(data); }).catch(() => {});
    loadQuotations().then(() => {
      const params = new URLSearchParams(window.location.search);
      const viewCode = params.get("view");
      if (viewCode) {
        apiFetch(`/api/quotations?code=${viewCode}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setViewQuotation(d); }).catch(() => {});
      }
    });
  }, []);

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;
  const stats = { totalQuotations: quotations.filter(q => q.type === "quotation").length, totalSales: quotations.filter(q => q.type === "sale").length};

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingLeft: 210, paddingTop: 0 }}>
{/* ═══ MODAL CREAR / EDITAR ═══ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${modalType === "quotation" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: modalType === "quotation" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{modalType === "quotation" ? "📋" : "💰"}</div>
                  <div><h3 style={{ fontSize: 17, fontWeight: 700 }}>{editingQuotation ? "Editar" : "Nueva"} {modalType === "quotation" ? "Cotización" : "Nota de Venta"}</h3><p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{editingQuotation ? `Editando ${editingQuotation.code}` : modalType === "quotation" ? "Genera un presupuesto" : "Registra una venta"}</p></div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              {editingQuotation && (<div style={{ marginBottom: 20, display: "flex", gap: 8 }}>{(["quotation", "sale"] as const).map(t => { const active = modalType === t; const c = t === "quotation" ? "#f59e0b" : "#a855f7"; return (<button key={t} onClick={() => setModalType(t)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${active ? c : "var(--border)"}`, background: active ? `${c}15` : "var(--bg-tertiary)", color: active ? c : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{t === "quotation" ? "📋 Cotización" : "💰 Nota de Venta"}</button>); })}</div>)}
              <div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(26,184,196,0.04)", borderRadius: 12, border: "1px solid rgba(26,184,196,0.05)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2dd4df", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>👤 Datos del Cliente</div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>Nombre *</label><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Juan Pérez" style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Celular</label><input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="70012345" style={fieldStyle} /></div>
                </div>
              </div>
              <div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(245,158,11,0.04)", borderRadius: 12, border: `1px solid ${showInventoryPicker ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)"}` }}>
                <div onClick={() => setShowInventoryPicker(!showInventoryPicker)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>📦 Agregar Artículos {selectedItems.filter(i => !i.isEquipment).length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontWeight: 800 }}>{selectedItems.filter(i => !i.isEquipment).length}</span>}</div>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: showInventoryPicker ? "rgba(245,158,11,0.15)" : "var(--bg-tertiary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#f59e0b", transition: "all 0.2s", transform: showInventoryPicker ? "rotate(180deg)" : "none" }}>▾</div>
                </div>
                {showInventoryPicker && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-tertiary)", borderRadius: 6, padding: "0 10px", border: "1px solid var(--border)", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchInventory} onChange={(e) => setSearchInventory(e.target.value)} placeholder="Buscar artículo..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchInventory && <span onClick={() => setSearchInventory("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{(filteredInventory || []).map((item) => { const inCart = selectedItems.find(i => i.inventoryId === item.id && !i.isEquipment); return (<div key={item.id} onClick={() => addItem(item)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${inCart ? "#f59e0b" : "var(--border)"}`, background: inCart ? "rgba(245,158,11,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: inCart ? "none" : "2px solid var(--border)", background: inCart ? "#f59e0b" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{inCart ? inCart.qty : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: inCart ? "#f59e0b" : "var(--text-muted)", lineHeight: 1.2 }}>📦 {item.name}</div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span style={{ fontSize: 10, fontWeight: 800, color: inCart ? "#fbbf24" : "var(--text-muted)" }}>Bs. {item.price}</span><span style={{ fontSize: 9, color: item.quantity <= item.minStock ? "#ef4444" : "var(--text-muted)" }}>Stock: {item.quantity}</span></div></div></div>); })}</div>{filteredInventory.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No hay artículos disponibles</div>}</div>)}
              </div>

              {/* ═══ PICKER DE EQUIPOS ═══ */}
              <div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(59,130,246,0.04)", borderRadius: 12, border: `1px solid ${showEquipmentPicker ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)"}` }}>
                <div onClick={() => setShowEquipmentPicker(!showEquipmentPicker)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>💻 Agregar Equipos {selectedItems.filter(i => i.isEquipment).length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(59,130,246,0.15)", color: "#2563eb", fontWeight: 800 }}>{selectedItems.filter(i => i.isEquipment).length}</span>}</div>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: showEquipmentPicker ? "rgba(59,130,246,0.15)" : "var(--bg-tertiary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#3b82f6", transition: "all 0.2s", transform: showEquipmentPicker ? "rotate(180deg)" : "none" }}>▾</div>
                </div>
                {showEquipmentPicker && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-tertiary)", borderRadius: 6, padding: "0 10px", border: "1px solid var(--border)", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span>
                      <input value={searchEquipment} onChange={(e) => setSearchEquipment(e.target.value)} placeholder="Buscar equipo, marca, modelo..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
                      {searchEquipment && <span onClick={() => setSearchEquipment("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}
                    </div>
                    <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>
                      {(filteredEquipment || []).map((eq) => {
                        const inCart = selectedItems.find(i => i.inventoryId === eq.id && i.isEquipment);
                        const icon = eq.type === "laptop" ? "💻" : "🖥️";
                        return (
                          <div key={eq.id} onClick={() => addEquipment(eq)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${inCart ? "#3b82f6" : "var(--border)"}`, background: inCart ? "rgba(59,130,246,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: inCart ? "none" : "2px solid var(--border)", background: inCart ? "#3b82f6" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{inCart ? "✓" : ""}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: inCart ? "#3b82f6" : "var(--text-muted)", lineHeight: 1.2 }}>{icon} {eq.name}</div>
                              <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                                {eq.processor && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{eq.processor}</span>}
                                {eq.ram && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>· {eq.ram}</span>}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: inCart ? "#2563eb" : "var(--text-muted)" }}>Bs. {eq.price}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredEquipment.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No hay equipos disponibles</div>}
                  </div>
                )}
              </div>
              {selectedItems.length > 0 && (<div style={{ marginBottom: 20, padding: "14px 18px", background: "var(--bg-tertiary)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>🛒 Seleccionados</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{(selectedItems || []).map((item) => { const isEq = item.isEquipment; const color = isEq ? "#3b82f6" : "#f59e0b"; const icon = isEq ? "💻" : "📦"; return (<div key={(isEq ? "eq-" : "inv-") + item.inventoryId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${isEq ? "rgba(59,130,246,0.2)" : "var(--border)"}` }}><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{icon} {item.name}{isEq && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "#2563eb", fontWeight: 700, marginLeft: 6, textTransform: "uppercase" }}>Equipo</span>}</div><div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Bs. {item.price} {isEq ? "" : "c/u"}</div></div>{!isEq ? (<div style={{ display: "flex", alignItems: "center", gap: 6 }}><button onClick={() => updateQty(item.inventoryId, item.qty - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button><span style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{item.qty}</span><button onClick={() => updateQty(item.inventoryId, item.qty + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button></div>) : (<span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>único</span>)}<div style={{ textAlign: "right", minWidth: 70 }}><div style={{ fontSize: 13, fontWeight: 700, color }}>Bs. {(item.price * item.qty)}</div></div><button onClick={() => removeItem(item.inventoryId)} style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>); })}</div><div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 700 }}>Total:</span><span style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>Bs. {total}</span></div></div>)}
              <div style={{ marginBottom: 20 }}><label style={labelStyle}>📝 Notas (Opcional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones, condiciones, garantía..." rows={2} style={{ ...fieldStyle, resize: "vertical" }} /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "12px 24px", background: "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                <button onClick={saveQuotation} style={{ flex: 1, padding: "12px 28px", background: modalType === "quotation" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #a855f7, #7e22ce)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: modalType === "quotation" ? "0 4px 16px rgba(245,158,11,0.3)" : "0 4px 16px rgba(168,85,247,0.3)" }}>{editingQuotation ? "💾 Guardar Cambios" : modalType === "quotation" ? "📋 Crear Cotización" : "💰 Registrar Venta"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL VER DETALLE ═══ */}
      {viewQuotation && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${viewQuotation.type === "quotation" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: viewQuotation.type === "quotation" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{viewQuotation.type === "quotation" ? "📋" : "💰"}</div>
                  <div><h3 style={{ fontSize: 16, fontWeight: 700 }}>{viewQuotation.type === "quotation" ? "Cotización" : "Nota de Venta"}</h3><span style={{ fontFamily: "monospace", fontSize: 12, color: "#1ab8c4", fontWeight: 700 }}>{viewQuotation.code}</span></div>
                </div>
                <button onClick={() => setViewQuotation(null)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border)" }}><div style={{ fontSize: 9, color: "#2dd4df", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Cliente</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>👤 {viewQuotation.clientName}</div></div>
                <div style={{ padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border)" }}><div style={{ fontSize: 9, color: "#2dd4df", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Celular</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>📱 {viewQuotation.clientPhone || "—"}</div></div>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border)" }}><div style={{ fontSize: 9, color: "#2dd4df", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Fecha</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>📅 {new Date(viewQuotation.createdAt).toLocaleString("es-BO")}</div></div>
                <div style={{ padding: "12px 16px", background: viewQuotation.type === "quotation" ? "rgba(245,158,11,0.06)" : "rgba(168,85,247,0.06)", borderRadius: 10, border: `1px solid ${viewQuotation.type === "quotation" ? "rgba(245,158,11,0.15)" : "rgba(168,85,247,0.15)"}` }}><div style={{ fontSize: 9, color: viewQuotation.type === "quotation" ? "#f59e0b" : "#a855f7", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Tipo</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: viewQuotation.type === "quotation" ? "#f59e0b" : "#a855f7" }}>{viewQuotation.type === "quotation" ? "📋 Cotización" : "💰 Nota de Venta"}</div></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>🛒 Artículos y Equipos</div>
                {viewQuotation.items.map((item, idx) => { const isEq = item.isEquipment; const icon = isEq ? "💻" : "📦"; return (<div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: idx % 2 === 0 ? "var(--bg-tertiary)" : "transparent", borderRadius: 8, marginBottom: 2 }}><div><span style={{ fontSize: 12, fontWeight: 600 }}>{icon} {item.name}</span>{isEq && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "#2563eb", fontWeight: 700, marginLeft: 6, textTransform: "uppercase" }}>Equipo</span>}<span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>{isEq ? `Bs.${item.price}` : `×${item.qty} · Bs.${item.price} c/u`}</span></div><span style={{ fontSize: 13, fontWeight: 700, color: isEq ? "#3b82f6" : "#f59e0b" }}>Bs. {(item.price * item.qty)}</span></div>); })}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 15, fontWeight: 700 }}>Total:</span><span style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>Bs. {Math.round(viewQuotation.total || 0).toLocaleString()}</span></div>
              </div>
              {viewQuotation.notes && (<div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.05)", borderRadius: 10, borderLeft: "3px solid #f59e0b", marginBottom: 16 }}><div style={{ fontSize: 9, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Notas</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{viewQuotation.notes}</div></div>)}

              {/* ═══ BOTONES DE ACCIÓN ACTUALIZADOS ═══ */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openEditModal(viewQuotation)} style={{ padding: "10px 18px", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 10, color: "#1ab8c4", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
                {viewQuotation.type === "quotation" && <button onClick={() => convertToSale(viewQuotation)} style={{ padding: "10px 18px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, color: "#a855f7", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💰 Convertir a Venta</button>}
                <button onClick={() => printDocument(viewQuotation)} style={{ padding: "10px 18px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", borderRadius: 10, color: "#2dd4df", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Documento</button>
                <button onClick={() => printQROnly(viewQuotation)} style={{ padding: "10px 18px", background: viewQuotation.type === "quotation" ? "rgba(217,119,6,0.08)" : "rgba(168,85,247,0.08)", border: `1px solid ${viewQuotation.type === "quotation" ? "rgba(217,119,6,0.2)" : "rgba(168,85,247,0.2)"}`, borderRadius: 10, color: viewQuotation.type === "quotation" ? "#d97706" : "#a855f7", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📱 QR</button>
                <button onClick={() => deleteQuotation(viewQuotation)} style={{ padding: "10px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>🗑️ Eliminar</button>
              </div>
            </div>
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
      
        @media(max-width:768px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .form-grid,.info-grid,.detail-grid{grid-template-columns:1fr!important}
          .filter-wrap{flex-direction:column;align-items:stretch!important}
          .filter-btns{overflow-x:auto;flex-wrap:nowrap!important;padding-bottom:4px}
          .msg-layout{grid-template-columns:1fr!important}
          .hide-mobile{display:none!important}
          .data-grid-5{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>

      
      <AppSidebar user={user} />


      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 28 }}><h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>🧾 Cotizaciones y Notas de Venta</h1><p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Crea presupuestos y registra ventas con tu inventario</p></div>

        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 28 }}>
          {[{ label: "Cotizaciones", value: stats.totalQuotations, icon: "📋", color: "#f59e0b", gradient: "" }, { label: "Notas de Venta", value: stats.totalSales, icon: "💰", color: "#a855f7", gradient: "" }].map((s, i) => (<div key={i} style={{ padding: "20px 18px", background: "#ffffff", borderRadius: 12, border: "1.5px solid #cbd5e8", borderTop: `4px solid ${s.color}`, boxShadow: "0 4px 18px rgba(30,42,58,0.10), 0 1px 3px rgba(30,42,58,0.05)", position: "relative", overflow: "hidden", animation: `fadeIn 0.4s ease-out ${i * 0.06}s both` }}><div style={{ position: "absolute", top: 8, right: 12, fontSize: 28, opacity: 0.12 }}>{s.icon}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 8 }}>{s.value}</div></div>))}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 340, display: "flex", alignItems: "center", gap: 10, background: "var(--bg-card)", borderRadius: 12, padding: "0 16px", border: "1px solid var(--border)" }}><span style={{ color: "var(--text-muted)", fontSize: 14 }}>🔍</span><input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setQPage(1); }} placeholder="Buscar por cliente, ID..." style={{ flex: 1, border: "none", background: "none", padding: "12px 0", color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
          <div style={{ display: "flex", gap: 6 }}>{([{ key: "all", label: "Todas", icon: "📄", color: "#1ab8c4" }, { key: "quotation", label: "Cotizaciones", icon: "📋", color: "#f59e0b" }, { key: "sale", label: "Ventas", icon: "💰", color: "#a855f7" }] as const).map((f) => { const isActive = filterType === f.key; const count = f.key === "all" ? quotations.length : quotations.filter(q => q.type === f.key).length; return (<button key={f.key} onClick={() => { setFilterType(f.key); setQPage(1); }} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: isActive ? `${f.color}15` : "var(--bg-card)", border: isActive ? `1.5px solid ${f.color}40` : "1.5px solid var(--border)", color: isActive ? f.color : "var(--text-muted)" }}><span style={{ fontSize: 13 }}>{f.icon}</span>{f.label}{count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: isActive ? `${f.color}20` : "var(--bg-tertiary)", color: isActive ? f.color : "var(--text-muted)" }}>{count}</span>}</button>); })}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={() => openCreateModal("quotation")} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}>📋 Nueva Cotización</button>
            <button onClick={() => openCreateModal("sale")} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #a855f7, #7e22ce)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}>💰 Nueva Venta</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ animation: `cardIn 0.4s ease-out ${i * 0.08}s both` }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-text" />
                </div>
                <div style={{ width: 70, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div className="skeleton" style={{ width: 60, height: 20 }} />
                  <div className="skeleton" style={{ width: 45, height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredQuotations.length === 0 ? (<div style={{ padding: 60, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div><h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Sin documentos</h3><p style={{ color: "var(--text-muted)", fontSize: 13 }}>Crea tu primera cotización o nota de venta</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(paginatedQuotations || []).map((q, i) => { const isQuot = q.type === "quotation"; const color = isQuot ? "#f59e0b" : "#a855f7"; const bg = isQuot ? "rgba(245,158,11,0.08)" : "rgba(168,85,247,0.08)"; return (
              <div key={q.id} onClick={() => setViewQuotation(q)} style={{ background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", cursor: "pointer", transition: "all 0.25s", animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{isQuot ? "📋" : "💰"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: "monospace", fontSize: 12, color: "#1ab8c4", fontWeight: 700, background: "rgba(26,184,196,0.05)", padding: "2px 8px", borderRadius: 6 }}>{q.code}</span><span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, color, background: bg }}>{isQuot ? "📋 Cotización" : "💰 Venta"}</span></div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}><span>👤 {q.clientName}</span>{q.clientPhone && <span>📱 {q.clientPhone}</span>}<span>📦 {q.items.length} art.</span></div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 800, color }}>Bs. {Math.round(q.total || 0).toLocaleString()}</div><div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{new Date(q.createdAt).toLocaleDateString("es-BO")}</div></div>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>▸</span>
              </div>
            ); })}
          </div>
        )}

        {/* Pagination */}
        {qTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={() => goQPage(1)} disabled={qPage === 1} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: qPage === 1 ? "var(--bg-tertiary)" : "var(--bg-card)", color: qPage === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: qPage === 1 ? "default" : "pointer", opacity: qPage === 1 ? 0.5 : 1 }}>«</button>
            <button onClick={() => goQPage(qPage - 1)} disabled={qPage === 1} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: qPage === 1 ? "var(--bg-tertiary)" : "var(--bg-card)", color: qPage === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: qPage === 1 ? "default" : "pointer", opacity: qPage === 1 ? 0.5 : 1 }}>‹</button>
            {Array.from({ length: qTotalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === qTotalPages || Math.abs(p - qPage) <= 2)
              .reduce((acc: (number | string)[], p, i, arr) => { if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("..."); acc.push(p); return acc; }, [])
              .map((p, i) => typeof p === "string" ? (
                <span key={`d-${i}`} style={{ padding: "8px 6px", fontSize: 12, color: "var(--text-muted)" }}>...</span>
              ) : (
                <button key={p} onClick={() => goQPage(p as number)} style={{ padding: "8px 14px", borderRadius: 8, border: p === qPage ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === qPage ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === qPage ? "#2dd4df" : "var(--text-secondary)", fontSize: 12, fontWeight: p === qPage ? 800 : 600, cursor: "pointer", minWidth: 38 }}>{p}</button>
              ))}
            <button onClick={() => goQPage(qPage + 1)} disabled={qPage === qTotalPages} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: qPage === qTotalPages ? "var(--bg-tertiary)" : "var(--bg-card)", color: qPage === qTotalPages ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: qPage === qTotalPages ? "default" : "pointer", opacity: qPage === qTotalPages ? 0.5 : 1 }}>›</button>
            <button onClick={() => goQPage(qTotalPages)} disabled={qPage === qTotalPages} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: qPage === qTotalPages ? "var(--bg-tertiary)" : "var(--bg-card)", color: qPage === qTotalPages ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: qPage === qTotalPages ? "default" : "pointer", opacity: qPage === qTotalPages ? 0.5 : 1 }}>»</button>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>Pág {qPage} de {qTotalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none" };
