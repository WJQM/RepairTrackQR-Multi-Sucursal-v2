"use client";
import { useEffect, useState, useRef } from "react";
import { PortalTracker } from "@/components/PortalTracker";
import { PortalControls } from "@/components/PortalControls";
import { usePortalI18n } from "@/lib/use-portal";

interface InventoryItem {
  id: string; name: string; category: string | null; quantity: number;
  price: number; image: string | null; branch?: { id: string; name: string } | null;
}
interface SoftwareItem {
  id: string; name: string; category: string | null; image: string | null;
  minRequirements: string | null; recRequirements: string | null; size: string | null;
  description: string | null; language: string | null; rating: string | null;
  branch?: { id: string; name: string } | null;
}
interface VideogameItem {
  id: string; name: string; platform: string | null; genre: string | null;
  description: string | null; size: string | null; minRequirements: string | null;
  recRequirements: string | null; language: string | null; rating: string | null;
  image: string | null; branch?: { id: string; name: string } | null;
}
interface ConsoleItem {
  id: string; name: string; category: string | null; state: string | null;
  brand: string | null; model: string | null; color: string | null;
  storage: string | null; generation: string | null; accessories: string | null;
  condition: string; price: number; notes: string | null; image: string | null;
  branch?: { id: string; name: string } | null;
}
interface Equipment {
  id: string; code: string; name: string; type: string; brand: string | null; model: string | null;
  processor: string | null; ram: string | null; storage: string | null; storage2: string | null;
  screenSize: string | null; graphicsCard: string | null; os: string | null; cabinet: string | null;
  powerSupply: string | null; motherboard: string | null; accessories: string | null;
  condition: string; price: number; notes: string | null; image: string | null;
  createdAt: string; branch?: { id: string; name: string } | null;
}

function parseEqImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr.filter(Boolean); } catch {}
  return img.trim() ? [img] : [];
}

function getEqDisplayName(eq: Equipment): string {
  if (eq.type === "desktop") {
    const cab = (eq.cabinet || "").trim();
    return cab ? `PC Escritorio ${cab}` : "PC Escritorio";
  }
  return ["Laptop", eq.brand, eq.model].filter(Boolean).join(" ") || "Laptop";
}

const EQ_CONDITIONS: Record<string, { label: string; icon: string; color: string }> = {
  disponible: { label: "Disponible", icon: "✅", color: "#10b981" },
  vendido: { label: "Vendido", icon: "💰", color: "#1ab8c4" },
  en_reparacion: { label: "En reparación", icon: "🔧", color: "#f59e0b" },
};

const PLATFORM_COLORS: Record<string, string> = {
  "PC": "#3b82f6",
  "Nintendo Switch": "#ef4444",
  "Nintendo Wii": "#f59e0b",
  "PSP": "#0891b2",
  "PS Vita": "#8b5cf6",
  "PlayStation 4": "#0ea5e9",
  "PlayStation 5": "#2563eb",
  "Xbox 360": "#10b981",
  "Xbox One": "#16a34a",
  "Xbox Series X": "#16a34a",
  "Nintendo 3DS": "#f97316",
  "Nintendo DS": "#ea580c",
};
const getPlatformColor = (p: string | null) => (p && PLATFORM_COLORS[p]) || "#1ab8c4";

const CONSOLE_CAT_COLORS: Record<string, string> = {
  "Nintendo": "#ef4444",
  "Sony": "#3b82f6",
  "Microsoft": "#10b981",
  "Sega": "#8b5cf6",
  "Retro": "#f59e0b",
  "Atari": "#ec4899",
};
const getConsoleCatColor = (c: string | null) => (c && CONSOLE_CAT_COLORS[c]) || "#1ab8c4";

function getConsoleDisplayName(cn: { name: string; brand: string | null; model: string | null }): string {
  return [cn.brand, cn.name, cn.model].filter(Boolean).join(" ").trim() || cn.name;
}

const CONSOLE_CONDITIONS: Record<string, { label: string; icon: string; color: string }> = {
  disponible: { label: "Disponible", icon: "✅", color: "#10b981" },
  vendida: { label: "Vendida", icon: "💰", color: "#1ab8c4" },
  reservada: { label: "Reservada", icon: "🔖", color: "#f59e0b" },
};

