"use client";
export const dynamic = 'force-dynamic'
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { StatusTimeline } from "@/components/StatusTimeline";
import { AppSidebar } from "@/components/AppSidebar";

interface User { id: string; name: string; email: string; role: string; }
interface Repair { id: string; code: string; device: string; brand: string | null; model: string | null; issue: string; status: string; priority: string; estimatedCost: number; notes: string | null; image: string | null; accessories: string | null; clientName: string | null; clientPhone: string | null; clientEmail: string | null; qrCode: string; createdAt: string; updatedAt: string; technicianId: string | null; technician?: { id: string; name: string } | null; }
interface Notification { id: string; type: string; title: string; message: string; read: boolean; createdAt: string; }
interface ServiceItem { id: string; name: string; price: number; icon: string; }
interface SoftwareItem { id: string; name: string; category: string | null; }
interface InventoryItemData { id: string; name: string; category: string | null; quantity: number; price: number; minStock: number; image: string | null; }

const STATUS: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: "⏳", bg: "rgba(245,158,11,0.08)" },
  diagnosed: { label: "Diagnosticado", color: "#8b5cf6", icon: "🔍", bg: "rgba(139,92,246,0.08)" },
  waiting_parts: { label: "Esperando Repuestos", color: "#f97316", icon: "📦", bg: "rgba(249,115,22,0.08)" },
  in_progress: { label: "En Progreso", color: "#3b82f6", icon: "🔧", bg: "rgba(59,130,246,0.08)" },
  completed: { label: "Completado", color: "#10b981", icon: "✅", bg: "rgba(16,185,129,0.08)" },
  delivered: { label: "Entregado", color: "#6b7280", icon: "📱", bg: "rgba(107,114,128,0.08)" },
};
const TRACKING_KEYS = ["pending", "diagnosed", "waiting_parts", "in_progress", "completed"];
const ALL_STATUS_KEYS = ["pending", "diagnosed", "waiting_parts", "in_progress", "completed", "delivered"];
const NOTIF_ICONS: Record<string, string> = { status_change: "🔄", new_repair: "🆕", message: "💬", system: "🔐" };
const ACCESSORIES_LIST = ["Cargador", "Batería", "Disco Duro", "Memoria RAM", "Cable de Poder", "Pantalla", "Tornillos", "Maletín/Bolsa", "Otros"];
const ACCESSORIES_HINTS: Record<string, string> = { "Cargador": "Ej: 65W, USB-C, modelo...", "Batería": "Ej: 6 celdas, modelo...", "Disco Duro": "Ej: 500GB SSD, 1TB HDD...", "Memoria RAM": "Ej: 8GB DDR4, 16GB DDR5...", "Cable de Poder": "Ej: 3 pines, tipo...", "Pantalla": "Ej: 15.6\", táctil...", "Tornillos": "Ej: completo, incompleto, cantidad...", "Maletín/Bolsa": "Ej: color, tamaño...", "Otros": "Especificar qué accesorios..." };

function parseAccWithDetail(raw: string): { name: string; detail: string } { const match = raw.match(/^(.+?)\s*\((.+)\)$/); if (match) return { name: match[1].trim(), detail: match[2].trim() }; return { name: raw.trim(), detail: "" }; }
function parseAccessoriesFull(json: string | null): { names: string[]; details: Record<string, string> } { if (!json) return { names: [], details: {} }; try { const arr: string[] = JSON.parse(json); const names: string[] = []; const details: Record<string, string> = {}; arr.forEach(raw => { const { name, detail } = parseAccWithDetail(raw); names.push(name); if (detail) details[name] = detail; }); return { names, details }; } catch { return { names: [], details: {} }; } }
function parseAccessoriesDisplay(json: string | null): string[] { if (!json) return []; try { return JSON.parse(json); } catch { return []; } }
function parseImages(imageField: string | null): string[] { if (!imageField) return []; try { const parsed = JSON.parse(imageField); if (Array.isArray(parsed)) return parsed.filter((u: any) => typeof u === "string" && u.length > 0); } catch {} return imageField.trim().length > 0 ? [imageField] : []; }

function parseNotesAll(notesField: string | null, svcList: ServiceItem[]): { notes: string; services: string[]; software: string[]; videogames: string[]; repuestos: string[]; deliveryNotes: string; discount: string } {
  if (!notesField) return { notes: "", services: [], software: [], videogames: [], repuestos: [], deliveryNotes: "", discount: "" };
  const parts = notesField.split(" | ");
  const svcPart = parts.find(p => p.startsWith("Servicios: "));
  const swPart = parts.find(p => p.startsWith("Programas: ") || p.startsWith("Software: "));
  const vgPart = parts.find(p => p.startsWith("Videojuegos: "));
  const repPart = parts.find(p => p.startsWith("Repuestos: "));
  const delPart = parts.find(p => p.startsWith("Entrega: "));
  const discPart = parts.find(p => p.startsWith("Descuento: "));
  const notesParts = parts.filter(p => !p.startsWith("Servicios: ") && !p.startsWith("Programas: ") && !p.startsWith("Software: ") && !p.startsWith("Videojuegos: ") && !p.startsWith("Repuestos: ") && !p.startsWith("Entrega: ") && !p.startsWith("Descuento: "));
  const services: string[] = []; const software: string[] = []; const videogames: string[] = []; const repuestos: string[] = [];
  if (svcPart) { svcPart.replace("Servicios: ", "").split(", ").forEach(name => { if (svcList.find(s => s.name === name)) services.push(name); }); }
  if (swPart) { swPart.replace("Programas: ", "").replace("Software: ", "").split(", ").forEach(name => { if (name.trim()) software.push(name.trim()); }); }
  if (vgPart) { vgPart.replace("Videojuegos: ", "").split(", ").forEach(name => { if (name.trim()) videogames.push(name.trim()); }); }
  if (repPart) { repPart.replace("Repuestos: ", "").split(", ").forEach(name => { if (name.trim()) repuestos.push(name.trim()); }); }
  const deliveryNotes = delPart ? delPart.replace("Entrega: ", "") : "";
  const discount = discPart ? discPart.replace("Descuento: ", "") : "";
  return { notes: notesParts.join(" | "), services, software, videogames, repuestos, deliveryNotes, discount };
}

function buildNotesString(obs: string, services: string[], software: string[], videogames: string[], repuestos: string[], deliveryNotes: string, discount?: string): string {
  const parts: string[] = [];
  if (obs.trim()) parts.push(obs.trim());
  if (services.length > 0) parts.push(`Servicios: ${services.join(", ")}`);
  if (software.length > 0) parts.push(`Programas: ${software.join(", ")}`);
  if (videogames.length > 0) parts.push(`Videojuegos: ${videogames.join(", ")}`);
  if (repuestos.length > 0) parts.push(`Repuestos: ${repuestos.join(", ")}`);
  if (deliveryNotes.trim()) parts.push(`Entrega: ${deliveryNotes.trim()}`);
  if (discount && parseFloat(discount) > 0) parts.push(`Descuento: ${discount}`);
  return parts.join(" | ");
}