export default function PortalPage() {
  const { t } = usePortalI18n();
  const [tab, setTab] = useState<"inventory" | "software" | "videogames" | "consoles" | "equipment">("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [software, setSoftware] = useState<SoftwareItem[]>([]);
  const [videogames, setVideogames] = useState<VideogameItem[]>([]);
  const [consoles, setConsoles] = useState<ConsoleItem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSw, setSelectedSw] = useState<SoftwareItem | null>(null);
  const [selectedVg, setSelectedVg] = useState<VideogameItem | null>(null);
  const [selectedCn, setSelectedCn] = useState<ConsoleItem | null>(null);
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [mounted, setMounted] = useState(false);
  const [pageInv, setPageInv] = useState(1);
  const [pageSw, setPageSw] = useState(1);
  const [pageVg, setPageVg] = useState(1);
  const [pageCn, setPageCn] = useState(1);
  const [pageEq, setPageEq] = useState(1);
  const PAGE_SIZE = 10;
  const [showScanner, setShowScanner] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerDivId = "portal-qr-reader";
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null; slogan: string }>({ companyName: "RepairTrackQR", logo: null, slogan: "" });

  useEffect(() => { setMounted(true); loadData(); fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo, slogan: d.slogan }).catch(() => {}); }).catch(() => {}); }, []);
  useEffect(() => { const interval = setInterval(() => loadData(true), 15000); return () => clearInterval(interval); }, []);

  // Deep link: ?eq={id} opens equipment modal automatically once data is loaded
  const [pendingEqId, setPendingEqId] = useState<string | null>(null);
  const [pendingCnId, setPendingCnId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const eqId = params.get("eq");
    if (eqId) setPendingEqId(eqId);
    const cnId = params.get("cn");
    if (cnId) setPendingCnId(cnId);
  }, []);
  useEffect(() => {
    if (!pendingEqId || equipment.length === 0) return;
    const upper = pendingEqId.toUpperCase();
    const found = equipment.find(e =>
      e.id === pendingEqId ||
      (e.code && e.code.toUpperCase() === upper)
    );
    if (found) {
      setTab("equipment");
      setSelectedEq(found);
      setCarouselIdx(0);
      setPendingEqId(null);
    }
  }, [pendingEqId, equipment]);
  useEffect(() => {
    if (!pendingCnId || consoles.length === 0) return;
    const upper = pendingCnId.toUpperCase();
    const found = consoles.find(c =>
      c.id === pendingCnId ||
      (c.code && c.code.toUpperCase() === upper)
    );
    if (found) {
      setTab("consoles");
      setSelectedCn(found);
      setCarouselIdx(0);
      setPendingCnId(null);
    }
  }, [pendingCnId, consoles]);

  // Keyboard navigation for equipment carousel
  useEffect(() => {
    if (!selectedEq) return;
    const imgs = parseEqImages(selectedEq.image);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If zoom viewer is open, close it first (don't close the equipment modal)
        if (viewImage) { setViewImage(null); return; }
        setSelectedEq(null);
        return;
      }
      if (viewImage) return; // arrows do nothing while zoom viewer is open
      if (imgs.length <= 1) return;
      if (e.key === "ArrowLeft") setCarouselIdx(i => (i - 1 + imgs.length) % imgs.length);
      if (e.key === "ArrowRight") setCarouselIdx(i => (i + 1) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEq, viewImage]);

  // Bloquear scroll del body cuando un modal está abierto
  useEffect(() => {
    const anyModalOpen = !!(selectedSw || selectedVg || selectedCn || selectedEq || viewImage);
    if (anyModalOpen) {
      // Calcular el ancho de la barra de scroll para compensar y evitar saltos
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const prevOverflow = document.body.style.overflow;
      const prevPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
      };
    }
  }, [selectedSw, selectedVg, selectedCn, selectedEq, viewImage]);

  const handleQrResult = (decodedText: string) => {
    const detected = detectQR(decodedText);
    navigateTo(detected);
  };

  function detectQR(text: string): { type: string; code: string } {
    const t = text.trim();
    // Equipment QR (either direct portal URL with ?eq= OR short code EQ-XXXXXX)
    if (t.includes("/portal?eq=") || t.includes("&eq=")) {
      const eqId = t.split(/[?&]eq=/).pop()?.split(/[&#]/)[0] || "";
      if (eqId) return { type: "equipment", code: eqId };
    }
    // Console QR (portal URL con ?cn= OR código corto CN-XXXXXX)
    if (t.includes("/portal?cn=") || t.includes("&cn=")) {
      const cnId = t.split(/[?&]cn=/).pop()?.split(/[&#]/)[0] || "";
      if (cnId) return { type: "console", code: cnId };
    }
    if (t.toUpperCase().startsWith("CN-")) return { type: "console-short", code: t.toUpperCase() };
    if (t.toUpperCase().startsWith("EQ-")) return { type: "equipment-short", code: t.toUpperCase() };
    if (t.includes("/delivery/")) return { type: "delivery", code: t.split("/delivery/").pop()?.split("?")[0] || t };
    if (t.includes("/track/")) return { type: "track", code: t.split("/track/").pop()?.split("?")[0] || t };
    if (t.includes("/certificate-view/")) return { type: "certificate", code: (t.split("/certificate-view/").pop()?.split("?")[0] || t).toUpperCase() };
    // URL de cotización/nota de venta impresa: /quotations/print/COT-XXX o /quotations/print/NV-XXX
    if (t.includes("/quotations/print/")) {
      const id = t.split("/quotations/print/").pop()?.split("?")[0] || t;
      return { type: id.toUpperCase().startsWith("NV") ? "sale" : "quotation", code: id };
    }
    // Compatibilidad con formato legacy: /quotations?view=...
    if (t.includes("/quotations?view=")) { const id = t.split("view=").pop()?.split("&")[0] || t; return { type: id.toUpperCase().startsWith("NV") ? "sale" : "quotation", code: id }; }
    const upper = t.toUpperCase();
    if (upper.startsWith("CE-")) return { type: "delivery", code: `OT-${upper.replace("CE-", "")}` };
    if (upper.startsWith("AE-")) return { type: "delivery", code: `OT-${upper.replace("AE-", "")}` };
    if (upper.startsWith("COT-")) return { type: "quotation", code: t };
    if (upper.startsWith("NV-")) return { type: "sale", code: t };
    if (upper.startsWith("CL-")) return { type: "certificate", code: t.toUpperCase() };
    return { type: "track", code: t };
  }

  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError] = useState("");

  const [branchPickerData, setBranchPickerData] = useState<{repairs: any[], type: string, code: string} | null>(null);

  const openEquipmentById = (eqId: string): boolean => {
    // Match by full id OR by code (e.g. "EQ-1", case insensitive)
    const upper = eqId.toUpperCase();
    const found = equipment.find(e => e.id === eqId || (e.code && e.code.toUpperCase() === upper));
    if (found) {
      setTab("equipment");
      setSelectedEq(found);
      setCarouselIdx(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
    return false;
  };

  const navigateTo = async (detected: { type: string; code: string }) => {
    setNavigating(true); setNavError("");

    // Equipment QR (full id from URL)
    if (detected.type === "equipment") {
      if (openEquipmentById(detected.code)) { setNavigating(false); return; }
      // If not in the current list yet, try to reload and retry
      try {
        const eqRes = await fetch("/api/equipment");
        if (eqRes.ok) {
          const items = await eqRes.json();
          setEquipment(items);
          const found = items.find((e: Equipment) => e.id === detected.code);
          if (found) { setTab("equipment"); setSelectedEq(found); setCarouselIdx(0); setNavigating(false); return; }
        }
      } catch {}
      setNavError(`No se encontró el equipo escaneado`); setNavigating(false); return;
    }

    // Equipment short code EQ-N (case insensitive)
    if (detected.type === "equipment-short") {
      if (openEquipmentById(detected.code)) { setNavigating(false); return; }
      try {
        const eqRes = await fetch("/api/equipment");
        if (eqRes.ok) {
          const items: Equipment[] = await eqRes.json();
          setEquipment(items);
          const upper = detected.code.toUpperCase();
          const found = items.find(e => e.code && e.code.toUpperCase() === upper);
          if (found) { setTab("equipment"); setSelectedEq(found); setCarouselIdx(0); setNavigating(false); return; }
        }
      } catch {}
      setNavError(`No se encontró el equipo: ${detected.code}`); setNavigating(false); return;
    }

    // Console QR (full id from URL)
    if (detected.type === "console") {
      const upper = detected.code.toUpperCase();
      let found = consoles.find(c => c.id === detected.code || (c.code && c.code.toUpperCase() === upper));
      if (found) {
        setTab("consoles"); setSelectedCn(found); setCarouselIdx(0); setNavigating(false);
        window.scrollTo({ top: 0, behavior: "smooth" }); return;
      }
      try {
        const cnRes = await fetch("/api/consoles");
        if (cnRes.ok) {
          const items: ConsoleItem[] = await cnRes.json();
          setConsoles(items);
          found = items.find(c => c.id === detected.code || (c.code && c.code.toUpperCase() === upper));
          if (found) { setTab("consoles"); setSelectedCn(found); setCarouselIdx(0); setNavigating(false); return; }
        }
      } catch {}
      setNavError(`No se encontró la consola escaneada`); setNavigating(false); return;
    }

    // Console short code CN-N (case insensitive)
    if (detected.type === "console-short") {
      const upper = detected.code.toUpperCase();
      let found = consoles.find(c => c.code && c.code.toUpperCase() === upper);
      if (found) {
        setTab("consoles"); setSelectedCn(found); setCarouselIdx(0); setNavigating(false);
        window.scrollTo({ top: 0, behavior: "smooth" }); return;
      }
      try {
        const cnRes = await fetch("/api/consoles");
        if (cnRes.ok) {
          const items: ConsoleItem[] = await cnRes.json();
          setConsoles(items);
          found = items.find(c => c.code && c.code.toUpperCase() === upper);
          if (found) { setTab("consoles"); setSelectedCn(found); setCarouselIdx(0); setNavigating(false); return; }
        }
      } catch {}
      setNavError(`No se encontró la consola: ${detected.code}`); setNavigating(false); return;
    }

    // CL - Certificado de Licencia
    if (detected.type === "certificate") {
      try {
        const res = await fetch(`/api/certificates?code=${detected.code}`);
        if (!res.ok) { setNavError(`No se encontró el certificado: ${detected.code}`); setNavigating(false); return; }
        const data = await res.json();
        if (data.multiple) {
          setBranchPickerData({ repairs: data.certificates.map((c: any) => ({ ...c, device: c.clientName, branchId: c.branch?.id || c.branchId })), type: "certificate", code: detected.code });
          setNavigating(false); return;
        }
        setNavigating(false);
        window.open(`/certificate-view/${detected.code}?branchId=${data.branchId || data.branch?.id}`, "_blank");
        return;
      } catch { setNavError("Error al buscar el certificado"); setNavigating(false); return; }
    }

    if (detected.type === "quotation" || detected.type === "sale") {
      try {
        const res = await fetch(`/api/quotations?code=${detected.code}`);
        if (!res.ok) { setNavError(`No se encontró el documento: ${detected.code}`); setNavigating(false); return; }
        const data = await res.json();
        if (data.multiple) {
          setBranchPickerData({ repairs: data.quotations.map((q: any) => ({ ...q, device: q.clientName || q.code })), type: detected.type, code: detected.code });
          setNavigating(false); return;
        }
        setNavigating(false);
        window.open(`/quotations/print/${detected.code}?branchId=${data.branchId}`, "_blank");
        return;
      } catch { setNavError("Error al buscar el documento"); setNavigating(false); return; }
    }
    if (detected.type === "delivery") {
      try {
        const res = await fetch(`/api/track/${detected.code}`);
        if (!res.ok) { setNavError(`No se encontró la orden: ${detected.code}`); setNavigating(false); return; }
        const data = await res.json();
        if (data.multiple) { setBranchPickerData({ repairs: data.repairs, type: "delivery", code: detected.code }); setNavigating(false); return; }
        setNavigating(false);
        window.open(`/delivery/view/${detected.code}?branchId=${data.branchId}`, "_blank");
        return;
      } catch { setNavError("Error al buscar la orden"); setNavigating(false); return; }
    }
    // track / code
    try {
      const res = await fetch(`/api/track/${detected.code}`);
      if (!res.ok) { setNavError(`No se encontró la orden: ${detected.code}`); setNavigating(false); return; }
      const data = await res.json();
      if (data.multiple) { setBranchPickerData({ repairs: data.repairs, type: "track", code: detected.code }); setNavigating(false); return; }
      setNavigating(false);
      window.location.href = `/track/${detected.code}?from=portal&branchId=${data.branchId}`;
    } catch { setNavError("Error al buscar la orden"); setNavigating(false); return; }
  };

  const handleBranchSelect = (repair: any) => {
    const branchId = repair.branchId;
    if (branchPickerData?.type === "certificate") {
      window.open(`/certificate-view/${branchPickerData.code}?branchId=${branchId}`, "_blank");
    } else if (branchPickerData?.type === "delivery") {
      window.open(`/delivery/view/${branchPickerData.code}?branchId=${branchId}`, "_blank");
    } else if (branchPickerData?.type === "quotation" || branchPickerData?.type === "sale") {
      window.open(`/quotations/print/${branchPickerData.code}?branchId=${branchId}`, "_blank");
    } else {
      window.location.href = `/track/${branchPickerData?.code}?from=portal&branchId=${branchId}`;
    }
    setBranchPickerData(null);
  };

  const startScanner = async () => {
    setShowScanner(true);
    setScannerError("");
    setScannerReady(false);
    // Release any existing media streams first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {}
    setTimeout(async () => {
      const tryStart = async (facingMode: string) => {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(scannerDivId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => { stopScanner(); handleQrResult(decodedText); },
          () => {}
        );
        setScannerReady(true);
      };
      try {
        await tryStart("environment");
      } catch (err: any) {
        // Fallback: try front camera
        if (err?.name === "NotReadableError" || err?.name === "OverconstrainedError") {
          try {
            await tryStart("user");
            return;
          } catch {}
        }
        setScannerError(
          err?.name === "NotReadableError" || err?.message?.includes("video source")
            ? "La cámara está en uso por otra aplicación (Teams, Zoom, otro tab). Ciérrala e intenta de nuevo, o sube una foto del QR."
            : err?.name === "NotAllowedError"
            ? "Permiso de cámara denegado. Habilítalo en la barra de dirección del navegador o sube una foto del QR."
            : "No se pudo iniciar la cámara. Puedes subir una foto del QR en su lugar."
        );
      }
    }, 400);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("portal-qr-file-temp");
      const result = await scanner.scanFile(file, true);
      handleQrResult(result);
    } catch {
      setScannerError("No se pudo leer el QR de la imagen. Intenta con otra foto más clara.");
    }
    e.target.value = "";
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
    setShowScanner(false);
    setScannerReady(false);
    setScannerError("");
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [invRes, swRes, vgRes, cnRes, eqRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/software"), fetch("/api/videogames"), fetch("/api/consoles"), fetch("/api/equipment")]);
      if (invRes.ok) setInventory(await invRes.json());
      if (swRes.ok) setSoftware(await swRes.json());
      if (vgRes.ok) setVideogames(await vgRes.json());
      if (cnRes.ok) setConsoles(await cnRes.json());
      if (eqRes.ok) setEquipment(await eqRes.json());
    } catch {}
    if (!silent) setLoading(false);
  };

  const invCategories = ["all", ...Array.from(new Set(inventory.map(i => i.category).filter(Boolean))) as string[]];
  const swCategories = ["all", ...Array.from(new Set(software.map(s => s.category).filter(Boolean))) as string[]];
  const vgCategories = ["all", ...Array.from(new Set(videogames.map(v => v.platform).filter(Boolean))) as string[]];
  const cnCategories = ["all", ...Array.from(new Set(consoles.map(c => c.category).filter(Boolean))) as string[]];
  const eqCategories = ["all", "laptop", "desktop"];
  const categories = tab === "inventory" ? invCategories : tab === "software" ? swCategories : tab === "videogames" ? vgCategories : tab === "consoles" ? cnCategories : eqCategories;
  const allBranches = ["all", ...Array.from(new Set([...inventory, ...software, ...videogames, ...consoles, ...equipment].map((x: any) => x.branch?.name).filter(Boolean))) as string[]];

  const filteredInventory = inventory.filter(i =>
    i.quantity > 0 &&
    (search === "" || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || i.category === categoryFilter) &&
    (branchFilter === "all" || i.branch?.name === branchFilter)
  );
  const filteredSoftware = software.filter(s =>
    (search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || (s.category || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || s.category === categoryFilter) &&
    (branchFilter === "all" || s.branch?.name === branchFilter)
  );
  const filteredVideogames = videogames.filter(v =>
    (search === "" ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.platform || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.genre || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || v.platform === categoryFilter) &&
    (branchFilter === "all" || v.branch?.name === branchFilter)
  );
  const filteredConsoles = consoles.filter(c =>
    c.condition === "disponible" &&
    (search === "" ||
      getConsoleDisplayName(c).toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.model || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || c.category === categoryFilter) &&
    (branchFilter === "all" || c.branch?.name === branchFilter)
  );
  const filteredEquipment = equipment.filter(e =>
    e.condition === "disponible" &&
    (search === "" ||
      getEqDisplayName(e).toLowerCase().includes(search.toLowerCase()) ||
      (e.processor || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.model || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || e.type === categoryFilter) &&
    (branchFilter === "all" || e.branch?.name === branchFilter)
  );
  const totalPagesInv = Math.ceil(filteredInventory.length / PAGE_SIZE);
  const pagedInventory = filteredInventory.slice((pageInv - 1) * PAGE_SIZE, pageInv * PAGE_SIZE);
  const totalPagesSw = Math.ceil(filteredSoftware.length / PAGE_SIZE);
  const pagedSoftware = filteredSoftware.slice((pageSw - 1) * PAGE_SIZE, pageSw * PAGE_SIZE);
  const totalPagesVg = Math.ceil(filteredVideogames.length / PAGE_SIZE);
  const pagedVideogames = filteredVideogames.slice((pageVg - 1) * PAGE_SIZE, pageVg * PAGE_SIZE);
  const totalPagesCn = Math.ceil(filteredConsoles.length / PAGE_SIZE);
  const pagedConsoles = filteredConsoles.slice((pageCn - 1) * PAGE_SIZE, pageCn * PAGE_SIZE);
  const totalPagesEq = Math.ceil(filteredEquipment.length / PAGE_SIZE);
  const pagedEquipment = filteredEquipment.slice((pageEq - 1) * PAGE_SIZE, pageEq * PAGE_SIZE);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eef2fa 0%, #f0f3f8 100%)", position: "relative", overflow: "hidden" }}>
      <PortalTracker />
      <PortalControls />
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .portal-card { transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; border-radius: 14px !important; }
        .portal-card:active { transform: scale(0.98); }
        .portal-card .card-img-wrap { position: relative; overflow: hidden; aspect-ratio: 4/3; background: linear-gradient(135deg, #f0f3f8, #e8ecf4); }
        .portal-card .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; display: block; }
        .portal-card:hover .card-img-wrap img { transform: scale(1.05); }
        .portal-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(30,42,58,0.16), 0 0 0 2px #1ab8c4; border-color: #1ab8c4 !important; }
        .tab-btn { padding: 10px 24px; border-radius: 12px; border: 1px solid transparent; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-muted); }
        .tab-btn:hover { color: var(--text-secondary); background: var(--bg-hover); }
        .tab-btn.active { background: rgba(26,184,196,0.12); color: #1ab8c4; border-color: rgba(26,184,196,0.35); font-weight: 700; }
        .cat-chip { padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-muted); white-space: nowrap; }
        .cat-chip:hover { border-color: rgba(26,184,196,0.14); color: var(--text-secondary); }
        .cat-chip.active { background: rgba(26,184,196,0.12); color: #1ab8c4; border-color: rgba(26,184,196,0.35); font-weight: 700; }
        .skeleton { background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
        @media(max-width:768px) {
          .portal-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .portal-header-content { flex-direction: column; text-align: center; }
          .portal-header-content h1 { font-size: 22px !important; }
          .portal-search { width: 100% !important; }
          .tab-btn { padding: 8px 16px; font-size: 13px; }
          .portal-top-bar { flex-direction: column; gap: 12px !important; }
          .cat-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap !important; }
          .portal-track-actions { flex-direction: column !important; }
          .portal-track-actions > * { width: 100% !important; flex: unset !important; }
          .portal-track-actions > div { width: 100% !important; }
          .portal-codes-ref { flex-wrap: wrap; }
          .eq-specs-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
        }
        @media(max-width:480px) {
          .portal-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .portal-header-content h1 { font-size: 19px !important; }
          .tab-btn { padding: 8px 12px; font-size: 12px; }
          .tab-btn span { display: none; }
        }
      `}</style>

      {/* Background effects */}
      <div style={{ position: "absolute", top: "5%", left: "50%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,184,196,0.08), transparent 70%)", transform: "translateX(-50%)", animation: "pulse 8s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.04), transparent 70%)", animation: "pulse 10s ease-in-out infinite 2s", pointerEvents: "none" }} />

      {/* Image viewer modal */}
      {viewImage && (
        <div onClick={() => setViewImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}>
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
            <img src={viewImage} alt="Producto" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", display: "block" }} />
            <button onClick={() => setViewImage(null)} style={{ position: "absolute", top: -12, right: -12, width: 32, height: 32, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}



      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "40px 20px 60px", opacity: mounted ? 1 : 0, transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>

        {/* Welcome Hero */}
        <div style={{ borderRadius: 16, border: "1px solid var(--border)", background: "#ffffff", boxShadow: "0 4px 20px rgba(30,42,58,0.10), 0 1px 4px rgba(30,42,58,0.06)", padding: "36px 32px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(26,184,196,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: "40%", width: 100, height: 100, borderRadius: "50%", background: "rgba(16,185,129,0.05)", pointerEvents: "none" }} />

          <div className="portal-header-content" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, position: "relative" }}>
            {settings.logo
              ? <img src={settings.logo} alt="Logo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "contain", flexShrink: 0, boxShadow: "0 8px 30px rgba(26,184,196,0.11)" }} />
              : <div style={{ width: 64, height: 64, borderRadius: 14, background: "linear-gradient(135deg, #1ab8c4, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 8px 30px rgba(26,184,196,0.14)", flexShrink: 0 }}>🛠️</div>}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{t("hero.welcome")}</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#1e2a3a", WebkitTextFillColor: "unset" }}>{settings.companyName}</h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5 }}>{settings.slogan || t("hero.slogan")}</p>
            </div>
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", position: "relative" }}>
            {[
              { icon: "📋", label: t("features.tracking"), color: "#1ab8c4", bg: "rgba(26,184,196,0.12)", border: "rgba(26,184,196,0.30)" },
              { icon: "📄", label: t("features.documents"), color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
              { icon: "🧾", label: t("features.quotes"), color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
              { icon: "📦", label: t("features.catalog"), color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)" },
              { icon: "💿", label: t("features.software"), color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
              { icon: "🎮", label: t("features.games"), color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
              { icon: "🕹️", label: t("features.consoles"), color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
              { icon: "💻", label: t("features.laptops"), color: "#0891b2", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.2)" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 10, background: f.bg, border: `1.5px solid ${f.border}`, boxShadow: "0 1px 4px rgba(30,42,58,0.06)" }}>
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: f.color }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Track order section */}
        <div style={{ padding: "20px 22px", background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", boxShadow: "0 2px 12px rgba(30,42,58,0.07)", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>📍</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>{t("consult.title")}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("consult.subtitle")}</div>
            </div>
          </div>

          {/* Codes reference */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }} className="portal-codes-ref">
            {[
              { prefix: "OT-#", label: "Seguimiento", color: "#1ab8c4", icon: "📋" },
              { prefix: "CE-#", label: "Entrega", color: "#10b981", icon: "📄" },
              { prefix: "COT-#", label: "Cotización", color: "#f59e0b", icon: "🧾" },
              { prefix: "NV-#", label: "Nota de Venta", color: "#a855f7", icon: "💰" },
              { prefix: "CL-#", label: "Licencia", color: "#ec4899", icon: "🏅" },
              { prefix: "EQ-#", label: "Equipo", color: "#0891b2", icon: "💻" },
              { prefix: "CN-#", label: "Consola", color: "#f97316", icon: "🕹️" },
            ].map(doc => (
              <span key={doc.prefix} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: `${doc.color}14`, color: doc.color, border: `1.5px solid ${doc.color}35`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {doc.icon} {doc.prefix}
              </span>
            ))}
          </div>

          <div className="portal-track-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={startScanner} style={{ padding: "12px 22px", background: "linear-gradient(135deg, #1ab8c4, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", justifyContent: "center" }}>
              📷 {t("consult.scan")}
            </button>
            <div style={{ display: "flex", flex: "1 1 auto", gap: 8 }}>
              <input
                id="trackInput"
                placeholder={t("consult.placeholder")}
                style={{ flex: 1, padding: "12px 16px", background: "#ffffff", border: "1.5px solid var(--border)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", minWidth: 120, fontFamily: "monospace", fontWeight: 600 }}
                onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) handleQrResult(v); } }}
              />
              <button
                onClick={() => { const el = document.getElementById("trackInput") as HTMLInputElement; if (el?.value.trim()) handleQrResult(el.value.trim()); }}
                disabled={navigating}
                style={{ padding: "12px 20px", background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 12px rgba(16,185,129,0.30)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: navigating ? "wait" : "pointer", whiteSpace: "nowrap", opacity: navigating ? 0.7 : 1 }}
              >{navigating ? "..." : t("consult.search")}</button>
            </div>
          </div>

          {navError && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(239,68,68,0.06)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.15)" }}>
              <p style={{ fontSize: 13, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>⚠️ {navError}</p>
            </div>
          )}
          {navigating && (
            <div style={{ marginTop: 12, textAlign: "center", padding: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("consult.searching")}</p>
            </div>
          )}
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 400, background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(26,184,196,0.10)", overflow: "hidden", animation: "fadeUp 0.3s ease-out" }}>
              <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #cbd5e8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>📷</span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Escanear QR</h3>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Apunta al código QR de tu orden</p>
                  </div>
                </div>
                <button onClick={stopScanner} style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ padding: 16 }}>
                <div id={scannerDivId} style={{ width: "100%", borderRadius: 12, overflow: "hidden", display: scannerError ? "none" : "block" }} />
                <div id="portal-qr-file-temp" style={{ display: "none" }} />
                {!scannerReady && !scannerError && (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }}>📷</div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Iniciando cámara...</p>
                  </div>
                )}
                {scannerError && (
                  <div style={{ padding: "24px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <p style={{ fontSize: 13, color: "#f59e0b", lineHeight: 1.6, marginBottom: 20 }}>{scannerError}</p>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: "none" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #1ab8c4, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        🖼️ Subir foto del QR
                      </button>
                      <button onClick={() => { stopScanner(); setTimeout(startScanner, 300); }} style={{ width: "100%", padding: "12px", background: "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        🔄 Reintentar cámara
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!scannerError && (
                <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: "none" }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    🖼️ Subir foto
                  </button>
                  <button onClick={stopScanner} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1.5px solid #cbd5e8", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs + Search */}
        <div className="portal-top-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`tab-btn${tab === "inventory" ? " active" : ""}`} onClick={() => { setTab("inventory"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}>
              📦 {t("tabs.products")} <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({inventory.filter(i => i.quantity > 0).length})</span>
            </button>
            <button className={`tab-btn${tab === "software" ? " active" : ""}`} onClick={() => { setTab("software"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}>
              💿 {t("tabs.software")} <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({software.length})</span>
            </button>
            <button className={`tab-btn${tab === "videogames" ? " active" : ""}`} onClick={() => { setTab("videogames"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}>
              🎮 {t("tabs.games")} <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({videogames.length})</span>
            </button>
            <button className={`tab-btn${tab === "consoles" ? " active" : ""}`} onClick={() => { setTab("consoles"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}>
              🕹️ {t("tabs.consoles")} <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({consoles.filter(c => c.condition === "disponible").length})</span>
            </button>
            <button className={`tab-btn${tab === "equipment" ? " active" : ""}`} onClick={() => { setTab("equipment"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}>
              💻 {t("tabs.equipment")} <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({equipment.filter(e => e.condition === "disponible").length})</span>
            </button>
          </div>
          <div className="portal-search" style={{ display: "flex", alignItems: "center", gap: 8, background: "#ffffff", borderRadius: 12, padding: "0 14px", border: "1.5px solid var(--border)", width: 300, boxShadow: "0 1px 4px rgba(30,42,58,0.05)" }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>🔍</span>
            <input
              value={search} onChange={(e) => { setSearch(e.target.value); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}
              placeholder={tab === "inventory" ? "Buscar producto..." : tab === "software" ? "Buscar programa..." : tab === "videogames" ? "Buscar videojuego, plataforma, género..." : tab === "consoles" ? "Buscar consola, marca, modelo..." : "Buscar equipo, marca, modelo, CPU..."}
              style={{ flex: 1, border: "none", background: "none", padding: "10px 0", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
            />
            {search && <span onClick={() => setSearch("")} style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>✕</span>}
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 2 && (
          <div className="cat-scroll" style={{ display: "flex", gap: 8, marginBottom: 10, paddingBottom: 4 }}>
            {(categories || []).map(cat => (
              <button key={cat} className={`cat-chip${categoryFilter === cat ? " active" : ""}`} onClick={() => { setCategoryFilter(cat); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }}>
                {cat === "all" ? "Todos" : cat === "laptop" ? "💻 Laptops" : cat === "desktop" ? "🖥️ Escritorio" : cat}
              </button>
            ))}
          </div>
        )}

        {/* Branch filters */}
        {allBranches.length > 2 && (
          <div className="cat-scroll" style={{ display: "flex", gap: 8, marginBottom: 20, paddingBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2dd4df", padding: "6px 0", whiteSpace: "nowrap" }}>🏢</span>
            {(allBranches || []).map(b => (
              <button key={b} className={`cat-chip${branchFilter === b ? " active" : ""}`} onClick={() => { setBranchFilter(b); setPageInv(1); setPageSw(1); setPageVg(1); setPageCn(1); setPageEq(1); }} style={branchFilter === b ? { borderColor: "#2dd4df", background: "rgba(26,184,196,0.08)", color: "#2dd4df" } : {}}>
                {b === "all" ? "Todas" : b}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 280 }} />
            ))}
          </div>
        )}

        {/* Inventory Grid */}
        {!loading && tab === "inventory" && (
          <>
            {filteredInventory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>{t("common.noResults")}</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? t("common.tryOther") : t("common.noProducts")}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {(pagedInventory || []).map((item, i) => (
                  <div key={item.id} className="portal-card" style={{ background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", boxShadow: "0 4px 16px rgba(30,42,58,0.10)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both` }}>
                    {item.image ? (
                      <div onClick={() => setViewImage(item.image)} style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", cursor: "pointer", position: "relative", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8, transition: "transform 0.3s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                        <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(30,42,58,0.80)", fontSize: 11, fontWeight: 700, color: item.quantity <= 5 ? "#ef4444" : "#10b981" }}>
                          Stock: {item.quantity}
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: "100%", aspectRatio: "1/1", background: "linear-gradient(135deg, #eef2fa, #e8ecf4)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <span style={{ fontSize: 48, opacity: 0.3 }}>📦</span>
                        <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(30,42,58,0.80)", fontSize: 11, fontWeight: 700, color: item.quantity <= 5 ? "#ef4444" : "#10b981" }}>
                          Stock: {item.quantity}
                        </div>
                      </div>
                    )}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        {item.category && <span style={{ fontSize: 9, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, letterSpacing: "0.5px" }}>{item.category}</span>}
                        {item.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#1ab8c4", padding: "2px 8px", borderRadius: 99, background: "rgba(26,184,196,0.08)", border: "1px solid rgba(26,184,196,0.20)" }}>🏢 {item.branch.name}</span>}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text-primary)", lineHeight: 1.3 }}>{item.name}</h3>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>Bs. {Math.round(item.price || 0).toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: item.quantity <= 5 ? "#ef4444" : "var(--text-muted)", fontWeight: 600 }}>
                          {item.quantity <= 5 ? "⚠️ Pocas unidades" : "✅ Disponible"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPagesInv > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 28 }}>
                <button onClick={() => { setPageInv(p => Math.max(1, p - 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageInv === 1} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageInv === 1 ? "transparent" : "var(--bg-card)", color: pageInv === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageInv === 1 ? "not-allowed" : "pointer", opacity: pageInv === 1 ? 0.4 : 1 }}>← Anterior</button>
                {Array.from({ length: totalPagesInv }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPageInv(p); window.scrollTo({ top: 500, behavior: "smooth" }); }} style={{ width: 36, height: 36, borderRadius: 8, border: p === pageInv ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === pageInv ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === pageInv ? "#2dd4df" : "var(--text-secondary)", fontSize: 13, fontWeight: p === pageInv ? 800 : 600, cursor: "pointer" }}>{p}</button>
                ))}
                <button onClick={() => { setPageInv(p => Math.min(totalPagesInv, p + 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageInv === totalPagesInv} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageInv === totalPagesInv ? "transparent" : "var(--bg-card)", color: pageInv === totalPagesInv ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageInv === totalPagesInv ? "not-allowed" : "pointer", opacity: pageInv === totalPagesInv ? 0.4 : 1 }}>Siguiente →</button>
              </div>
            )}
          </>
        )}

        {/* Software Grid */}
        {!loading && tab === "software" && (
          <>
            {filteredSoftware.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>No se encontraron programas</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? t("common.tryOther") : "No hay programas disponibles en este momento"}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {(pagedSoftware || []).map((sw, i) => {
                  const imgs = parseEqImages(sw.image);
                  const firstImg = imgs[0] || null;
                  return (
                    <div key={sw.id} onClick={() => { setSelectedSw(sw); setCarouselIdx(0); }} className="portal-card" style={{ background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", boxShadow: "0 4px 16px rgba(30,42,58,0.10)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both`, cursor: "pointer", position: "relative" }}>
                      {sw.category && <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, padding: "3px 10px", borderRadius: 6, background: "rgba(139,92,246,0.9)", color: "#fff", fontSize: 10, fontWeight: 700 }}>💿 {sw.category}</div>}
                      {sw.rating && <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.9)", color: "#fff", fontSize: 9, fontWeight: 700 }}>🔞 {sw.rating}</div>}
                      {firstImg ? (
                        <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden" }}>
                          <img src={firstImg} alt={sw.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        </div>
                      ) : (
                        <div style={{ width: "100%", aspectRatio: "3/4", background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(139,92,246,0.04))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 56, opacity: 0.3 }}>💿</span>
                        </div>
                      )}
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          {sw.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#1ab8c4", padding: "2px 8px", borderRadius: 99, background: "rgba(26,184,196,0.08)", border: "1px solid rgba(26,184,196,0.20)" }}>🏢 {sw.branch.name}</span>}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text-primary)", lineHeight: 1.3 }}>{sw.name}</h3>
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {sw.size && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", color: "#2dd4df", fontWeight: 600 }}>💾 {sw.size}</span>}
                          {sw.language && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)", color: "#0891b2", fontWeight: 600 }}>🌐 {sw.language}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPagesSw > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 28 }}>
                <button onClick={() => { setPageSw(p => Math.max(1, p - 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageSw === 1} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageSw === 1 ? "transparent" : "var(--bg-card)", color: pageSw === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageSw === 1 ? "not-allowed" : "pointer", opacity: pageSw === 1 ? 0.4 : 1 }}>← Anterior</button>
                {Array.from({ length: totalPagesSw }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPageSw(p); window.scrollTo({ top: 500, behavior: "smooth" }); }} style={{ width: 36, height: 36, borderRadius: 8, border: p === pageSw ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === pageSw ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === pageSw ? "#2dd4df" : "var(--text-secondary)", fontSize: 13, fontWeight: p === pageSw ? 800 : 600, cursor: "pointer" }}>{p}</button>
                ))}
                <button onClick={() => { setPageSw(p => Math.min(totalPagesSw, p + 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageSw === totalPagesSw} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageSw === totalPagesSw ? "transparent" : "var(--bg-card)", color: pageSw === totalPagesSw ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageSw === totalPagesSw ? "not-allowed" : "pointer", opacity: pageSw === totalPagesSw ? 0.4 : 1 }}>Siguiente →</button>
              </div>
            )}
          </>
        )}

        {/* Videogames Grid */}
        {!loading && tab === "videogames" && (
          <>
            {filteredVideogames.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>No se encontraron videojuegos</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? t("common.tryOther") : "No hay videojuegos disponibles en este momento"}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {(pagedVideogames || []).map((vg, i) => {
                  const imgs = parseEqImages(vg.image);
                  const firstImg = imgs[0] || null;
                  const platColor = getPlatformColor(vg.platform);
                  return (
                    <div key={vg.id} onClick={() => { setSelectedVg(vg); setCarouselIdx(0); }} className="portal-card" style={{ background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", boxShadow: "0 4px 16px rgba(30,42,58,0.10)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both`, cursor: "pointer", position: "relative" }}>
                      {vg.platform && <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, padding: "3px 10px", borderRadius: 6, background: `${platColor}dd`, color: "#fff", fontSize: 10, fontWeight: 700 }}>🎮 {vg.platform}</div>}
                      {vg.rating && <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.9)", color: "#fff", fontSize: 9, fontWeight: 700 }}>🔞 {vg.rating}</div>}
                      {firstImg ? (
                        <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden" }}>
                          <img src={firstImg} alt={vg.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        </div>
                      ) : (
                        <div style={{ width: "100%", aspectRatio: "3/4", background: `linear-gradient(135deg, ${platColor}14, ${platColor}04)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 56, opacity: 0.3 }}>🎮</span>
                        </div>
                      )}
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          {vg.genre && <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px" }}>{vg.genre}</span>}
                          {vg.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#1ab8c4", padding: "2px 8px", borderRadius: 99, background: "rgba(26,184,196,0.08)", border: "1px solid rgba(26,184,196,0.20)" }}>🏢 {vg.branch.name}</span>}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text-primary)", lineHeight: 1.3 }}>{vg.name}</h3>
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {vg.size && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", color: "#2dd4df", fontWeight: 600 }}>💾 {vg.size}</span>}
                          {vg.language && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)", color: "#0891b2", fontWeight: 600 }}>🌐 {vg.language}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPagesVg > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 28 }}>
                <button onClick={() => { setPageVg(p => Math.max(1, p - 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageVg === 1} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageVg === 1 ? "transparent" : "var(--bg-card)", color: pageVg === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageVg === 1 ? "not-allowed" : "pointer", opacity: pageVg === 1 ? 0.4 : 1 }}>← Anterior</button>
                {Array.from({ length: totalPagesVg }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPageVg(p); window.scrollTo({ top: 500, behavior: "smooth" }); }} style={{ width: 36, height: 36, borderRadius: 8, border: p === pageVg ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === pageVg ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === pageVg ? "#2dd4df" : "var(--text-secondary)", fontSize: 13, fontWeight: p === pageVg ? 800 : 600, cursor: "pointer" }}>{p}</button>
                ))}
                <button onClick={() => { setPageVg(p => Math.min(totalPagesVg, p + 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageVg === totalPagesVg} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageVg === totalPagesVg ? "transparent" : "var(--bg-card)", color: pageVg === totalPagesVg ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageVg === totalPagesVg ? "not-allowed" : "pointer", opacity: pageVg === totalPagesVg ? 0.4 : 1 }}>Siguiente →</button>
              </div>
            )}
          </>
        )}

        {/* Videogame Detail Modal */}
        {selectedVg && (() => {
          const vg = selectedVg;
          const imgs = parseEqImages(vg.image);
          const platColor = getPlatformColor(vg.platform);
          const currentImg = imgs[carouselIdx] || null;
          return (
            <div onClick={() => setSelectedVg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, overflowY: "auto" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${platColor}40`, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeUp 0.3s ease-out" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>🎮</span>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{vg.name}</h3>
                      {vg.platform && <span style={{ fontSize: 10, fontWeight: 700, color: platColor }}>{vg.platform}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedVg(null)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>

                {imgs.length > 0 ? (
                  <div style={{ padding: "16px 20px 8px" }}>
                    <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14, overflow: "hidden", background: "var(--bg-tertiary)", position: "relative", maxHeight: 420 }}>
                      {currentImg && <img src={currentImg} alt={vg.name} style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "zoom-in" }} onClick={() => setViewImage(currentImg)} />}
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setCarouselIdx(i => (i - 1 + imgs.length) % imgs.length)} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>‹</button>
                          <button onClick={() => setCarouselIdx(i => (i + 1) % imgs.length)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>›</button>
                          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", padding: "3px 10px", borderRadius: 12, background: "rgba(26,29,46,0.45)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{carouselIdx + 1} / {imgs.length}</div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px 8px" }}>
                    <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14, background: `linear-gradient(135deg, ${platColor}14, ${platColor}04)`, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", maxHeight: 380 }}>
                      <span style={{ fontSize: 64, opacity: 0.3 }}>🎮</span>
                    </div>
                  </div>
                )}

                <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {vg.platform && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${platColor}18`, color: platColor, border: `1px solid ${platColor}30` }}>🎮 {vg.platform}</span>}
                    {vg.genre && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(139,92,246,0.12)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.25)" }}>🎭 {vg.genre}</span>}
                    {vg.rating && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>🔞 {vg.rating}</span>}
                    {vg.language && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(6,182,212,0.12)", color: "#0891b2", border: "1px solid rgba(6,182,212,0.25)" }}>🌐 {vg.language}</span>}
                    {vg.size && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(26,184,196,0.07)", color: "#2dd4df", border: "1px solid rgba(26,184,196,0.11)" }}>💾 {vg.size}</span>}
                    {vg.branch && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#2dd4df", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.10)" }}>🏢 {vg.branch.name}</span>}
                  </div>

                  {vg.description && (
                    <div style={{ padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, letterSpacing: "0.5px", marginBottom: 4 }}>📝 Descripción</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{vg.description}</div>
                    </div>
                  )}

                  {vg.platform === "PC" && vg.minRequirements && (
                    <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 12, border: "1.5px solid #fde68a" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>⚙️ Requisitos mínimos</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{vg.minRequirements}</div>
                    </div>
                  )}

                  {vg.platform === "PC" && vg.recRequirements && (
                    <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.06)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.15)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>⚡ Requisitos recomendados</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{vg.recRequirements}</div>
                    </div>
                  )}

                  <div style={{ padding: "16px 18px", background: "rgba(26,184,196,0.06)", borderRadius: 12, border: "1.5px solid rgba(26,184,196,0.25)", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#4a5878", lineHeight: 1.6, fontWeight: 500 }}>
                      📞 ¿Te interesa este videojuego? Contáctanos {vg.branch ? <>en <strong style={{ color: "#2dd4df" }}>{vg.branch.name}</strong></> : "en nuestra tienda"} para más información.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Consoles Grid */}
        {!loading && tab === "consoles" && (
          <>
            {filteredConsoles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🕹️</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>No se encontraron consolas</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? t("common.tryOther") : "No hay consolas disponibles en este momento"}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {(pagedConsoles || []).map((cn, i) => {
                  const imgs = parseEqImages(cn.image);
                  const firstImg = imgs[0] || null;
                  const catColor = getConsoleCatColor(cn.category);
                  const dName = getConsoleDisplayName(cn);
                  return (
                    <div key={cn.id} onClick={() => { setSelectedCn(cn); setCarouselIdx(0); }} className="portal-card" style={{ background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", boxShadow: "0 4px 16px rgba(30,42,58,0.10)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both`, cursor: "pointer", position: "relative" }}>
                      {cn.category && <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, padding: "3px 10px", borderRadius: 6, background: `${catColor}dd`, color: "#fff", fontSize: 10, fontWeight: 700 }}>{cn.category}</div>}
                      {cn.state && <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: cn.state === "Nueva" ? "rgba(16,185,129,0.85)" : "rgba(245,158,11,0.85)", color: "#fff", fontSize: 10, fontWeight: 700 }}>{cn.state === "Nueva" ? "✨" : "🔄"} {cn.state}</div>}
                      {imgs.length > 1 && <div style={{ position: "absolute", ...(cn.state ? { top: 38 } : { top: 10 }), right: 10, zIndex: 2, padding: "2px 8px", borderRadius: 6, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 700 }}>📷 {imgs.length}</div>}
                      {firstImg ? (
                        <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={firstImg} alt={dName} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8, transition: "transform 0.3s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        </div>
                      ) : (
                        <div style={{ width: "100%", aspectRatio: "1/1", background: `linear-gradient(135deg, ${catColor}14, ${catColor}04)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 56, opacity: 0.3 }}>🕹️</span>
                        </div>
                      )}
                      <div style={{ padding: "14px 16px" }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 6 }}>{dName}</h3>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>Bs. {Math.round(cn.price).toLocaleString()}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {cn.storage && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.08)", color: "#2dd4df", fontWeight: 600 }}>💾 {cn.storage}</span>}
                          {cn.color && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", color: "#7c3aed", fontWeight: 600 }}>🎨 {cn.color}</span>}
                          {cn.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#1ab8c4", padding: "2px 8px", borderRadius: 99, background: "rgba(26,184,196,0.08)", border: "1px solid rgba(26,184,196,0.20)" }}>🏢 {cn.branch.name}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPagesCn > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 28 }}>
                <button onClick={() => { setPageCn(p => Math.max(1, p - 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageCn === 1} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageCn === 1 ? "transparent" : "var(--bg-card)", color: pageCn === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageCn === 1 ? "not-allowed" : "pointer", opacity: pageCn === 1 ? 0.4 : 1 }}>← Anterior</button>
                {Array.from({ length: totalPagesCn }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPageCn(p); window.scrollTo({ top: 500, behavior: "smooth" }); }} style={{ width: 36, height: 36, borderRadius: 8, border: p === pageCn ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === pageCn ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === pageCn ? "#2dd4df" : "var(--text-secondary)", fontSize: 13, fontWeight: p === pageCn ? 800 : 600, cursor: "pointer" }}>{p}</button>
                ))}
                <button onClick={() => { setPageCn(p => Math.min(totalPagesCn, p + 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageCn === totalPagesCn} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageCn === totalPagesCn ? "transparent" : "var(--bg-card)", color: pageCn === totalPagesCn ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageCn === totalPagesCn ? "not-allowed" : "pointer", opacity: pageCn === totalPagesCn ? 0.4 : 1 }}>Siguiente →</button>
              </div>
            )}
          </>
        )}

        {/* Console Detail Modal */}
        {selectedCn && (() => {
          const cn = selectedCn;
          const imgs = parseEqImages(cn.image);
          const catColor = getConsoleCatColor(cn.category);
          const currentImg = imgs[carouselIdx] || null;
          const cond = CONSOLE_CONDITIONS[cn.condition] || CONSOLE_CONDITIONS.disponible;
          const dName = getConsoleDisplayName(cn);
          return (
            <div onClick={() => setSelectedCn(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, overflowY: "auto" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto", background: "var(--bg-card)", borderRadius: 12, border: `1px solid ${catColor}40`, boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeUp 0.3s ease-out" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>🕹️</span>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{dName}</h3>
                      {cn.category && <span style={{ fontSize: 10, fontWeight: 700, color: catColor }}>{cn.category}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedCn(null)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>

                {imgs.length > 0 ? (
                  <div style={{ padding: "16px 20px 8px" }}>
                    <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", background: "var(--bg-tertiary)", position: "relative", maxHeight: 420 }}>
                      {currentImg && <img src={currentImg} alt={dName} style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "zoom-in" }} onClick={() => setViewImage(currentImg)} />}
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setCarouselIdx(i => (i - 1 + imgs.length) % imgs.length)} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>‹</button>
                          <button onClick={() => setCarouselIdx(i => (i + 1) % imgs.length)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>›</button>
                          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", padding: "3px 10px", borderRadius: 12, background: "rgba(26,29,46,0.45)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{carouselIdx + 1} / {imgs.length}</div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px 8px" }}>
                    <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 14, background: `linear-gradient(135deg, ${catColor}14, ${catColor}04)`, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", maxHeight: 380 }}>
                      <span style={{ fontSize: 64, opacity: 0.3 }}>🕹️</span>
                    </div>
                  </div>
                )}

                <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cn.category && <span style={{ padding: "5px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${catColor}15`, color: catColor, border: `1.5px solid ${catColor}40` }}>🏷️ {cn.category}</span>}
                    {cn.state && <span style={{ padding: "5px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: cn.state === "Nueva" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", color: cn.state === "Nueva" ? "#16a34a" : "#c9952a", border: `1.5px solid ${cn.state === "Nueva" ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}` }}>{cn.state === "Nueva" ? "✨" : "🔄"} {cn.state}</span>}
                    <span style={{ padding: "5px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${cond.color}15`, color: cond.color, border: `1.5px solid ${cond.color}40` }}>{cond.icon} {cond.label}</span>
                    {cn.branch && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#2dd4df", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.10)" }}>🏢 {cn.branch.name}</span>}
                  </div>

                  {/* Price */}
                  <div style={{ padding: "18px 20px", background: "linear-gradient(135deg, rgba(26,184,196,0.12), rgba(26,184,196,0.06))", borderRadius: 12, border: "2px solid rgba(26,184,196,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", boxShadow: "0 4px 16px rgba(26,184,196,0.12)" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, textAlign: "center" }}>PRECIO</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "#1ab8c4", lineHeight: 1, letterSpacing: "-1.5px" }}>Bs. {Math.round(cn.price).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Especificaciones */}
                  {(cn.brand || cn.model || cn.color || cn.storage || cn.generation) && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#1e2a3a", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#1ab8c4" }}>◆</span> Especificaciones</div>
                      <div style={{ padding: "16px 18px", background: "transparent", borderRadius: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, border: "none" }}>
                        {cn.brand && <div style={{ minWidth: 0, background: "rgba(26,184,196,0.10)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(26,184,196,0.20)" }}><div style={{ fontSize: 9, fontWeight: 700, color: "#0891b2", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>MARCA</div><div style={{ fontSize: 13, fontWeight: 700, color: "#1ab8c4" }}>{cn.brand}</div></div>}
                        {cn.model && <div style={{ minWidth: 0, background: "rgba(79,70,229,0.10)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(79,70,229,0.20)" }}><div style={{ fontSize: 9, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>MODELO</div><div style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>{cn.model}</div></div>}
                        {cn.color && <div style={{ minWidth: 0, background: "rgba(124,58,237,0.10)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(124,58,237,0.20)" }}><div style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>COLOR</div><div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{cn.color}</div></div>}
                        {cn.storage && <div style={{ minWidth: 0, background: "rgba(217,119,6,0.10)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(217,119,6,0.20)" }}><div style={{ fontSize: 9, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>ALMACENAMIENTO</div><div style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>{cn.storage}</div></div>}
                        {cn.generation && <div style={{ minWidth: 0, background: "rgba(14,116,144,0.10)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(14,116,144,0.20)" }}><div style={{ fontSize: 9, fontWeight: 700, color: "#0e7490", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>GENERACIÓN</div><div style={{ fontSize: 13, fontWeight: 700, color: "#1ab8c4" }}>{cn.generation}</div></div>}
                      </div>
                    </div>
                  )}

                  {cn.accessories && (
                    <div style={{ padding: "14px 16px", background: "#ffffff", borderRadius: 12, border: "1.5px solid #e2e8f5", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>ACCESORIOS INCLUIDOS</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cn.accessories}</div>
                    </div>
                  )}

                  {cn.notes && (
                    <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 12, border: "1.5px solid #fde68a" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#c9952a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>NOTAS</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cn.notes}</div>
                    </div>
                  )}

                  <div style={{ padding: "16px 18px", background: "rgba(26,184,196,0.06)", borderRadius: 12, border: "1.5px solid rgba(26,184,196,0.25)", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#4a5878", lineHeight: 1.6, fontWeight: 500 }}>
                      📞 ¿Te interesa esta consola? Contáctanos {cn.branch ? <>en <strong style={{ color: "#1ab8c4", fontWeight: 700 }}>{cn.branch.name}</strong></> : "en nuestra tienda"} para más información.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Software Detail Modal */}
        {selectedSw && (() => {
          const sw = selectedSw;
          const imgs = parseEqImages(sw.image);
          const currentImg = imgs[carouselIdx] || null;
          return (
            <div onClick={() => setSelectedSw(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, overflowY: "auto" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 20px 60px rgba(26,29,46,0.40)", animation: "fadeUp 0.3s ease-out" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>💿</span>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{sw.name}</h3>
                      {sw.category && <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed" }}>{sw.category}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedSw(null)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>

                {imgs.length > 0 ? (
                  <div style={{ padding: "16px 20px 8px" }}>
                    <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14, overflow: "hidden", background: "var(--bg-tertiary)", position: "relative", maxHeight: 420 }}>
                      {currentImg && <img src={currentImg} alt={sw.name} style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "zoom-in" }} onClick={() => setViewImage(currentImg)} />}
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setCarouselIdx(i => (i - 1 + imgs.length) % imgs.length)} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>‹</button>
                          <button onClick={() => setCarouselIdx(i => (i + 1) % imgs.length)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>›</button>
                          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", padding: "3px 10px", borderRadius: 12, background: "rgba(26,29,46,0.45)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{carouselIdx + 1} / {imgs.length}</div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px 8px" }}>
                    <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14, background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(139,92,246,0.04))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", maxHeight: 380 }}>
                      <span style={{ fontSize: 64, opacity: 0.3 }}>💿</span>
                    </div>
                  </div>
                )}

                <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {sw.category && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(139,92,246,0.12)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.25)" }}>🏷️ {sw.category}</span>}
                    {sw.rating && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>🔞 {sw.rating}</span>}
                    {sw.language && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(6,182,212,0.12)", color: "#0891b2", border: "1px solid rgba(6,182,212,0.25)" }}>🌐 {sw.language}</span>}
                    {sw.size && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(26,184,196,0.07)", color: "#2dd4df", border: "1px solid rgba(26,184,196,0.11)" }}>💾 {sw.size}</span>}
                    {sw.branch && <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#2dd4df", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.10)" }}>🏢 {sw.branch.name}</span>}
                  </div>

                  {sw.description && (
                    <div style={{ padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, letterSpacing: "0.5px", marginBottom: 4 }}>📝 Descripción</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{sw.description}</div>
                    </div>
                  )}

                  {sw.minRequirements && (
                    <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 12, border: "1.5px solid #fde68a" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>⚙️ Requisitos mínimos</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{sw.minRequirements}</div>
                    </div>
                  )}

                  {sw.recRequirements && (
                    <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.06)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.15)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>⚡ Requisitos recomendados</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{sw.recRequirements}</div>
                    </div>
                  )}

                  <div style={{ padding: "16px 18px", background: "rgba(26,184,196,0.06)", borderRadius: 12, border: "1.5px solid rgba(26,184,196,0.25)", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#4a5878", lineHeight: 1.6, fontWeight: 500 }}>
                      📞 ¿Te interesa este programa? Contáctanos {sw.branch ? <>en <strong style={{ color: "#2dd4df" }}>{sw.branch.name}</strong></> : "en nuestra tienda"} para más información.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Equipment Grid */}
        {!loading && tab === "equipment" && (
          <>
            {filteredEquipment.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>No se encontraron equipos</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? t("common.tryOther") : "No hay equipos disponibles en este momento"}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {(pagedEquipment || []).map((eq, i) => {
                  const imgs = parseEqImages(eq.image);
                  const firstImg = imgs[0] || null;
                  const dName = getEqDisplayName(eq);
                  const disks = [eq.storage, eq.storage2].filter(Boolean);
                  return (
                    <div
                      key={eq.id}
                      className="portal-card"
                      onClick={() => { setSelectedEq(eq); setCarouselIdx(0); }}
                      style={{ background: "#ffffff", borderRadius: 14, border: "1.5px solid #cbd5e8", boxShadow: "0 4px 16px rgba(30,42,58,0.10)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both`, cursor: "pointer", position: "relative" }}
                    >
                      {/* Type badge */}
                      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 10px", borderRadius: 8, background: eq.type === "laptop" ? "rgba(139,92,246,0.85)" : "rgba(6,182,212,0.85)", color: "#fff", fontSize: 10, fontWeight: 700, backdropFilter: "blur(8px)" }}>
                        {eq.type === "laptop" ? "💻 Laptop" : "🖥️ Desktop"}
                      </div>
                      {/* Photo count badge */}
                      {imgs.length > 1 && (
                        <div style={{ position: "absolute", top: 38, right: 10, zIndex: 2, padding: "2px 8px", borderRadius: 6, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 700, backdropFilter: "blur(8px)" }}>
                          📷 {imgs.length}
                        </div>
                      )}
                      {firstImg ? (
                        <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", position: "relative", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={firstImg} alt={dName} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8, transition: "transform 0.3s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        </div>
                      ) : (
                        <div style={{ width: "100%", aspectRatio: "1/1", background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 48, opacity: 0.3 }}>{eq.type === "laptop" ? "💻" : "🖥️"}</span>
                        </div>
                      )}
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                          {eq.code && <span style={{ fontSize: 9, fontWeight: 800, color: "#0891b2", padding: "2px 8px", borderRadius: 6, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", fontFamily: "monospace", letterSpacing: "0.3px" }}>{eq.code}</span>}
                          {eq.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#1ab8c4", padding: "2px 8px", borderRadius: 99, background: "rgba(26,184,196,0.08)", border: "1px solid rgba(26,184,196,0.20)" }}>🏢 {eq.branch.name}</span>}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 8 }}>{dName}</h3>

                        {/* Quick specs badges */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                          {eq.processor && <span style={{ padding: "3px 7px", borderRadius: 6, background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.07)", fontSize: 10, color: "#2dd4df", fontWeight: 600 }}>⚡ {eq.processor}</span>}
                          {eq.ram && <span style={{ padding: "3px 7px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.12)", fontSize: 10, color: "#10b981", fontWeight: 600 }}>🧠 {eq.ram}</span>}
                          {disks.slice(0, 1).map((d, di) => <span key={di} style={{ padding: "3px 7px", borderRadius: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.12)", fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>💾 {d}</span>)}
                          {eq.graphicsCard && <span style={{ padding: "3px 7px", borderRadius: 6, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.12)", fontSize: 10, color: "#ec4899", fontWeight: 600 }}>🎮 {eq.graphicsCard.length > 18 ? eq.graphicsCard.slice(0, 18) + "…" : eq.graphicsCard}</span>}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>Bs. {Math.round(eq.price).toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: "#2dd4df", fontWeight: 600 }}>Ver detalles →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPagesEq > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 28 }}>
                <button onClick={() => { setPageEq(p => Math.max(1, p - 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageEq === 1} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageEq === 1 ? "transparent" : "var(--bg-card)", color: pageEq === 1 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageEq === 1 ? "not-allowed" : "pointer", opacity: pageEq === 1 ? 0.4 : 1 }}>← Anterior</button>
                {Array.from({ length: totalPagesEq }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPageEq(p); window.scrollTo({ top: 500, behavior: "smooth" }); }} style={{ width: 36, height: 36, borderRadius: 8, border: p === pageEq ? "1.5px solid #1ab8c4" : "1px solid var(--border)", background: p === pageEq ? "rgba(26,184,196,0.08)" : "var(--bg-card)", color: p === pageEq ? "#2dd4df" : "var(--text-secondary)", fontSize: 13, fontWeight: p === pageEq ? 800 : 600, cursor: "pointer" }}>{p}</button>
                ))}
                <button onClick={() => { setPageEq(p => Math.min(totalPagesEq, p + 1)); window.scrollTo({ top: 500, behavior: "smooth" }); }} disabled={pageEq === totalPagesEq} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: pageEq === totalPagesEq ? "transparent" : "var(--bg-card)", color: pageEq === totalPagesEq ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: pageEq === totalPagesEq ? "not-allowed" : "pointer", opacity: pageEq === totalPagesEq ? 0.4 : 1 }}>Siguiente →</button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 60, textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            📍 Para consultas sobre disponibilidad o precios, contacta con nuestro equipo
          </p>
        </div>
      </div>

      {/* Branch Picker Modal */}
      {branchPickerData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setBranchPickerData(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", background: "rgba(17,17,24,0.98)", borderRadius: 14, border: "1px solid rgba(26,184,196,0.08)", padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1d2e", marginBottom: 8 }}>Selecciona la Sucursal</h2>
            <p style={{ color: "#4a5068", fontSize: 13, marginBottom: 24 }}>La orden <strong style={{ color: "#2dd4df" }}>{branchPickerData.code}</strong> existe en varias sucursales</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {branchPickerData.repairs.map((r: any) => (
                <button key={r.id} onClick={() => handleBranchSelect(r)} style={{ padding: "14px 18px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 14, color: "#1a1d2e", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                  <span>🏢 {r.branch?.name || "Sucursal"}</span>
                  <span style={{ fontSize: 12, color: "#2dd4df" }}>{r.device} - {r.clientName || "Sin nombre"}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setBranchPickerData(null)} style={{ marginTop: 16, padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#4a5068", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Equipment Detail Modal with Carousel */}
      {selectedEq && (() => {
        const eq = selectedEq;
        const imgs = parseEqImages(eq.image);
        const cond = EQ_CONDITIONS[eq.condition] || EQ_CONDITIONS.disponible;
        const dName = getEqDisplayName(eq);
        const currentImg = imgs[carouselIdx] || null;
        const prev = () => setCarouselIdx(i => (imgs.length === 0 ? 0 : (i - 1 + imgs.length) % imgs.length));
        const next = () => setCarouselIdx(i => (imgs.length === 0 ? 0 : (i + 1) % imgs.length));
        return (
          <div
            onClick={() => setSelectedEq(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeUp 0.25s ease-out" }}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="eq-modal"
              style={{ width: "100%", maxWidth: 680, maxHeight: "92vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.18)", boxShadow: "0 24px 60px rgba(26,29,46,0.45)" }}
            >
              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #cbd5e8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 22 }}>{eq.type === "laptop" ? "💻" : "🖥️"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dName}</h3>
                      {eq.code && <span style={{ fontSize: 10, fontWeight: 800, color: "#0891b2", padding: "2px 8px", borderRadius: 6, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", fontFamily: "monospace" }}>{eq.code}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{eq.type === "laptop" ? "Laptop" : "PC de Escritorio"} · Bs. {Math.round(eq.price).toLocaleString()}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedEq(null)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>

              {/* Carousel */}
              {imgs.length > 0 ? (
                <div style={{ padding: "16px 20px 8px" }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/10", borderRadius: 14, overflow: "hidden", background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                    <img
                      key={carouselIdx}
                      src={currentImg!}
                      alt={`${dName} ${carouselIdx + 1}`}
                      onClick={() => setViewImage(currentImg)}
                      style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0a0a10", cursor: "zoom-in", animation: "fadeUp 0.3s ease-out" }}
                    />

                    {/* Counter */}
                    {imgs.length > 1 && (
                      <div style={{ position: "absolute", top: 12, right: 12, padding: "5px 12px", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 12, backdropFilter: "blur(8px)" }}>
                        📷 {carouselIdx + 1} / {imgs.length}
                      </div>
                    )}

                    {/* Zoom hint */}
                    <div style={{ position: "absolute", bottom: 12, right: 12, padding: "4px 10px", background: "rgba(26,29,46,0.45)", color: "#1a1d2e", fontSize: 10, fontWeight: 600, borderRadius: 8, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 4 }}>
                      🔍 Click para ampliar
                    </div>

                    {/* Arrows */}
                    {imgs.length > 1 && (
                      <>
                        <button
                          onClick={prev}
                          aria-label="Imagen anterior"
                          style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 18, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.85)"; e.currentTarget.style.transform = "translateY(-50%) scale(1.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(17,17,24,0.85)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                        >‹</button>
                        <button
                          onClick={next}
                          aria-label="Imagen siguiente"
                          style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(17,17,24,0.85)", border: "1px solid rgba(255,255,255,0.12)", color: "#1a1d2e", fontSize: 18, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.85)"; e.currentTarget.style.transform = "translateY(-50%) scale(1.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(17,17,24,0.85)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                        >›</button>
                      </>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {imgs.length > 1 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
                      {(imgs || []).map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setCarouselIdx(idx)}
                          style={{ width: 76, height: 56, borderRadius: 8, overflow: "hidden", cursor: "pointer", flexShrink: 0, border: idx === carouselIdx ? "2px solid #1ab8c4" : "2px solid transparent", opacity: idx === carouselIdx ? 1 : 0.6, transition: "all 0.15s", position: "relative" }}
                        >
                          <img src={img} alt={`thumb ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "16px 20px 8px" }}>
                  <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 14, background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 56, opacity: 0.3, marginBottom: 4 }}>{eq.type === "laptop" ? "💻" : "🖥️"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sin imágenes disponibles</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Body */}
              <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Badges row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: eq.type === "laptop" ? "rgba(139,92,246,0.12)" : "rgba(6,182,212,0.12)", color: eq.type === "laptop" ? "#7c3aed" : "#0891b2", border: `1px solid ${eq.type === "laptop" ? "rgba(139,92,246,0.25)" : "rgba(6,182,212,0.25)"}` }}>
                    {eq.type === "laptop" ? "💻 Laptop" : "🖥️ PC Escritorio"}
                  </span>
                  <span style={{ padding: "5px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${cond.color}15`, color: cond.color, border: `1.5px solid ${cond.color}40` }}>
                    {cond.icon} {cond.label}
                  </span>
                  {eq.branch && (
                    <span style={{ padding: "5px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#2dd4df", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.10)" }}>
                      🏢 {eq.branch.name}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div style={{ padding: "18px 20px", background: "linear-gradient(135deg, rgba(26,184,196,0.12), rgba(26,184,196,0.06))", borderRadius: 12, border: "2px solid rgba(26,184,196,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", boxShadow: "0 4px 16px rgba(26,184,196,0.12)" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, textAlign: "center" }}>PRECIO</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#1ab8c4", lineHeight: 1, letterSpacing: "-1.5px" }}>Bs. {Math.round(eq.price).toLocaleString()}</div>
                  </div>
                  
                </div>

                {/* Specifications */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1e2a3a", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#1ab8c4" }}>◆</span> Especificaciones</div>
                  <div className="eq-specs-grid" style={{ padding: "16px 18px", background: "transparent", borderRadius: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, border: "none" }}>
                    {eq.brand && <SpecRow icon="🏷️" label="Marca" value={eq.brand} color="#2dd4df" />}
                    {eq.model && <SpecRow icon="📦" label="Modelo" value={eq.model} color="#2dd4df" />}
                    {eq.processor && <SpecRow icon="⚡" label="Procesador" value={eq.processor} color="#2dd4df" />}
                    {eq.ram && <SpecRow icon="🧠" label="Memoria RAM" value={eq.ram} color="#10b981" />}
                    {eq.storage && <SpecRow icon="💾" label="Disco Principal" value={eq.storage} color="#f59e0b" />}
                    {eq.storage2 && <SpecRow icon="💾" label="Disco Secundario" value={eq.storage2} color="#f59e0b" />}
                    {eq.graphicsCard && <SpecRow icon="🎮" label="Tarjeta Gráfica" value={eq.graphicsCard} color="#ec4899" />}
                    {eq.screenSize && <SpecRow icon="📐" label="Pantalla" value={eq.screenSize} color="#a855f7" />}
                    {eq.os && <SpecRow icon="🖥️" label="Sistema Operativo" value={eq.os} color="#0891b2" />}
                    {eq.cabinet && <SpecRow icon="🏗️" label="Gabinete" value={eq.cabinet} color="#e11d48" />}
                    {eq.motherboard && <SpecRow icon="🔌" label="Placa Madre" value={eq.motherboard} color="#14b8a6" />}
                    {eq.powerSupply && <SpecRow icon="⚡" label="Fuente de Poder" value={eq.powerSupply} color="#ea580c" />}
                  </div>
                </div>

                {/* Accessories */}
                {eq.accessories && (
                  <div style={{ padding: "14px 16px", background: "#ffffff", borderRadius: 12, border: "1.5px solid #e2e8f5", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>ACCESORIOS INCLUIDOS</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{eq.accessories}</div>
                  </div>
                )}

                {/* Notes */}
                {eq.notes && (
                  <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 12, border: "1.5px solid #fde68a" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#c9952a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>NOTAS adicionales</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{eq.notes}</div>
                  </div>
                )}

                {/* Contact CTA */}
                <div style={{ marginTop: 4, padding: "16px 18px", background: "rgba(26,184,196,0.06)", borderRadius: 12, border: "1.5px solid rgba(26,184,196,0.25)", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#4a5878", lineHeight: 1.6, fontWeight: 500 }}>
                    📞 ¿Te interesa este equipo? Contáctanos {eq.branch ? <>en <strong style={{ color: "#2dd4df" }}>{eq.branch.name}</strong></> : "en nuestra tienda"} para más información.
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function SpecRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#9298ae", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 11 }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value}>
        {value}
      </div>
    </div>
  );
}