function getGreeting(): string { const h = new Date().getHours(); if (h < 12) return "Buenos días"; if (h < 18) return "Buenas tardes"; return "Buenas noches"; }
function formatClock(date: Date): { time: string; period: string } { const h = date.getHours(); const m = String(date.getMinutes()).padStart(2, "0"); const s = String(date.getSeconds()).padStart(2, "0"); const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return { time: `${String(h12).padStart(2, "0")}:${m}:${s}`, period: h >= 12 ? "PM" : "AM" }; }
function formatDate(date: Date): string { return date.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

function DashboardPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRepairs, setTotalRepairs] = useState(0);
  const [stats, setStats] = useState<{ total: number; pending: number; inProgress: number; completed: number; revenue: number; byStatus: Record<string, number> }>({ total: 0, pending: 0, inProgress: 0, completed: 0, revenue: 0, byStatus: {} });
  const PAGE_SIZE = 10;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const focusCode = searchParams.get("focus");
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [viewImages, setViewImages] = useState<string[]>([]);
  const [viewImageIdx, setViewImageIdx] = useState(0);
  const openImageViewer = (images: string[], startIdx: number) => { setViewImages(images); setViewImageIdx(startIdx); setViewImage(images[startIdx]); };
  const nextImage = () => { const next = (viewImageIdx + 1) % viewImages.length; setViewImageIdx(next); setViewImage(viewImages[next]); };
  const prevImage = () => { const prev = (viewImageIdx - 1 + viewImages.length) % viewImages.length; setViewImageIdx(prev); setViewImage(viewImages[prev]); };
  const [printModal, setPrintModal] = useState<{ code: string; type: "reception" | "delivery" } | null>(null);
  const [historyModal, setHistoryModal] = useState<{ id: string; code: string } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemData[]>([]);

  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [editDevice, setEditDevice] = useState(""); const [editBrand, setEditBrand] = useState(""); const [editModel, setEditModel] = useState("");
  const [editIssue, setEditIssue] = useState(""); const [editCost, setEditCost] = useState(""); const [editNotes, setEditNotes] = useState("");
  const [editClientName, setEditClientName] = useState(""); const [editClientPhone, setEditClientPhone] = useState(""); const [editClientEmail, setEditClientEmail] = useState("");
  const [editSelectedAccessories, setEditSelectedAccessories] = useState<string[]>([]); const [editAccessoryDetails, setEditAccessoryDetails] = useState<Record<string, string>>({});
  const [editSelectedServices, setEditSelectedServices] = useState<string[]>([]);
  const [editSelectedSoftware, setEditSelectedSoftware] = useState<string[]>([]);
  const [editSelectedVideogames, setEditSelectedVideogames] = useState<string[]>([]);
  const [showEditVideogames, setShowEditVideogames] = useState(false);
  const [searchEditVideogames, setSearchEditVideogames] = useState("");
  const [editVideogamesList, setEditVideogamesList] = useState<{id:string;name:string;platform:string|null;genre:string|null}[]>([]);
  const [editStatus, setEditStatus] = useState("");
  const [editTechnicianId, setEditTechnicianId] = useState("");
  const [techniciansList, setTechniciansList] = useState<{ id: string; name: string }[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]); const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]); const [uploading, setUploading] = useState(false);
  const [showEditServices, setShowEditServices] = useState(false); const [showEditSoftware, setShowEditSoftware] = useState(false);
  const [searchEditServices, setSearchEditServices] = useState(""); const [searchEditSoftware, setSearchEditSoftware] = useState("");
  const [editSelectedInventory, setEditSelectedInventory] = useState<string[]>([]);
  const [editOriginalInventory, setEditOriginalInventory] = useState<string[]>([]);
  const [showEditInventory, setShowEditInventory] = useState(false);
  const [searchEditInventory, setSearchEditInventory] = useState("");
  const filteredEditServices = servicesList.filter(s => searchEditServices === "" || s.name.toLowerCase().includes(searchEditServices.toLowerCase()));
  const filteredEditSoftware = softwareList.filter(s => searchEditSoftware === "" || s.name.toLowerCase().includes(searchEditSoftware.toLowerCase()) || (s.category || "").toLowerCase().includes(searchEditSoftware.toLowerCase()));
  const filteredEditVideogames = editVideogamesList.filter(v => searchEditVideogames === "" || v.name.toLowerCase().includes(searchEditVideogames.toLowerCase()) || (v.platform || "").toLowerCase().includes(searchEditVideogames.toLowerCase()));
  const filteredEditInventory = inventoryList.filter(item => (item.quantity > 0 || editSelectedInventory.includes(item.id)) && (searchEditInventory === "" || item.name.toLowerCase().includes(searchEditInventory.toLowerCase()) || (item.category || "").toLowerCase().includes(searchEditInventory.toLowerCase())));

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliverySelectedRepair, setDeliverySelectedRepair] = useState<Repair | null>(null);
  const [deliveryAccChecked, setDeliveryAccChecked] = useState<Record<string, boolean>>({});
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliverySelectedServices, setDeliverySelectedServices] = useState<string[]>([]);
  const [deliverySelectedSoftware, setDeliverySelectedSoftware] = useState<string[]>([]);
  const [showDeliveryServices, setShowDeliveryServices] = useState(false);
  const [showDeliverySoftware, setShowDeliverySoftware] = useState(false);
  const [searchDeliveryServices, setSearchDeliveryServices] = useState("");
  const [searchDeliverySoftware, setSearchDeliverySoftware] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [deliveryDiscount, setDeliveryDiscount] = useState("");
  const filteredDeliveryServices = servicesList.filter(s => searchDeliveryServices === "" || s.name.toLowerCase().includes(searchDeliveryServices.toLowerCase()));
  const filteredDeliverySoftware = softwareList.filter(s => searchDeliverySoftware === "" || s.name.toLowerCase().includes(searchDeliverySoftware.toLowerCase()) || (s.category || "").toLowerCase().includes(searchDeliverySoftware.toLowerCase()));
  const completedRepairs = repairs.filter(r => r.status === "completed");

  const [deliverySelectedInventory, setDeliverySelectedInventory] = useState<string[]>([]);
  const [showDeliveryInventory, setShowDeliveryInventory] = useState(false);
  const [searchDeliveryInventory, setSearchDeliveryInventory] = useState("");
  const filteredDeliveryInventory = inventoryList.filter(item => item.quantity > 0 && (searchDeliveryInventory === "" || item.name.toLowerCase().includes(searchDeliveryInventory.toLowerCase()) || (item.category || "").toLowerCase().includes(searchDeliveryInventory.toLowerCase())));

  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; website: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico", logo: null, website: null });
  const unreadCount = notifications.filter((n) => !n.read).length;
  const toggleEditAcc = (acc: string) => { setEditSelectedAccessories(prev => { if (prev.includes(acc)) { setEditAccessoryDetails(d => { const copy = { ...d }; delete copy[acc]; return copy; }); return prev.filter(a => a !== acc); } return [...prev, acc]; }); };
  const updateEditDetail = (acc: string, detail: string) => { setEditAccessoryDetails(prev => ({ ...prev, [acc]: detail })); };
  const buildEditAccessoriesArray = (): string[] => { return editSelectedAccessories.map(acc => { const detail = editAccessoryDetails[acc]?.trim(); return detail ? `${acc} (${detail})` : acc; }); };
  const toggleEditService = (serviceName: string) => { setEditSelectedServices(prev => { const next = prev.includes(serviceName) ? prev.filter(s => s !== serviceName) : [...prev, serviceName]; recalcEditCost(next, editSelectedInventory); return next; }); };
  const toggleEditSoftware = (name: string) => { setEditSelectedSoftware(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]); };
  const toggleEditVideogame = (name: string) => { setEditSelectedVideogames(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]); };
  const recalcEditCost = (services: string[], invIds: string[]) => {
    const svcTotal = services.reduce((sum, name) => { const svc = servicesList.find(s => s.name === name); return sum + (svc?.price || 0); }, 0);
    const invTotal = invIds.reduce((sum, id) => { const item = inventoryList.find(i => i.id === id); return sum + (item?.price || 0); }, 0);
    setEditCost(String(svcTotal + invTotal));
  };
  const toggleEditInventory = (itemId: string) => {
    setEditSelectedInventory(prev => {
      const next = prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId];
      recalcEditCost(editSelectedServices, next);
      return next;
    });
  };

  const recalculateDeliveryCost = (services: string[], inventoryIds: string[]) => {
    const svcTotal = services.reduce((sum, name) => { const svc = servicesList.find(s => s.name === name); return sum + (svc?.price || 0); }, 0);
    const invTotal = inventoryIds.reduce((sum, id) => { const item = inventoryList.find(i => i.id === id); return sum + (item?.price || 0); }, 0);
    setDeliveryCost(String(svcTotal + invTotal));
  };
  const toggleDeliveryService = (serviceName: string) => {
    setDeliverySelectedServices(prev => {
      const next = prev.includes(serviceName) ? prev.filter(s => s !== serviceName) : [...prev, serviceName];
      recalculateDeliveryCost(next, deliverySelectedInventory);
      return next;
    });
  };
  const toggleDeliverySoftware = (name: string) => { setDeliverySelectedSoftware(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]); };
  const toggleDeliveryInventory = (itemId: string) => {
    setDeliverySelectedInventory(prev => {
      const next = prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId];
      recalculateDeliveryCost(deliverySelectedServices, next);
      return next;
    });
  };

  const openDeliveryModal = () => {
    setShowDeliveryModal(true); setDeliverySelectedRepair(null); setDeliveryAccChecked({}); setDeliveryNotes("");
    setDeliverySelectedServices([]); setDeliverySelectedSoftware([]); setDeliveryCost(""); setDeliveryDiscount("");
    setShowDeliveryServices(false); setShowDeliverySoftware(false); setSearchDeliveryServices(""); setSearchDeliverySoftware("");
    setDeliverySelectedInventory([]); setShowDeliveryInventory(false); setSearchDeliveryInventory("");
  };

  const selectDeliveryRepair = (repair: Repair) => {
    if (deliverySelectedRepair?.id === repair.id) {
      setDeliverySelectedRepair(null); setDeliveryAccChecked({}); setDeliverySelectedServices([]);
      setDeliverySelectedSoftware([]); setDeliverySelectedInventory([]); setDeliveryCost(""); setDeliveryDiscount(""); return;
    }
    setDeliverySelectedRepair(repair);
    const accNames = parseAccessoriesDisplay(repair.accessories);
    const checked: Record<string, boolean> = {};
    accNames.forEach(a => { const { name } = parseAccWithDetail(a); checked[name] = true; });
    setDeliveryAccChecked(checked);
    const parsed = parseNotesAll(repair.notes, servicesList);
    setDeliverySelectedServices(parsed.services);
    setDeliverySelectedSoftware(parsed.software);
    setDeliverySelectedInventory(parsed.repuestos.map(name => inventoryList.find(i => i.name === name)?.id).filter(Boolean) as string[]);
    setDeliveryCost(String(repair.estimatedCost));
  };

  const confirmDelivery = async () => {
    if (!deliverySelectedRepair) return;
    const token = sessionStorage.getItem("token"); if (!token) return;
    try {
      const existingParsed = parseNotesAll(deliverySelectedRepair.notes, servicesList);
      const originalObs = existingParsed.notes;
      const invNames = deliverySelectedInventory.map(id => inventoryList.find(i => i.id === id)?.name).filter(Boolean) as string[];
      const finalNotes = buildNotesString(originalObs, deliverySelectedServices, deliverySelectedSoftware, existingParsed.videogames, invNames, deliveryNotes, deliveryDiscount);
      const svcTotal = deliverySelectedServices.reduce((sum, name) => { const svc = servicesList.find(s => s.name === name); return sum + (svc?.price || 0); }, 0);
      const invTotal = deliverySelectedInventory.reduce((sum, id) => { const item = inventoryList.find(i => i.id === id); return sum + (item?.price || 0); }, 0);
      const disc = Number(deliveryDiscount || 0);
      const totalCost = Math.max(0, svcTotal + invTotal - disc);
      for (const itemId of deliverySelectedInventory) {
        const item = inventoryList.find(i => i.id === itemId);
        if (item && item.quantity > 0) {
          await apiFetch("/api/inventory", { method: "PATCH", body: JSON.stringify({ id: itemId, quantity: item.quantity - 1 }) });
        }
      }
      const res = await apiFetch(`/api/repairs/${deliverySelectedRepair.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "delivered", notes: finalNotes || null, estimatedCost: totalCost || deliverySelectedRepair.estimatedCost })
      });
      if (res.ok) {
        setShowDeliveryModal(false);
        sileo.success({ title: `Equipo ${deliverySelectedRepair.code} entregado` });
        await loadRepairs(token); loadNotifications(token);
        apiFetch("/api/inventory").then(res => res.json()).then(data => { if (Array.isArray(data)) setInventoryList(data); }).catch(() => {});
      }
    } catch {}
  };

  const loadRepairs = async (token: string, page?: number, search?: string, status?: string) => {
    try {
      const p = page || currentPage;
      const s = search !== undefined ? search : searchQuery;
      const st = status !== undefined ? status : filterStatus;
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (s) params.set("search", s);
      if (st && st !== "all") params.set("status", st);
      const res = await apiFetch(`/api/repairs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRepairs(data.repairs || []);
        setTotalPages(data.totalPages || 1);
        setTotalRepairs(data.total || 0);
        setCurrentPage(data.page || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch {} setLoading(false);
  };
  const loadNotifications = async (token: string) => { try { const res = await apiFetch("/api/notifications", { }); if (res.ok) setNotifications(await res.json()); } catch {} };
  const markNotificationRead = async (notifId: string) => { const token = sessionStorage.getItem("token"); if (!token) return; try { await apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ notificationId: notifId }) }); setNotifications(notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n))); } catch {} };
  const markAllRead = async () => { const token = sessionStorage.getItem("token"); if (!token) return; try { await apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ markAll: true }) }); setNotifications(notifications.map((n) => ({ ...n, read: true }))); } catch {} };
  const clearAllNotifications = async () => { if (!confirm("¿Eliminar todas las notificaciones?")) return; const token = sessionStorage.getItem("token"); if (!token) return; try { const res = await apiFetch("/api/notifications", { method: "DELETE" }); if (res.ok) { setNotifications([]); setShowNotifications(false); sileo.success({ title: "Notificaciones limpiadas" }); } } catch {} };

  useEffect(() => {
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const parsedUser = (() => { try { return JSON.parse(userData); } catch { return null; } })();
    if (parsedUser.role === "tech") { router.push("/asignaciones"); return; }
    setUser(parsedUser);
    // Load branches for superadmin
    if (parsedUser.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.ok ? r.json() : Promise.reject(r.status)).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else {
      setActiveBranch(parsedUser.branchId || "");
    }
    loadRepairs(token); loadNotifications(token);
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, slogan: d.slogan, logo: d.logo, website: d.website }).catch(() => {}); }).catch(() => {});
    apiFetch("/api/services").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setServicesList(data); }).catch(() => {});
    apiFetch("/api/software").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setSoftwareList(data); }).catch(() => {});
    apiFetch("/api/videogames").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setEditVideogamesList(data); }).catch(() => {});
    apiFetch("/api/inventory").then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) setInventoryList(data); }).catch(() => {});
    apiFetch("/api/technicians", { }).then(res => res.json()).then(data => { if (Array.isArray(data)) setTechniciansList(data); }).catch(() => {});
    const savedEdit = sessionStorage.getItem("editFormData");
    if (savedEdit) { try { const data = (() => { try { return JSON.parse(savedEdit); } catch { return null; } })(); setEditingRepair(data.repair); setEditDevice(data.editDevice || ""); setEditBrand(data.editBrand || ""); setEditModel(data.editModel || ""); setEditIssue(data.editIssue || ""); setEditCost(data.editCost || ""); setEditNotes(data.editNotes || ""); setEditClientName(data.editClientName || ""); setEditClientPhone(data.editClientPhone || ""); setEditClientEmail(data.editClientEmail || ""); setEditSelectedAccessories(data.editSelectedAccessories || []); setEditAccessoryDetails(data.editAccessoryDetails || {}); setEditSelectedServices(data.editSelectedServices || []); setEditSelectedSoftware(data.editSelectedSoftware || []); setEditStatus(data.editStatus || ""); setEditImageUrls(data.editImageUrls || []); setEditImagePreviews(data.editImagePreviews || []); } catch {} sessionStorage.removeItem("editFormData"); }
    const capturedData = sessionStorage.getItem("capturedImage");
    if (capturedData) { try { const { url, preview } = (() => { try { return JSON.parse(capturedData); } catch { return {}; } })(); setEditImageUrls(prev => [...prev, url]); setEditImagePreviews(prev => [...prev, preview]); setTimeout(() => sileo.success({ title: "Foto capturada" }), 500); } catch {} sessionStorage.removeItem("capturedImage"); }
  }, []);

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  
  // Auto-expandir OT cuando viene de ?focus=OT-X del buscador global
  useEffect(() => {
    if (!focusCode || repairs.length === 0) return;
    const target = repairs.find(r => r.code === focusCode);
    if (target) {
      setExpandedId(target.id);
      setTimeout(() => {
        const el = document.querySelector(`[data-repair-id="${target.id}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } else {
      // Si no está en la página actual, buscar con searchQuery
      setSearchQuery(focusCode);
    }
  }, [focusCode, repairs]);
  useEffect(() => { const token = sessionStorage.getItem("token"); if (!token) return; const interval = setInterval(() => { loadNotifications(token); loadRepairs(token); }, 15000); return () => clearInterval(interval); }, [currentPage, searchQuery, filterStatus]);
  // Debounced search
  useEffect(() => { const token = sessionStorage.getItem("token"); if (!token) return; const t = setTimeout(() => { setCurrentPage(1); loadRepairs(token, 1, searchQuery, filterStatus); }, 400); return () => clearTimeout(t); }, [searchQuery]);
  // Filter change
  useEffect(() => { const token = sessionStorage.getItem("token"); if (!token) return; setCurrentPage(1); loadRepairs(token, 1, searchQuery, filterStatus); }, [filterStatus]);
  const goToPage = (p: number) => { const token = sessionStorage.getItem("token"); if (!token) return; setCurrentPage(p); loadRepairs(token, p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { function handleClick(e: MouseEvent) { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false); } document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick); }, []);
  useEffect(() => { if (!viewImage) return; const handleKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") nextImage(); else if (e.key === "ArrowLeft") prevImage(); else if (e.key === "Escape") setViewImage(null); }; document.addEventListener("keydown", handleKey); return () => document.removeEventListener("keydown", handleKey); });

  const uploadEditFiles = async (files: FileList) => { setUploading(true); for (let i = 0; i < files.length; i++) { const file = files[i]; const reader = new FileReader(); reader.onload = (ev) => setEditImagePreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(file); const formData = new FormData(); formData.append("file", file); try { const res = await apiFetch("/api/upload", { method: "POST", body: formData }); if (res.ok) { const data = await res.json(); setEditImageUrls(prev => [...prev, data.url]); } } catch {} } sileo.success({ title: `${files.length} imagen${files.length > 1 ? "es subidas" : " subida"}` }); setUploading(false); };
  const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files || files.length === 0) return; await uploadEditFiles(files); e.target.value = ""; };
  const handleEditTakePhoto = () => { sessionStorage.setItem("editFormData", JSON.stringify({ repair: editingRepair, editDevice, editBrand, editModel, editIssue, editCost, editNotes, editClientName, editClientPhone, editClientEmail, editSelectedAccessories, editAccessoryDetails, editSelectedServices, editSelectedSoftware, editStatus, editImageUrls, editImagePreviews })); sessionStorage.setItem("cameraReturnUrl", "/dashboard"); window.location.href = "/camera.html"; };
  const removeEditImage = (index: number) => { setEditImageUrls(prev => prev.filter((_, i) => i !== index)); setEditImagePreviews(prev => prev.filter((_, i) => i !== index)); };
  const deleteRepair = async (repairId: string) => { const token = sessionStorage.getItem("token"); try { const res = await apiFetch(`/api/repairs/${repairId}`, { method: "DELETE" }); if (res.ok) { setExpandedId(null); sileo.success({ title: "Orden eliminada" }); if (token) { await loadRepairs(token); loadNotifications(token); } } } catch {} };
  const sendWhatsApp = async (phone: string | null, message: string) => {
    if (!phone) { sileo.warning({ title: "Sin número de celular" }); return; }
    try {
      const res = await apiFetch("/api/whatsapp", {
        method: "POST",
        body: JSON.stringify({ phone, message }),
      });
      if (res.ok) { sileo.success({ title: "WhatsApp enviado" }); }
      else { const d = await res.json(); sileo.warning({ title: `${d.error || "Error al enviar"}` }); }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const getBaseUrl = () => "https://degree-project.com";

  const updateStatus = async (repairId: string, newStatus: string) => { const token = sessionStorage.getItem("token"); try { const res = await apiFetch(`/api/repairs/${repairId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }); if (res.ok) { sileo.info({ title: `Estado: ${STATUS[newStatus]?.label}` }); if (token) { await loadRepairs(token); loadNotifications(token); } } } catch {} };

  const assignTechnician = async (repairId: string, techId: string) => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    try {
      const res = await apiFetch(`/api/repairs/${repairId}`, { method: "PATCH", body: JSON.stringify({ technicianId: techId || null }) });
      if (res.ok) {
        const techName = techniciansList.find(t => t.id === techId)?.name;
        sileo.success({ title: techId ? `Asignado a ${techName}` : "Técnico removido" });
        await loadRepairs(token); loadNotifications(token);
      }
    } catch {}
  };

  const openEditForm = (repair: Repair) => {
    setEditingRepair(repair); setEditDevice(repair.device); setEditBrand(repair.brand || ""); setEditModel(repair.model || "");
    setEditIssue(repair.issue);
    setEditClientName(repair.clientName || ""); setEditClientPhone(repair.clientPhone || ""); setEditClientEmail(repair.clientEmail || "");
    const { names, details } = parseAccessoriesFull(repair.accessories); setEditSelectedAccessories(names); setEditAccessoryDetails(details);
    const parsed = parseNotesAll(repair.notes, servicesList);
    setEditNotes(parsed.notes); setEditSelectedServices(parsed.services); setEditSelectedSoftware(parsed.software);
    const invIds = parsed.repuestos.map(name => inventoryList.find(i => i.name === name)?.id).filter(Boolean) as string[];
    setEditSelectedInventory(invIds);
    setEditOriginalInventory(invIds);
    const svcTotal = parsed.services.reduce((sum, name) => { const svc = servicesList.find(s => s.name === name); return sum + (svc?.price || 0); }, 0);
    const invTotal = invIds.reduce((sum, id) => { const item = inventoryList.find(i => i.id === id); return sum + (item?.price || 0); }, 0);
    setEditCost(String(svcTotal + invTotal || repair.estimatedCost));
    setEditStatus(repair.status); setEditTechnicianId(repair.technicianId || ""); const imgs = parseImages(repair.image); setEditImageUrls(imgs); setEditImagePreviews(imgs);
    setShowEditServices(false); setShowEditSoftware(false); setSearchEditServices(""); setSearchEditSoftware("");
    setShowEditInventory(false); setSearchEditInventory("");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingRepair) return; const token = sessionStorage.getItem("token");
    try {
      const imageData = editImageUrls.length > 0 ? JSON.stringify(editImageUrls) : null; const accArray = buildEditAccessoriesArray();
      const invNames = editSelectedInventory.map(id => inventoryList.find(i => i.id === id)?.name).filter(Boolean) as string[];
      const existingParsed = parseNotesAll(editingRepair.notes, servicesList);
      const finalNotes = buildNotesString(editNotes, editSelectedServices, editSelectedSoftware, editSelectedVideogames, invNames, existingParsed.deliveryNotes, existingParsed.discount);
      const removedItems = editOriginalInventory.filter(id => !editSelectedInventory.includes(id));
      const addedItems = editSelectedInventory.filter(id => !editOriginalInventory.includes(id));
      for (const itemId of removedItems) {
        const item = inventoryList.find(i => i.id === itemId);
        if (item) { await apiFetch("/api/inventory", { method: "PATCH", body: JSON.stringify({ id: itemId, quantity: item.quantity + 1 }) }); }
      }
      for (const itemId of addedItems) {
        const item = inventoryList.find(i => i.id === itemId);
        if (item && item.quantity > 0) { await apiFetch("/api/inventory", { method: "PATCH", body: JSON.stringify({ id: itemId, quantity: item.quantity - 1 }) }); }
      }
      const res = await apiFetch(`/api/repairs/${editingRepair.id}`, { method: "PATCH", body: JSON.stringify({ device: editDevice, brand: editBrand, model: editModel, issue: editIssue, estimatedCost: parseFloat(editCost) || 0, notes: finalNotes || null, clientName: editClientName, clientPhone: editClientPhone, clientEmail: editClientEmail, image: imageData, accessories: accArray.length > 0 ? JSON.stringify(accArray) : null, status: editStatus, technicianId: editTechnicianId || null }) });
      if (res.ok) {
        setEditingRepair(null); sileo.success({ title: `Orden ${editingRepair.code} actualizada` });
        if (token) { await loadRepairs(token); loadNotifications(token); }
        apiFetch("/api/inventory").then(res => res.json()).then(data => { if (Array.isArray(data)) setInventoryList(data); }).catch(() => {});
      }
    } catch {}
  };

  const logout = () => { apiFetch("/api/auth/logout", { method: "POST" }).then(() => { sessionStorage.removeItem("token"); sessionStorage.removeItem("user"); router.push("/"); }); };

  const downloadBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await apiFetch("/api/backup");
      if (!res.ok) throw new Error("Error al generar backup");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] || `repairtrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sileo.success({ title: "Backup descargado correctamente" });
    } catch {
      sileo.error({ title: "Error al generar backup" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup?.data || !backup?.meta) {
        sileo.error({ title: "Archivo de backup inválido" });
        setImportLoading(false);
        return;
      }
      const res = await apiFetch("/api/backup/import", {
        method: "POST",
        body: JSON.stringify(backup),
      });
      const result = await res.json();
      if (!res.ok) {
        sileo.error({ title: `${result.error || "Error al importar"}` });
      } else {
        setImportResult(result.stats);
        sileo.success({ title: "Importación completada" });
        // Reload data
        window.location.reload();
      }
    } catch {
      sileo.error({ title: "Error al leer el archivo" });
    } finally {
      setImportLoading(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  const printQROnly = (code: string, type: "reception" | "delivery") => {
    const urlType = type === "reception" ? "ot" : "ce";
    const bid = activeBranch ? `?branchId=${activeBranch}` : "";
    window.open(`/print-qr/${urlType}/${code}${bid}`, "_blank");
  };

  const filteredRepairs = repairs;

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;
  const btnAction: React.CSSProperties = { padding: "9px 14px", background: "#ffffff", border: "1.5px solid #1e2a3a", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
  const clock = formatClock(now);

  const InfoBox = ({ label, value, icon, color = "var(--text-muted)", bg = "var(--bg-tertiary)", span = false }: { label: string; value: string; icon: string; color?: string; bg?: string; span?: boolean }) => (
    <div style={{ padding: "8px 10px", background: bg, borderRadius: 8, ...(span ? { gridColumn: "1 / -1" } : {}) }}>
      <div style={{ fontSize: 9, color, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>{icon} {value}</div>
    </div>
  );
// ═══════════════════════════════════════════
// FIN DE LA PARTE 1 — CONTINÚA EN PARTE 2
// ═══════════════════════════════════════════
return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} suppressHydrationWarning>
{viewImage && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}><div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}><img src={viewImage} alt="Equipo" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", display: "block" }} />{viewImages.length > 1 && (<><button onClick={prevImage} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>‹</button><button onClick={nextImage} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>›</button><div style={{ position: "absolute", bottom: -36, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, alignItems: "center" }}>{viewImages.map((_, idx) => (<div key={idx} onClick={() => { setViewImageIdx(idx); setViewImage(viewImages[idx]); }} style={{ width: idx === viewImageIdx ? 20 : 8, height: 8, borderRadius: 4, background: idx === viewImageIdx ? "#1ab8c4" : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.2s" }} />))}</div><div style={{ position: "absolute", bottom: -36, right: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{viewImageIdx + 1} / {viewImages.length}</div></>)}<button onClick={() => setViewImage(null)} style={{ position: "absolute", top: -16, right: -16, width: 36, height: 36, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div></div>)}

      {/* ═══ MODAL EDITAR ═══ */}
      {editingRepair && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 820, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(26,184,196,0.10)", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
            <form onSubmit={saveEdit} style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(26,184,196,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✏️</div><h3 style={{ fontSize: 16, fontWeight: 700 }}>Editar Orden <span style={{ color: "#1ab8c4", fontFamily: "monospace" }}>{editingRepair.code}</span></h3></div>
                <button type="button" onClick={() => setEditingRepair(null)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>📷 Fotos del equipo</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {editImagePreviews.map((preview, idx) => (<div key={idx} style={{ width: 100, height: 100, borderRadius: 10, overflow: "hidden", position: "relative", border: "2px solid #1ab8c4", flexShrink: 0 }}><img src={preview} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><button type="button" onClick={() => removeEditImage(idx)} style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>{uploading && idx === editImagePreviews.length - 1 && <div style={{ position: "absolute", inset: 0, background: "rgba(26,29,46,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>...</div></div>}</div>))}
                  <div onClick={() => editFileInputRef.current?.click()} style={{ width: 100, height: 100, borderRadius: 10, border: "2px dashed var(--border)", background: "var(--bg-primary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 22 }}>＋</span><span style={{ fontSize: 9, color: "var(--text-muted)" }}>Subir foto</span></div>
                  <div onClick={handleEditTakePhoto} style={{ width: 100, height: 100, borderRadius: 10, border: "2px dashed rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 22 }}>📸</span><span style={{ fontSize: 9, color: "#10b981" }}>Cámara</span></div>
                  <input ref={editFileInputRef} type="file" accept="image/*" multiple onChange={handleEditImageSelect} style={{ display: "none" }} />
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(26,184,196,0.04)", borderRadius: 12, border: "1px solid rgba(26,184,196,0.05)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#2dd4df", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>👤 Datos del Cliente</div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><FormField label="Nombre" value={editClientName} onChange={setEditClientName} placeholder="Juan Pérez" /><FormField label="Celular" value={editClientPhone} onChange={setEditClientPhone} placeholder="70012345" /></div>
              </div>
              <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(245,158,11,0.04)", borderRadius: 12, border: "1px solid rgba(245,158,11,0.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Datos del Equipo</div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}><FormField label="Tipo" value={editDevice} onChange={setEditDevice} placeholder="Laptop, PC, Tablet..." /><FormField label="Marca" value={editBrand} onChange={setEditBrand} placeholder="HP, Dell, Lenovo..." /><FormField label="Modelo" value={editModel} onChange={setEditModel} placeholder="Pavilion 15, ThinkPad..." /></div>
              </div>
              <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(16,185,129,0.04)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>🎒 Accesorios</div>
                <div translate="no" className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {(ACCESSORIES_LIST || []).map((acc) => { const checked = editSelectedAccessories.includes(acc); const hint = ACCESSORIES_HINTS[acc]; const hasExtra = !!hint; const detail = editAccessoryDetails[acc] || ""; return (<div key={acc} style={{ display: "flex", flexDirection: "column", gap: 0 }}><div onClick={() => toggleEditAcc(acc)} style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", borderTop: `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderLeft: `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderRight: `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderBottom: checked && hasExtra ? "1px solid rgba(16,185,129,0.2)" : `2px solid ${checked ? "#10b981" : "var(--border)"}`, borderRadius: checked && hasExtra ? "10px 10px 0 0" : 10, background: checked ? "rgba(16,185,129,0.1)" : "var(--bg-tertiary)", userSelect: "none", transition: "all 0.15s" }}><div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: checked ? "none" : "2px solid var(--border)", background: checked ? "#10b981" : "transparent", color: "#fff", fontSize: 11, fontWeight: 800 }}>{checked ? "✓" : ""}</div><span style={{ fontSize: 12, fontWeight: 600, color: checked ? "#10b981" : "var(--text-muted)" }}>{acc}</span></div>{checked && hint && (<div style={{ borderRadius: "0 0 10px 10px", borderLeft: "2px solid #10b981", borderRight: "2px solid #10b981", borderBottom: "2px solid #10b981", background: "rgba(16,185,129,0.05)", padding: "6px 8px" }}><input value={detail} onChange={(e) => updateEditDetail(acc, e.target.value)} placeholder={hint} onClick={(e) => e.stopPropagation()} style={{ width: "100%", padding: "5px 7px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 5, color: "var(--text-primary)", fontSize: 10, outline: "none" }} /></div>)}</div>); })}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>🔧 Problema reportado</label><textarea value={editIssue} onChange={(e) => setEditIssue(e.target.value)} placeholder="Describe el problema..." rows={4} style={{ ...fieldStyle, resize: "vertical" }} /></div>
                <div><label style={labelStyle}>📋 Observaciones del equipo</label><textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Estado físico, detalles visibles..." rows={4} style={{ ...fieldStyle, resize: "vertical" }} /></div>
              </div>
              {servicesList.length > 0 && (<div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(168,85,247,0.04)", borderRadius: 12, border: `1px solid ${showEditServices ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.08)"}` }}><div onClick={() => setShowEditServices(!showEditServices)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>🛠️ Servicios y Costos {editSelectedServices.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(168,85,247,0.15)", color: "#c084fc", fontWeight: 800 }}>{editSelectedServices.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showEditServices ? "rgba(168,85,247,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#a855f7", transition: "all 0.2s", transform: showEditServices ? "rotate(180deg)" : "none" }}>▾</div></div>{editSelectedServices.length > 0 && !showEditServices && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{editSelectedServices.map(name => { const svc = servicesList.find(s => s.name === name); return <span key={name} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7" }}>{svc?.icon} {name} — Bs.{svc?.price}</span>; })}</div>)}{showEditServices && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchEditServices} onChange={(e) => setSearchEditServices(e.target.value)} placeholder="Buscar servicio..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchEditServices && <span onClick={() => setSearchEditServices("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{filteredEditServices.map((svc) => { const active = editSelectedServices.includes(svc.name); return (<div key={svc.id} onClick={() => toggleEditService(svc.name)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#a855f7" : "var(--border)"}`, background: active ? "rgba(168,85,247,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#a855f7" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#a855f7" : "var(--text-muted)", lineHeight: 1.2 }}>{svc.icon} {svc.name}</div><div style={{ fontSize: 10, fontWeight: 800, color: active ? "#c084fc" : "var(--text-muted)" }}>Bs. {svc.price}</div></div></div>); })}</div>{filteredEditServices.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No se encontraron servicios</div>}</div>)}</div>)}
              {softwareList.length > 0 && (<div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(139,92,246,0.04)", borderRadius: 12, border: `1px solid ${showEditSoftware ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.08)"}` }}><div onClick={() => setShowEditSoftware(!showEditSoftware)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>💿 Programas a Instalar {editSelectedSoftware.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(139,92,246,0.15)", color: "#7c3aed", fontWeight: 800 }}>{editSelectedSoftware.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showEditSoftware ? "rgba(139,92,246,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8b5cf6", transition: "all 0.2s", transform: showEditSoftware ? "rotate(180deg)" : "none" }}>▾</div></div>{editSelectedSoftware.length > 0 && !showEditSoftware && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{editSelectedSoftware.map(name => <span key={name} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#8b5cf6" }}>💿 {name}</span>)}</div>)}{showEditSoftware && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchEditSoftware} onChange={(e) => setSearchEditSoftware(e.target.value)} placeholder="Buscar programa..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchEditSoftware && <span onClick={() => setSearchEditSoftware("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{filteredEditSoftware.map((sw) => { const active = editSelectedSoftware.includes(sw.name); return (<div key={sw.id} onClick={() => toggleEditSoftware(sw.name)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#8b5cf6" : "var(--border)"}`, background: active ? "rgba(139,92,246,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#8b5cf6" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#8b5cf6" : "var(--text-muted)", lineHeight: 1.2 }}>{sw.name}</div>{sw.category && <div style={{ fontSize: 9, color: active ? "#7c3aed" : "var(--text-muted)" }}>{sw.category}</div>}</div></div>); })}</div>{filteredEditSoftware.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No se encontraron programas</div>}</div>)}</div>)}
{(editVideogamesList.length > 0 || editSelectedVideogames.length > 0) && (<div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(239,68,68,0.04)", borderRadius: 12, border: `1px solid ${showEditVideogames ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.08)"}` }}><div onClick={() => setShowEditVideogames(!showEditVideogames)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>🎮 Videojuegos a Instalar {editSelectedVideogames.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(239,68,68,0.15)", color: "#dc2626", fontWeight: 800 }}>{editSelectedVideogames.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showEditVideogames ? "rgba(239,68,68,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#ef4444", transition: "all 0.2s", transform: showEditVideogames ? "rotate(180deg)" : "none" }}>▾</div></div>{editSelectedVideogames.length > 0 && !showEditVideogames && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{editSelectedVideogames.map(name => <span key={name} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>🎮 {name}</span>)}</div>)}{showEditVideogames && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchEditVideogames} onChange={(e) => setSearchEditVideogames(e.target.value)} placeholder="Buscar videojuego..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchEditVideogames && <span onClick={() => setSearchEditVideogames("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{filteredEditVideogames.map((vg) => { const active = editSelectedVideogames.includes(vg.name); return (<div key={vg.id} onClick={() => toggleEditVideogame(vg.name)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#ef4444" : "var(--border)"}`, background: active ? "rgba(239,68,68,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#ef4444" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#ef4444" : "var(--text-muted)", lineHeight: 1.2 }}>{vg.name}</div>{vg.platform && <div style={{ fontSize: 9, color: active ? "#dc2626" : "var(--text-muted)" }}>{vg.platform}</div>}</div></div>); })}</div>{filteredEditVideogames.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No se encontraron videojuegos</div>}</div>)}</div>)}
              {inventoryList.length > 0 && (<div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(245,158,11,0.04)", borderRadius: 12, border: `1px solid ${showEditInventory ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.08)"}` }}><div onClick={() => setShowEditInventory(!showEditInventory)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>📦 Repuestos del Inventario {editSelectedInventory.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontWeight: 800 }}>{editSelectedInventory.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showEditInventory ? "rgba(245,158,11,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#f59e0b", transition: "all 0.2s", transform: showEditInventory ? "rotate(180deg)" : "none" }}>▾</div></div>{editSelectedInventory.length > 0 && !showEditInventory && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{editSelectedInventory.map(id => { const item = inventoryList.find(i => i.id === id); return item ? <span key={id} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>📦 {item.name} — Bs.{item.price}</span> : null; })}</div>)}{showEditInventory && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchEditInventory} onChange={(e) => setSearchEditInventory(e.target.value)} placeholder="Buscar repuesto..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchEditInventory && <span onClick={() => setSearchEditInventory("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{filteredEditInventory.map((item) => { const active = editSelectedInventory.includes(item.id); return (<div key={item.id} onClick={() => toggleEditInventory(item.id)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#f59e0b" : "var(--border)"}`, background: active ? "rgba(245,158,11,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#f59e0b" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#f59e0b" : "var(--text-muted)", lineHeight: 1.2 }}>📦 {item.name}</div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span style={{ fontSize: 10, fontWeight: 800, color: active ? "#fbbf24" : "var(--text-muted)" }}>Bs. {item.price}</span><span style={{ fontSize: 9, color: item.quantity <= item.minStock ? "#ef4444" : "var(--text-muted)" }}>Stock: {item.quantity}</span></div></div></div>); })}</div>{filteredEditInventory.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No hay repuestos disponibles</div>}</div>)}</div>)}
              <FormField label="Costo Total (Bs.)" value={editCost} onChange={setEditCost} placeholder="0.00" type="number" />
              <div><label style={labelStyle}>Estado</label><select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>{ALL_STATUS_KEYS.map((key) => { const val = STATUS[key]; return (<option key={key} value={key}>{val.icon} {val.label}</option>); })}</select></div>
              <div><label style={labelStyle}>🔧 Asignar Técnico</label><select value={editTechnicianId} onChange={(e) => setEditTechnicianId(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}><option value="">— Sin asignar —</option>{techniciansList.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 4 }}><button type="button" onClick={() => setEditingRepair(null)} style={{ padding: "12px 24px", background: "var(--bg-primary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button><button type="submit" disabled={uploading} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #149aa5, #1ab8c4)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 16px rgba(26,184,196,0.14)" }}>💾 Guardar Cambios</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL ENTREGAR EQUIPO ═══ */}
      {showDeliveryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.3s ease-out" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(26,184,196,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📱</div><div><h3 style={{ fontSize: 17, fontWeight: 700 }}>Entregar Equipo</h3><p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Selecciona la orden completada y verifica los datos</p></div></div><button onClick={() => setShowDeliveryModal(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>
              <div style={{ marginBottom: 20 }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>📋 Seleccionar Orden de Trabajo</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{completedRepairs.length === 0 ? (<div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 12, background: "var(--bg-primary)", borderRadius: 12 }}>No hay órdenes completadas para entregar</div>) : completedRepairs.filter(r => !deliverySelectedRepair || deliverySelectedRepair.id === r.id).map(repair => { const isSelected = deliverySelectedRepair?.id === repair.id; const repairImages = parseImages(repair.image); const firstImage = repairImages[0] || null; return (<div key={repair.id} onClick={() => selectDeliveryRepair(repair)} style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", border: `2px solid ${isSelected ? "#10b981" : "var(--border)"}`, background: isSelected ? "rgba(16,185,129,0.06)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}><div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: isSelected ? "none" : "2px solid var(--border)", background: isSelected ? "#10b981" : "transparent", color: "#fff", fontSize: 11, fontWeight: 800 }}>{isSelected ? "✓" : ""}</div>{firstImage ? (<div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}><img src={firstImage} alt={repair.device} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>) : (<div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✅</div>)}<div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: "monospace", fontSize: 12, color: "#1ab8c4", fontWeight: 700 }}>{repair.code}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{[repair.device, repair.brand, repair.model].filter(Boolean).join(" ")}</span></div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{repair.clientName && <span>👤 {repair.clientName}</span>}{repair.clientName && <span style={{ marginLeft: 8 }}>💰 Bs. {Math.round(repair.estimatedCost || 0).toLocaleString()}</span>}</div></div>{isSelected && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✕ Cambiar</span>}</div>); })}</div></div>
              {deliverySelectedRepair && (<>
                <div style={{ marginBottom: 20, padding: "14px 18px", background: "var(--bg-primary)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>📋 Resumen de la Orden</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{deliverySelectedRepair.clientName && <div><div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Cliente</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>👤 {deliverySelectedRepair.clientName}</div></div>}{deliverySelectedRepair.clientPhone && <div><div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Celular</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>📱 {deliverySelectedRepair.clientPhone}</div></div>}<div><div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Costo Total</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: "#f59e0b" }}>💰 Bs. {deliveryCost || deliverySelectedRepair.estimatedCost}</div></div></div></div>
                {Object.keys(deliveryAccChecked).length > 0 && (<div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(16,185,129,0.04)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.15)" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>🎒 Accesorios a Devolver</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{Object.entries(deliveryAccChecked).map(([accName, checked]) => (<div key={accName} onClick={() => setDeliveryAccChecked(prev => ({ ...prev, [accName]: !prev[accName] }))} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${checked ? "#10b981" : "var(--border)"}`, background: checked ? "rgba(16,185,129,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 8, userSelect: "none", transition: "all 0.15s" }}><div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: checked ? "none" : "2px solid var(--border)", background: checked ? "#10b981" : "transparent", color: "#fff", fontSize: 12, fontWeight: 800 }}>{checked ? "✓" : ""}</div><span style={{ fontSize: 12, fontWeight: 600, color: checked ? "#10b981" : "var(--text-muted)" }}>{accName}</span></div>))}</div></div>)}
                {servicesList.length > 0 && (<div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(168,85,247,0.04)", borderRadius: 12, border: `1px solid ${showDeliveryServices ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.1)"}` }}><div onClick={() => setShowDeliveryServices(!showDeliveryServices)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>🛠️ Servicios Realizados {deliverySelectedServices.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(168,85,247,0.15)", color: "#c084fc", fontWeight: 800 }}>{deliverySelectedServices.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showDeliveryServices ? "rgba(168,85,247,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#a855f7", transition: "all 0.2s", transform: showDeliveryServices ? "rotate(180deg)" : "none" }}>▾</div></div>{deliverySelectedServices.length > 0 && !showDeliveryServices && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{(deliverySelectedServices || []).map(name => { const svc = servicesList.find(s => s.name === name); return <span key={name} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7" }}>{svc?.icon} {name} — Bs.{svc?.price}</span>; })}</div>)}{showDeliveryServices && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchDeliveryServices} onChange={(e) => setSearchDeliveryServices(e.target.value)} placeholder="Buscar servicio..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchDeliveryServices && <span onClick={() => setSearchDeliveryServices("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{(filteredDeliveryServices || []).map((svc) => { const active = deliverySelectedServices.includes(svc.name); return (<div key={svc.id} onClick={() => toggleDeliveryService(svc.name)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#a855f7" : "var(--border)"}`, background: active ? "rgba(168,85,247,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#a855f7" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#a855f7" : "var(--text-muted)", lineHeight: 1.2 }}>{svc.icon} {svc.name}</div><div style={{ fontSize: 10, fontWeight: 800, color: active ? "#c084fc" : "var(--text-muted)" }}>Bs. {svc.price}</div></div></div>); })}</div>{filteredDeliveryServices.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No se encontraron servicios</div>}</div>)}</div>)}
                {softwareList.length > 0 && (<div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(139,92,246,0.04)", borderRadius: 12, border: `1px solid ${showDeliverySoftware ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.1)"}` }}><div onClick={() => setShowDeliverySoftware(!showDeliverySoftware)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>💿 Programas Instalados {deliverySelectedSoftware.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(139,92,246,0.15)", color: "#7c3aed", fontWeight: 800 }}>{deliverySelectedSoftware.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showDeliverySoftware ? "rgba(139,92,246,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8b5cf6", transition: "all 0.2s", transform: showDeliverySoftware ? "rotate(180deg)" : "none" }}>▾</div></div>{deliverySelectedSoftware.length > 0 && !showDeliverySoftware && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{(deliverySelectedSoftware || []).map(name => <span key={name} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#8b5cf6" }}>💿 {name}</span>)}</div>)}{showDeliverySoftware && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchDeliverySoftware} onChange={(e) => setSearchDeliverySoftware(e.target.value)} placeholder="Buscar programa..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchDeliverySoftware && <span onClick={() => setSearchDeliverySoftware("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{(filteredDeliverySoftware || []).map((sw) => { const active = deliverySelectedSoftware.includes(sw.name); return (<div key={sw.id} onClick={() => toggleDeliverySoftware(sw.name)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#8b5cf6" : "var(--border)"}`, background: active ? "rgba(139,92,246,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#8b5cf6" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#8b5cf6" : "var(--text-muted)", lineHeight: 1.2 }}>{sw.name}</div>{sw.category && <div style={{ fontSize: 9, color: active ? "#7c3aed" : "var(--text-muted)" }}>{sw.category}</div>}</div></div>); })}</div>{filteredDeliverySoftware.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No se encontraron programas</div>}</div>)}</div>)}
                {inventoryList.length > 0 && (<div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(245,158,11,0.04)", borderRadius: 12, border: `1px solid ${showDeliveryInventory ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)"}` }}><div onClick={() => setShowDeliveryInventory(!showDeliveryInventory)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>📦 Artículos del Inventario {deliverySelectedInventory.length > 0 && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontWeight: 800 }}>{deliverySelectedInventory.length}</span>}</div><div style={{ width: 26, height: 26, borderRadius: 6, background: showDeliveryInventory ? "rgba(245,158,11,0.15)" : "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#f59e0b", transition: "all 0.2s", transform: showDeliveryInventory ? "rotate(180deg)" : "none" }}>▾</div></div>{deliverySelectedInventory.length > 0 && !showDeliveryInventory && (<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>{(deliverySelectedInventory || []).map(id => { const item = inventoryList.find(i => i.id === id); return item ? <span key={id} style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>📦 {item.name} — Bs.{item.price}</span> : null; })}</div>)}{showDeliveryInventory && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-primary)", borderRadius: 6, padding: "0 10px", border: "1.5px solid #cbd5e8", marginBottom: 8 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>🔍</span><input value={searchDeliveryInventory} onChange={(e) => setSearchDeliveryInventory(e.target.value)} placeholder="Buscar artículo..." style={{ flex: 1, border: "none", background: "none", padding: "7px 0", color: "var(--text-primary)", fontSize: 11, outline: "none" }} />{searchDeliveryInventory && <span onClick={() => setSearchDeliveryInventory("")} style={{ cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>✕</span>}</div><div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 220, overflow: "auto" }}>{(filteredDeliveryInventory || []).map((item) => { const active = deliverySelectedInventory.includes(item.id); return (<div key={item.id} onClick={() => toggleDeliveryInventory(item.id)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `2px solid ${active ? "#f59e0b" : "var(--border)"}`, background: active ? "rgba(245,158,11,0.1)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: active ? "none" : "2px solid var(--border)", background: active ? "#f59e0b" : "transparent", color: "#fff", fontSize: 9, fontWeight: 800 }}>{active ? "✓" : ""}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 600, color: active ? "#f59e0b" : "var(--text-muted)", lineHeight: 1.2 }}>📦 {item.name}</div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span style={{ fontSize: 10, fontWeight: 800, color: active ? "#fbbf24" : "var(--text-muted)" }}>Bs. {item.price}</span><span style={{ fontSize: 9, color: item.quantity <= item.minStock ? "#ef4444" : "var(--text-muted)" }}>Stock: {item.quantity}</span></div></div></div>); })}</div>{filteredDeliveryInventory.length === 0 && <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 10 }}>No hay artículos disponibles</div>}</div>)}</div>)}
                <div style={{ marginBottom: 20 }}><label style={labelStyle}>📝 Notas de Entrega (Opcional)</label><textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Observaciones al momento de la entrega..." rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>
                {(deliverySelectedServices.length > 0 || deliverySelectedSoftware.length > 0 || deliverySelectedInventory.length > 0) && (<div style={{ marginBottom: 20, padding: "12px 16px", background: "var(--bg-primary)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>📋 Resumen Final</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{(deliverySelectedServices || []).map(name => { const svc = servicesList.find(s => s.name === name); return (<div key={name} style={{ padding: "4px 10px", background: "rgba(168,85,247,0.06)", borderRadius: 6, border: "1px solid rgba(168,85,247,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#a855f7" }}>🛠️ {name}</span><span style={{ fontSize: 11, fontWeight: 700, color: "#c084fc" }}>Bs. {svc?.price}</span></div>); })}{(deliverySelectedInventory || []).map(id => { const item = inventoryList.find(i => i.id === id); return item ? (<div key={id} style={{ padding: "4px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 6, border: "1px solid rgba(245,158,11,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b" }}>📦 {item.name}</span><span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>Bs. {item.price}</span></div>) : null; })}{(deliverySelectedSoftware || []).map(name => (<div key={name} style={{ padding: "4px 10px", background: "rgba(139,92,246,0.06)", borderRadius: 6, border: "1px solid rgba(139,92,246,0.1)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#8b5cf6" }}>💿 {name}</span></div>))}<div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Subtotal:</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Bs. {deliveryCost || deliverySelectedRepair.estimatedCost}</span></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>🏷️ Descuento:</span><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, color: "#ef4444" }}>Bs.</span><input type="number" min="0" value={deliveryDiscount} onChange={(e) => setDeliveryDiscount(e.target.value)} placeholder="0" style={{ width: 70, padding: "4px 8px", background: "var(--bg-hover)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#ef4444", fontSize: 12, fontWeight: 700, outline: "none", textAlign: "right" }} /></div></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "2px solid var(--border)" }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total a Cobrar:</span><span style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>Bs. {Math.max(0, Number(deliveryCost || deliverySelectedRepair.estimatedCost) - Number(deliveryDiscount || 0))}</span></div></div></div></div>)}
                <div style={{ display: "flex", gap: 10 }}><button onClick={() => setShowDeliveryModal(false)} style={{ padding: "12px 24px", background: "var(--bg-primary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button><button onClick={confirmDelivery} style={{ flex: 1, padding: "12px 28px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>📱 Confirmar Entrega</button></div>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL IMPRIMIR ═══ */}
      {printModal && (
        <div onClick={() => setPrintModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${printModal.type === "reception" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)"}`, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.2s ease-out", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: printModal.type === "reception" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🖨️</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{printModal.type === "reception" ? "Imprimir Recepción" : "Imprimir Entrega"}</h3>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>Orden: <span style={{ fontFamily: "monospace", color: printModal.type === "reception" ? "#3b82f6" : "#10b981", fontWeight: 700 }}>{printModal.code}</span></p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div onClick={() => { window.open(printModal.type === "reception" ? `/print/${printModal.code}?branchId=${activeBranch}` : `/delivery/${printModal.code}?branchId=${activeBranch}`, "_blank"); setPrintModal(null); }} style={{ padding: "16px 20px", borderRadius: 12, cursor: "pointer", border: "1.5px solid #cbd5e8", background: "var(--bg-primary)", display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s" }} onMouseEnter={(e) => { const c = printModal.type === "reception" ? "#3b82f6" : "#10b981"; e.currentTarget.style.borderColor = c; e.currentTarget.style.background = printModal.type === "reception" ? "rgba(59,130,246,0.06)" : "rgba(16,185,129,0.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: printModal.type === "reception" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📄</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Documento Completo</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{printModal.type === "reception" ? "Orden de trabajo con QR de seguimiento" : "Comprobante de entrega con QR"}</div>
                </div>
              </div>
              <div onClick={() => { printQROnly(printModal.code, printModal.type); setPrintModal(null); }} style={{ padding: "16px 20px", borderRadius: 12, cursor: "pointer", border: "1.5px solid #cbd5e8", background: "var(--bg-primary)", display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s" }} onMouseEnter={(e) => { const c = printModal.type === "reception" ? "#3b82f6" : "#10b981"; e.currentTarget.style.borderColor = c; e.currentTarget.style.background = printModal.type === "reception" ? "rgba(59,130,246,0.06)" : "rgba(16,185,129,0.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: printModal.type === "reception" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📱</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Solo Código QR</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{printModal.type === "reception" ? "QR azul de seguimiento para el cliente" : "QR verde comprobante de entrega"}</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL HISTORIAL DE CAMBIOS ═══ */}
      {historyModal && (
        <div onClick={() => setHistoryModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(129,140,248,0.25)", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeScale 0.2s ease-out", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(129,140,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📜</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Historial de cambios</h3>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>Orden: <span style={{ fontFamily: "monospace", color: "#2dd4df", fontWeight: 700 }}>{historyModal.code}</span></p>
              </div>
              <button onClick={() => setHistoryModal(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #cbd5e8", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "18px 22px", overflow: "auto", flex: 1 }}>
              <StatusTimeline repairId={historyModal.id} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(80px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
        .repair-card{transition:all 0.2s ease}
        .repair-card:hover{border-color:rgba(26,184,196,0.20)!important;transform:translateY(-1px);box-shadow:0 4px 16px rgba(26,29,46,0.08)}
      
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          [style*="grid-template-columns"]{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .card-compact{flex-direction:row!important}
          .card-img{width:60px!important;min-height:60px!important;max-height:80px!important;border-radius:10px!important;margin:10px!important;overflow:hidden!important}
          .card-compact p{max-width:100%!important;font-size:11px!important}
          .card-info{padding:10px 10px 10px 0!important}
          .card-info span{font-size:10px!important}
          .card-status{flex-direction:column!important;padding:8px!important;gap:4px!important;align-items:flex-end!important}
          .msg-layout{grid-template-columns:1fr!important}
          .filter-btns{overflow-x:auto;-webkit-overflow-scrolling:touch}
        }
      `}</style>

      
      <AppSidebar user={user} />

      {/* ═══ HEADER ═══ */}
      <header className="desktop-header" style={{ position: "fixed", top: 0, left: 210, right: 0, height: 60, background: "#ffffff", borderBottom: "1.5px solid #cbd5e8", boxShadow: "0 2px 8px rgba(30,42,58,0.06)", display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "0 24px", zIndex: 40, gap: 12 }}>
        <GlobalSearch inline />
        <div suppressHydrationWarning style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
          {/* Clock Card */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", background: "rgba(240,243,248,0.9)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: "#1ab8c4", letterSpacing: "1px" }}>{clock.time}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#2dd4df", padding: "2px 5px", background: "rgba(26,184,196,0.10)", borderRadius: 4 }}>{clock.period}</span>
              </div>
              <div style={{ width: 1, height: 24, background: "rgba(26,184,196,0.10)" }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3, textTransform: "capitalize" }}>{formatDate(now)}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>📍 La Paz, Bolivia</div>
              </div>
            </div>
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ width: 42, height: 42, borderRadius: 12, border: "1.5px solid #cbd5e8", background: showNotifications ? "rgba(26,184,196,0.08)" : "transparent", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, position: "relative", transition: "all 0.2s", border: "1.5px solid #cbd5e8" }}>
              🔔
              {unreadCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "linear-gradient(135deg, #ef4444, #dc2626)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", border: "2px solid var(--bg-primary)", boxShadow: "0 2px 8px rgba(239,68,68,0.4)", animation: "pulse 2s ease-in-out infinite" }}>{unreadCount}</span>}
            </button>
            {showNotifications && (<div style={{ position: "absolute", top: 46, right: 0, width: 380, maxHeight: 460, background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", boxShadow: "0 12px 48px rgba(26,29,46,0.40)", overflow: "hidden", zIndex: 50, animation: "fadeScale 0.2s ease-out" }}><div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones {unreadCount > 0 && <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", background: "rgba(239,68,68,0.12)", color: "#ef4444", borderRadius: 10, fontWeight: 600 }}>{unreadCount}</span>}</span><div style={{ display: "flex", gap: 10 }}>{unreadCount > 0 && <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#1ab8c4", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>✓ Leídas</button>}{notifications.length > 0 && <button onClick={clearAllNotifications} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>🗑️ Limpiar</button>}</div></div><div style={{ maxHeight: 400, overflow: "auto" }}>{notifications.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>🔔</div><p style={{ fontSize: 13 }}>Sin notificaciones</p></div> : notifications.map((notif, i) => (<div key={notif.id} onClick={() => markNotificationRead(notif.id)} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-light)", cursor: "pointer", background: notif.read ? "transparent" : "rgba(99,102,241,0.03)", display: "flex", gap: 12, alignItems: "flex-start", animation: `fadeIn 0.2s ease-out ${i * 0.03}s both` }}><span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{NOTIF_ICONS[notif.type] || "📋"}</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: notif.read ? 400 : 600, color: notif.read ? "var(--text-secondary)" : "var(--text-primary)" }}>{notif.title}</div><div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{notif.message}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{new Date(notif.createdAt).toLocaleString()}</div></div>{!notif.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1ab8c4", flexShrink: 0, marginTop: 6 }} />}</div>))}</div></div>)}
          </div>
        </div>
      </header>

      {/* ═══ CONTENIDO PRINCIPAL ═══ */}
      <div className="main-content" style={{ marginLeft: 210, paddingTop: 60 }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }} suppressHydrationWarning>{getGreeting()}, {user?.name?.split(" ")[0]} 👋</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Aquí está el resumen de tu taller</p>
          </div>
          {
            (() => {
              const stuckCount = repairs.filter(r => {
                if (r.status === "completed" || r.status === "delivered") return false;
                const d = Math.floor((Date.now() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                return d >= 7;
              }).length;
              const statItems = [
                { label: "Total Órdenes", value: stats.total,      icon: "📋", color: "#1ab8c4" },
                { label: "Pendientes",    value: stats.pending,    icon: "⏳", color: "#f59e0b" },
                { label: "En Progreso",   value: stats.inProgress, icon: "🔧", color: "#3b82f6" },
                { label: "Completadas",   value: stats.completed,  icon: "✅", color: "#10b981" },
                ...(stuckCount > 0 ? [{ label: "Estancadas", value: stuckCount, icon: "⚠️", color: "#ef4444" }] : [] as { label: string; value: number; icon: string; color: string }[]),
              ];
              return (
                <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: stuckCount > 0 ? "repeat(5, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
                  {statItems.map((s, i) => (
                    <div key={i} style={{ background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", borderTop: `4px solid ${s.color}`, boxShadow: "0 4px 20px rgba(30,42,58,0.10), 0 1px 4px rgba(30,42,58,0.06)", padding: "20px 20px 18px", animation: `cardIn 0.4s ease-out ${i * 0.08}s both`, position: "relative", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>{s.label}</div>
                          <div className="stat-value" style={{ fontSize: 34, fontWeight: 800, color: s.color, letterSpacing: "-1.5px", lineHeight: 1, animationDelay: `${0.2 + i * 0.1}s` }}>{s.value}</div>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}18`, border: `1.5px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          }

          {/* Acceso rápido */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#1ab8c4" }}>⚡</span> Acceso Rápido</div>
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
              {[
                { label: "Extracto", desc: "Reportes y movimientos", icon: "📊", color: "#8b5cf6", path: "/extracto" },
                { label: "Cotizaciones", desc: "COT y Notas de Venta", icon: "🧾", color: "#d97706", path: "/quotations" },
                { label: "Certificados", desc: "Licencias y garantías", icon: "🏅", color: "#ec4899", path: "/certificates" },
                { label: "Escáner QR", desc: "Buscar por QR", icon: "📷", color: "#0891b2", path: "/scanner" },
                { label: "Exportar mes", desc: "Reporte PDF mensual", icon: "📥", color: "#10b981", path: "__export_month__" },
              ].map((s, i) => (
                <button
                  key={s.path}
                  onClick={() => {
                    if (s.path === "__export_month__") {
                      const d = new Date();
                      const y = d.getFullYear(); const m = d.getMonth() + 1;
                      const ab = activeBranch ? `?branchId=${activeBranch}` : "";
                      window.open(`/reports/monthly/${y}/${m}${ab}`, "_blank");
                    } else {
                      router.push(s.path);
                    }
                  }}
                  style={{
                    padding: "18px 18px", background: "#ffffff",
                    borderRadius: 12, border: "1.5px solid #cbd5e8", boxShadow: "0 4px 20px rgba(30,42,58,0.09), 0 1px 3px rgba(30,42,58,0.05)",
                    animation: `cardIn 0.4s ease-out ${0.3 + i * 0.06}s both`,
                    position: "relative", overflow: "hidden", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = `${s.color}40`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = `${s.color}15`; }}
                >
                  <div style={{ position: "absolute", top: -10, right: -10, fontSize: 48, opacity: 0.08 }}>{s.icon}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: "-0.3px" }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240, maxWidth: 380, display: "flex", alignItems: "center", gap: 10, background: "var(--bg-card)", borderRadius: 12, padding: "0 16px", border: "1.5px solid #cbd5e8" }}><span style={{ color: "var(--text-muted)", fontSize: 14 }}>🔍</span><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por código, dispositivo, cliente..." style={{ flex: 1, border: "none", background: "none", padding: "12px 0", color: "var(--text-primary)", fontSize: 13, outline: "none" }} /></div>
            <div className="filter-btns" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[{ key: "all", label: "Todas", icon: "📋", color: "#1ab8c4" }, ...Object.entries(STATUS).map(([key, val]) => ({ key, label: val.label, icon: val.icon, color: val.color }))].map((f) => { const isActive = filterStatus === f.key; const count = f.key === "all" ? stats.total : (stats.byStatus[f.key] || 0); return (<button key={f.key} onClick={() => setFilterStatus(f.key)} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", background: isActive ? `${f.color}15` : "var(--bg-card)", border: isActive ? `1.5px solid ${f.color}40` : "1.5px solid var(--border)", color: isActive ? f.color : "var(--text-muted)" }}><span style={{ fontSize: 13 }}>{f.icon}</span>{f.label}{count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, minWidth: 18, textAlign: "center", background: isActive ? `${f.color}20` : "var(--bg-tertiary)", color: isActive ? f.color : "var(--text-muted)" }}>{count}</span>}</button>); })}</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              {completedRepairs.length > 0 && (<button onClick={openDeliveryModal} style={{ padding: "10px 20px", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.11)", borderRadius: 12, color: "#2dd4df", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>📱 Entregar <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 8, background: "rgba(26,184,196,0.08)", fontWeight: 800 }}>{completedRepairs.length}</span></button>)}
              <button onClick={() => router.push("/new-order")} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #149aa5, #1ab8c4)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 16px rgba(26,184,196,0.14)" }}>＋ Nueva Orden</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><h2 style={{ fontSize: 18, fontWeight: 700 }}>Reparaciones</h2><span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-card)", padding: "3px 10px", borderRadius: 10 }}>{totalRepairs}{totalRepairs !== stats.total ? ` de ${stats.total}` : ""}</span></div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-card" style={{ animation: `cardIn 0.4s ease-out ${i * 0.08}s both` }}>
                  <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-title" />
                    <div className="skeleton skeleton-text" />
                    <div className="skeleton skeleton-text-sm" />
                  </div>
                  <div style={{ width: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 12 }} />
                    <div className="skeleton" style={{ width: 50, height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRepairs.length === 0 ? (<div style={{ padding: 60, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 48, marginBottom: 16 }}>📋</div><h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No hay reparaciones</h3><p style={{ color: "var(--text-muted)", fontSize: 13 }}>Crea tu primera orden</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(filteredRepairs || []).map((repair, i) => {
                const st = STATUS[repair.status] || STATUS.pending;
                const isExpanded = expandedId === repair.id;
                const isDelivered = repair.status === "delivered";
                const currentTrackingIndex = isDelivered ? TRACKING_KEYS.length - 1 : TRACKING_KEYS.indexOf(repair.status);
                const nextStatus = !isDelivered && currentTrackingIndex >= 0 && currentTrackingIndex < TRACKING_KEYS.length - 1 ? TRACKING_KEYS[currentTrackingIndex + 1] : undefined;
                const repairAcc = parseAccessoriesDisplay(repair.accessories); const repairImages = parseImages(repair.image); const firstImage = repairImages[0] || null;
                const parsedAll = parseNotesAll(repair.notes, servicesList);
                const repairNotes = parsedAll.notes; const repairServices = parsedAll.services; const repairSoftware = parsedAll.software; const repairVideogames = parsedAll.videogames; const repairRepuestos = parsedAll.repuestos; const repairDeliveryNotes = parsedAll.deliveryNotes; const repairDiscount = parsedAll.discount;
                // Detectar OT estancada: +7 días sin cambios y status no final
                const daysSinceUpdate = Math.floor((Date.now() - new Date(repair.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                const isStuck = daysSinceUpdate >= 7 && repair.status !== "completed" && repair.status !== "delivered";
                return (
                  <div key={repair.id} data-repair-id={repair.id} className="repair-card" onClick={() => setExpandedId(isExpanded ? null : repair.id)} style={{ background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${isStuck ? "rgba(239,68,68,0.4)" : isExpanded ? st.color + "30" : "var(--border)"}`, cursor: "pointer", transition: "all 0.25s", animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`, overflow: "hidden", position: "relative", boxShadow: isStuck ? "0 0 0 1px rgba(239,68,68,0.2), 0 4px 20px rgba(239,68,68,0.08)" : undefined }}>
                    {!isExpanded && (
                      <div className="card-compact" style={{ display: "flex", alignItems: "stretch" }}>
                        {firstImage ? (<div className="card-img" onClick={(e) => { e.stopPropagation(); openImageViewer(repairImages, 0); }} style={{ width: 130, minHeight: 110, flexShrink: 0, cursor: "pointer", position: "relative", overflow: "hidden", border: "2px solid #1e2a3a", borderRadius: 10, margin: 10 }}><img src={firstImage} alt={repair.device} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /><div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 60%, var(--bg-card))" }} />{repairImages.length > 1 && <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "2px 7px", fontSize: 9, color: "#fff", fontWeight: 700, backdropFilter: "blur(4px)" }}>📷 {repairImages.length}</div>}</div>) : (<div className="card-img" style={{ width: 130, minHeight: 110, flexShrink: 0, background: `linear-gradient(135deg, ${st.bg}, var(--bg-card))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, borderRight: "1px solid var(--border)" }}>{st.icon}</div>)}
                        <div className="card-info" style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#1ab8c4", fontWeight: 800, background: "rgba(26,184,196,0.06)", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(26,184,196,0.08)", flexShrink: 0 }}>{repair.code}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{[repair.device, repair.brand, repair.model].filter(Boolean).join(" ")}</span>
                          </div>
                          <div className="filter-btns" style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                            {isStuck && <span title="Sin cambios hace más de 7 días" style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", animation: "pulse 2s ease-in-out infinite" }}>⚠️ ESTANCADA {daysSinceUpdate}d</span>}
                            {repair.clientName && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.07)", color: "var(--text-secondary)" }}>👤 Cliente: {repair.clientName}</span>}
                            {repair.clientPhone && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.07)", color: "var(--text-muted)" }}>📱 Cel: {repair.clientPhone}</span>}
                            {repair.technician && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", color: "#a855f7" }}>🔧 Técnico: {repair.technician.name}</span>}
                            {repair.issue && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#ef4444" }}>⚠️ Problema: {repair.issue}</span>}
                            {repairNotes && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)", color: "#f59e0b" }}>📝 Obs: {repairNotes}</span>}
                            {(repairServices || []).map(name => { const svc = servicesList.find(s => s.name === name); return <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.12)", color: "#a855f7" }}>{svc?.icon} Serv: {name}</span>; })}
                            {(repairSoftware || []).map(name => <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)", color: "#8b5cf6" }}>💿 Prog: {name}</span>)}
                            {(repairVideogames || []).map(name => <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#ef4444" }}>🎮 Juego: {name}</span>)}
                            {(repairRepuestos || []).map(name => <span key={name} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)", color: "#f59e0b" }}>📦 Rep: {name}</span>)}
                          </div>
                        </div>
                        <div className="card-status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", flexShrink: 0, borderLeft: `1px solid ${st.color}15` }}>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ padding: "5px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.color}25`, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>{st.icon} {st.label}</span>
                            <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 6, textAlign: "center", fontWeight: 700 }}>Bs. {Math.round(repair.estimatedCost || 0).toLocaleString()}</div>
                          </div>
                          <span style={{ fontSize: 14, color: "var(--text-muted)", transition: "transform 0.2s" }}>▾</span>
                        </div>
                      </div>
                    )}
                    {isExpanded && (
                      <div style={{ padding: "16px 18px", animation: "fadeIn 0.25s ease-out", borderTop: `2px solid ${st.color}20` }}>
                        {/* ═══ FOTOS (ancho completo) ═══ */}
                        {repairImages.length > 0 && (<div style={{ marginBottom: 14, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>{(repairImages || []).map((img, idx) => (<div key={idx} onClick={(e) => { e.stopPropagation(); openImageViewer(repairImages, idx); }} style={{ width: 180, height: 130, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "2px solid #1e2a3a", flexShrink: 0, position: "relative" }}><img src={img} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /><span style={{ position: "absolute", bottom: 3, left: 5, fontSize: 8, color: "#fff", background: "rgba(26,29,46,0.40)", padding: "1px 5px", borderRadius: 3 }}>{idx + 1}/{repairImages.length}</span></div>))}</div>)}

                        {/* ═══ LAYOUT: [CLIENTE+EQUIPO | SEGUIMIENTO] + [DETALLES] ═══ */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12 }}>

                          {/* COLUMNA IZQUIERDA: CLIENTE+EQUIPO lado a lado + DETALLES abajo */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                            {/* FILA: CLIENTE | EQUIPO */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              {/* CLIENTE */}
                              <div style={{ background: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1.5px solid #1e2a3a", boxShadow: "0 4px 16px rgba(30,42,58,0.12)" }}>
                                <div style={{ padding: "8px 14px", background: "#1e2a3a", borderBottom: "none", display: "flex", alignItems: "center", gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Cliente</span></div>
                                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f4", borderLeft: "3px solid #1ab8c4", boxShadow: "0 1px 3px rgba(30,42,58,0.04)" }}><div style={{ fontSize: 8, color: "#1ab8c4", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Nombre</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{repair.clientName || "—"}</div></div>
                                  <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f4", borderLeft: "3px solid #3b82f6", boxShadow: "0 1px 3px rgba(30,42,58,0.04)" }}><div style={{ fontSize: 8, color: "#3b82f6", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Celular</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{repair.clientPhone || "—"}</div></div>
                                  <div style={{ padding: "8px 10px", background: "var(--bg-primary)", borderRadius: 8, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Técnico Asignado</div><select value={repair.technicianId || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); assignTechnician(repair.id, e.target.value); }} style={{ width: "100%", padding: "4px 8px", background: "var(--bg-hover)", border: "1.5px solid #cbd5e8", borderRadius: 6, color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", marginTop: 3 }}><option value="">— Sin asignar —</option>{techniciansList.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                                </div>
                              </div>
                              {/* EQUIPO */}
                              <div style={{ background: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1.5px solid #1e2a3a", boxShadow: "0 4px 16px rgba(30,42,58,0.12)" }}>
                                <div style={{ padding: "8px 14px", background: "#1e2a3a", borderBottom: "none", display: "flex", alignItems: "center", gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1ab8c4" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg><span style={{ fontSize: 10, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase", letterSpacing: "0.6px" }}>Equipo</span></div>
                                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f4", borderLeft: "3px solid #8b5cf6", boxShadow: "0 1px 3px rgba(30,42,58,0.04)" }}><div style={{ fontSize: 8, color: "#8b5cf6", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Dispositivo</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{repair.device}</div></div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f4", borderLeft: "3px solid #f97316", boxShadow: "0 1px 3px rgba(30,42,58,0.04)" }}><div style={{ fontSize: 8, color: "#f97316", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Marca</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{repair.brand || "—"}</div></div><div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f4", borderLeft: "3px solid #d97706", boxShadow: "0 1px 3px rgba(30,42,58,0.04)" }}><div style={{ fontSize: 8, color: "#d97706", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Modelo</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{repair.model || "—"}</div></div></div>
                                  <div style={{ padding: "8px 10px", background: "rgba(26,184,196,0.05)", borderRadius: 8, border: "1px solid rgba(26,184,196,0.12)" }}><div style={{ fontSize: 8, color: "#1ab8c4", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Costo Est.</div><div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, color: "#1ab8c4" }}>Bs. {Math.round(repair.estimatedCost || 0).toLocaleString()}</div></div>
                                </div>
                              </div>
                            </div>
                            {/* DETALLES (ancho completo col 1) */}
                            <div style={{ background: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1.5px solid #1e2a3a", boxShadow: "0 4px 16px rgba(30,42,58,0.12)" }}>
                              <div style={{ padding: "8px 14px", background: "#1e2a3a", borderBottom: "none", display: "flex", alignItems: "center", gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Detalles</span></div>
                              <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>
                                {repair.issue && (<div style={{ padding: "10px 12px", background: "#fff1f2", borderRadius: 8, border: "1.5px solid #cbd5e8", borderLeft: "3px solid #e11d48" }}><div style={{ fontSize: 8, color: "#e11d48", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Problema</div><div style={{ fontSize: 11, marginTop: 3, color: "var(--text-primary)", lineHeight: 1.4 }}>{repair.issue}</div></div>)}
                                {repairNotes && (<div style={{ padding: "10px 12px", background: "rgba(26,184,196,0.06)", borderRadius: 8, border: "1.5px solid #cbd5e8", borderLeft: "3px solid #1ab8c4" }}><div style={{ fontSize: 8, color: "#1ab8c4", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Observaciones</div><div style={{ fontSize: 11, marginTop: 3, color: "var(--text-secondary)", lineHeight: 1.4 }}>{repairNotes}</div></div>)}
                                {repairServices.length > 0 && (<div style={{ padding: "10px 12px", background: "rgba(168,85,247,0.06)", borderRadius: 8, border: "1.5px solid #cbd5e8", borderLeft: "3px solid #a855f7" }}><div style={{ fontSize: 8, color: "#a855f7", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>Servicios</div><div className="filter-btns" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(repairServices || []).map((name) => { const svc = servicesList.find(s => s.name === name); return (<span key={name} style={{ padding: "2px 7px", background: "var(--bg-primary)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "var(--text-secondary)", border: "1.5px solid #cbd5e8" }}>{svc?.icon} {name}</span>); })}</div></div>)}
                                {repairSoftware.length > 0 && (<div style={{ padding: "10px 12px", background: "rgba(139,92,246,0.06)", borderRadius: 8, border: "1.5px solid #cbd5e8", borderLeft: "3px solid #8b5cf6" }}><div style={{ fontSize: 8, color: "#8b5cf6", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>💿 Programas</div><div className="filter-btns" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(repairSoftware || []).map((name) => (<span key={name} style={{ padding: "2px 7px", background: "var(--bg-primary)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "var(--text-secondary)", border: "1.5px solid #cbd5e8" }}>{name}</span>))}</div></div>)}
                                {repairVideogames.length > 0 && (<div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1.5px solid #cbd5e8", borderLeft: "3px solid #ef4444" }}><div style={{ fontSize: 8, color: "#ef4444", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>🎮 Videojuegos</div><div className="filter-btns" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(repairVideogames || []).map((name) => (<span key={name} style={{ padding: "2px 7px", background: "var(--bg-primary)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "var(--text-secondary)", border: "1.5px solid #cbd5e8" }}>{name}</span>))}</div></div>)}
                                {repairRepuestos.length > 0 && (<div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.06)", borderRadius: 8, border: "1.5px solid #cbd5e8", borderLeft: "3px solid #f59e0b" }}><div style={{ fontSize: 8, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>📦 Repuestos</div><div className="filter-btns" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(repairRepuestos || []).map((name) => (<span key={name} style={{ padding: "2px 7px", background: "rgba(26,184,196,0.06)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "#1ab8c4", border: "1px solid rgba(26,184,196,0.12)" }}>{name}</span>))}</div></div>)}
                                {isDelivered && repairDeliveryNotes && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid rgba(107,114,128,0.2)" }}><div style={{ fontSize: 8, color: "#6b7280", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>📋 Notas de Entrega</div><div style={{ fontSize: 11, marginTop: 3, color: "var(--text-secondary)", lineHeight: 1.4 }}>{repairDeliveryNotes}</div></div>)}
                                {isDelivered && Number(repairDiscount) > 0 && (<div style={{ padding: "8px 10px", background: "rgba(239,68,68,0.04)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}><div style={{ fontSize: 8, color: "#ef4444", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>🏷️ Descuento</div><div style={{ fontSize: 13, marginTop: 3, color: "#ef4444", fontWeight: 700 }}>- Bs. {repairDiscount}</div></div>)}
                              </div>
                            </div>
                          </div>

                          {/* COLUMNA DERECHA: SEGUIMIENTO (span 2 filas) */}
                          <div style={{ background: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1.5px solid #1e2a3a", borderTop: `3px solid ${st.color}`, boxShadow: "0 4px 20px rgba(30,42,58,0.09), 0 1px 3px rgba(30,42,58,0.05)", width: 280 }}>
                            <div style={{ padding: "8px 14px", background: "#1e2a3a", borderBottom: "none", display: "flex", alignItems: "center", gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Seguimiento</span><span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${st.color}35`, color: "#fff", border: `1px solid ${st.color}50` }}>{st.label}</span></div>
                            <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                              {/* DONUT */}
                              <div style={{ position: "relative", width: 180, height: 180 }}>
                                <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                                  {(() => {
                                    const allSteps = [...TRACKING_KEYS, ...(isDelivered ? ["delivered"] : [])];
                                    const totalSteps = allSteps.length;
                                    const gapDeg = 5;
                                    const totalGap = gapDeg * totalSteps;
                                    const availableDeg = 360 - totalGap;
                                    const segDeg = availableDeg / totalSteps;
                                    const r = 42; const cx = 50; const cy = 50;
                                    const circumference = 2 * Math.PI * r;
                                    return allSteps.map((key, idx) => {
                                      const startAngle = idx * (segDeg + gapDeg);
                                      const segLen = (segDeg / 360) * circumference;
                                      const gapLen = circumference - segLen;
                                      const offset = -(startAngle / 360) * circumference;
                                      const val = STATUS[key];
                                      const done = isDelivered ? true : idx <= currentTrackingIndex;
                                      const current = !isDelivered && idx === currentTrackingIndex;
                                      return (
                                        <circle key={key} cx={cx} cy={cy} r={r} fill="none"
                                          stroke={done ? val.color : "#e8ebf2"}
                                          strokeWidth={current ? 8 : 5}
                                          strokeDasharray={`${segLen} ${gapLen}`}
                                          strokeDashoffset={offset}
                                          strokeLinecap="round"
                                          style={{ transition: "all 0.6s ease", filter: current ? `drop-shadow(0 0 6px ${val.color})` : "none" }}
                                        />
                                      );
                                    });
                                  })()}
                                </svg>
                                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                  <div style={{ fontSize: 36 }}>{st.icon}</div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: st.color, marginTop: 2 }}>{st.label}</div>
                                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{new Date(repair.updatedAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                                </div>
                              </div>
                              {/* LEYENDA BARRAS */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                                {[...TRACKING_KEYS, ...(isDelivered ? ["delivered"] : [])].map((key, idx) => {
                                  const val = STATUS[key];
                                  const done = isDelivered ? true : idx <= currentTrackingIndex;
                                  const current = !isDelivered && idx === currentTrackingIndex;
                                  return (
                                    <div key={key} style={{ opacity: done ? 1 : 0.3 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                        <span style={{ fontSize: current ? 10 : 9, fontWeight: current ? 700 : 500, color: current ? val.color : "var(--text-muted)" }}>{val.label}</span>
                                        {done && !current && <span style={{ fontSize: 9, color: val.color }}>✓</span>}
                                        {current && <span style={{ fontSize: 7, padding: "1px 6px", borderRadius: 4, background: `${val.color}20`, color: val.color, fontWeight: 700 }}>ACTUAL</span>}
                                      </div>
                                      <div style={{ height: current ? 6 : 4, background: "var(--bg-primary)", borderRadius: 3, overflow: "hidden", border: "1.5px solid #cbd5e8" }}>
                                        <div style={{ width: done ? "100%" : "0%", height: "100%", background: current ? `linear-gradient(90deg, ${val.color}, ${val.color}aa)` : val.color, borderRadius: 3, transition: "width 0.8s ease", boxShadow: current ? `0 0 8px ${val.color}60` : "none" }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {repairDeliveryNotes && (<div style={{ width: "100%", padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 8, color: "#6b7280", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>📋 Notas Entrega</div><div style={{ fontSize: 10, marginTop: 3, color: "var(--text-secondary)", lineHeight: 1.4 }}>{repairDeliveryNotes}</div></div>)}
                            </div>
                          </div>
                        </div>

                        {/* ═══ ACCESORIOS (ancho completo) ═══ */}
                        {repairAcc.length > 0 && (
                          <div style={{ background: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1.5px solid #1e2a3a", boxShadow: "0 4px 16px rgba(30,42,58,0.12)", marginBottom: 12 }}>
                            <div style={{ padding: "8px 14px", background: "#1e2a3a", borderBottom: "none", display: "flex", alignItems: "center", gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1ab8c4" strokeWidth="2.5" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Accesorios</span><span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(26,184,196,0.25)", color: "#67e8f9", fontWeight: 700 }}>{repairAcc.length}</span></div>
                            <div style={{ padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {(repairAcc || []).map((a) => (<span key={a} style={{ padding: "5px 12px", background: "var(--bg-primary)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "var(--green)", border: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, color: "var(--green)" }}>✓</span> {a}</span>))}
                            </div>
                          </div>
                        )}

                        <div translate="no" className="filter-btns" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {nextStatus && <button onClick={(e) => { e.stopPropagation(); updateStatus(repair.id, nextStatus); }} style={{ ...btnAction, background: `${STATUS[nextStatus].color}14`, border: `1.5px solid ${STATUS[nextStatus].color}`, color: STATUS[nextStatus].color, fontWeight: 700 }}>{STATUS[nextStatus].icon} {STATUS[nextStatus].label}</button>}
                          <button onClick={(e) => { e.stopPropagation(); openEditForm(repair); }} style={{ ...btnAction, background: "rgba(26,184,196,0.10)", border: "1.5px solid #1ab8c4", color: "#0891b2", fontWeight: 700 }}>✏️ Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); const base = getBaseUrl(); const msg = `Estimado/a${repair.clientName ? ` *${repair.clientName}*` : ""},\n\nNos comunicamos de *${settings.companyName}* respecto a su equipo *${repair.device}${repair.brand ? ` ${repair.brand || "—"}` : ""}* (${repair.code}).\n\nPuede consultar el estado en:\n🔗 ${base}/portal\n\nAtentamente,\n*${settings.companyName}*`; sendWhatsApp(repair.clientPhone, msg); }} style={{ ...btnAction, background: "rgba(37,211,102,0.12)", border: "1.5px solid #25d366", color: "#16a34a", fontWeight: 700 }}>📲 WhatsApp</button>
                          <button onClick={(e) => { e.stopPropagation(); setHistoryModal({ id: repair.id, code: repair.code }); }} style={{ ...btnAction, background: "rgba(139,92,246,0.10)", border: "1.5px solid #8b5cf6", color: "#7c3aed", fontWeight: 700 }}>📜 Historial</button>
                          {!isDelivered && <button onClick={(e) => { e.stopPropagation(); setPrintModal({ code: repair.code, type: "reception" }); }} style={{ ...btnAction, background: "rgba(59,130,246,0.10)", border: "1.5px solid #3b82f6", color: "#1d4ed8", fontWeight: 700 }}>🖨️ Recepción</button>}
                          {repair.status === "delivered" && <button onClick={(e) => { e.stopPropagation(); setPrintModal({ code: repair.code, type: "delivery" }); }} style={{ ...btnAction, background: "rgba(16,185,129,0.10)", border: "1.5px solid #10b981", color: "#059669", fontWeight: 700 }}>🖨️ Entrega</button>}
                          <button onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar ${repair.code}?`)) deleteRepair(repair.id); }} style={{ ...btnAction, background: "rgba(239,68,68,0.08)", border: "1.5px solid #ef4444", color: "#e11d48", marginLeft: "auto", fontWeight: 700 }}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20, flexWrap: "wrap" }}>
              <button onClick={() => goToPage(1)} disabled={currentPage === 1} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e8", background: currentPage === 1 ? "var(--bg-tertiary)" : "var(--bg-card)", color: currentPage === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: currentPage === 1 ? "default" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>«</button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e8", background: currentPage === 1 ? "var(--bg-tertiary)" : "var(--bg-card)", color: currentPage === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: currentPage === 1 ? "default" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc: (number | string)[], p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`dots-${i}`} style={{ padding: "8px 6px", fontSize: 12, color: "var(--text-muted)" }}>...</span>
                  ) : (
                    <button key={p} onClick={() => goToPage(p as number)} style={{ padding: "8px 14px", borderRadius: 8, border: p === currentPage ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === currentPage ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === currentPage ? "#2dd4df" : "var(--text-secondary)", fontSize: 12, fontWeight: p === currentPage ? 800 : 600, cursor: "pointer", minWidth: 38, transition: "all 0.15s" }}>{p}</button>
                  )
                )}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e8", background: currentPage === totalPages ? "var(--bg-tertiary)" : "var(--bg-card)", color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: currentPage === totalPages ? "default" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}>›</button>
              <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e8", background: currentPage === totalPages ? "var(--bg-tertiary)" : "var(--bg-card)", color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: currentPage === totalPages ? "default" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}>»</button>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>Pág {currentPage} de {totalPages}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (<div><label style={labelStyle}>{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} /></div>);
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", background: "var(--bg-primary)", border: "1.5px solid #cbd5e8", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none" };
export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#1ab8c4", fontSize: 16 }}>Cargando...</div>}>
      <DashboardPage />
    </Suspense>
  );
}
