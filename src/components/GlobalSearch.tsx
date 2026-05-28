"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface SearchResult {
  type: string;
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  meta: string | null;
  url: string;
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  repair: { label: "OT", color: "#1ab8c4", icon: "⚙" },
  equipment: { label: "Equipo", color: "#0891b2", icon: "💻" },
  console: { label: "Consola", color: "#f97316", icon: "🕹️" },
  quotation: { label: "Cotización", color: "#f59e0b", icon: "🧾" },
  sale: { label: "Venta", color: "#a855f7", icon: "💰" },
  certificate: { label: "Certificado", color: "#ec4899", icon: "🏅" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", diagnosed: "Diagnosticado", waiting_parts: "Esperando repuestos",
  in_progress: "En progreso", completed: "Completado", delivered: "Entregado",
  disponible: "Disponible", vendida: "Vendida", reservada: "Reservada",
};

/**
 * Buscador global del sistema.
 * - Abrible con atajo Ctrl+K (o Cmd+K en Mac)
 * - Barra inline en el header del dashboard (también dispara el modal)
 * - Busca en OTs, Equipos, Consolas, Cotizaciones, Notas de Venta, Certificados
 */
export function GlobalSearch({ inline = false }: { inline?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    // Cleanup por si el componente se desmonta con open=true
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Buscar con debounce 250ms
  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setFocusIdx(0);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => search(q), 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q, search]);

  const navigate = (r: SearchResult) => {
    setOpen(false); setQ(""); setResults([]);
    router.push(r.url);
  };

  // Navegación con flechas
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[focusIdx]) { e.preventDefault(); navigate(results[focusIdx]); }
  };

  // Render inline (barra del header)
  if (inline && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="global-search-inline"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          cursor: "pointer",
          minWidth: 260, maxWidth: 380,
          color: "var(--text-muted)",
          fontSize: 13,
          transition: "all 0.15s",
        }}
        title="Buscar (Ctrl+K)"
      >
        <span style={{ fontSize: 14 }}>🔍</span>
        <span style={{ flex: 1, textAlign: "left" }}>Buscar OT, cliente, equipo...</span>
        <kbd style={{
          padding: "2px 6px", background: "var(--bg-hover)", borderRadius: 4,
          fontSize: 10, fontFamily: "monospace", color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}>Ctrl+K</kbd>
      </button>
    );
  }

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(30,42,58,0.35)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(600px, 94%)",
          background: "var(--bg-card)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(26,29,46,0.40)",
          overflow: "hidden",
          maxHeight: "70vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 18, color: "#1ab8c4" }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Busca OT, cliente, teléfono, equipo, EQ/CN..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--text-primary)", fontSize: 15, fontWeight: 500,
            }}
          />
          {loading && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>...</span>}
          <button
            onClick={() => setOpen(false)}
            style={{
              padding: "3px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-muted)", fontSize: 10, fontFamily: "monospace", cursor: "pointer",
            }}
          >ESC</button>
        </div>

        {/* Resultados */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {q.trim().length < 2 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⌨️</div>
              <div>Escribe al menos 2 caracteres para buscar</div>
              <div style={{ fontSize: 11, marginTop: 10, opacity: 0.7 }}>
                Puedes buscar por: código (OT-1, EQ-X, CN-X), nombre de cliente, teléfono, equipo, marca, modelo
              </div>
            </div>
          ) : loading && results.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤷</div>
              No se encontraron resultados para "<strong>{q}</strong>"
            </div>
          ) : (
            results.map((r, idx) => {
              const meta = TYPE_META[r.type] || { label: r.type, color: "#94a3b8", icon: "📄" };
              const isFocus = idx === focusIdx;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r)}
                  onMouseEnter={() => setFocusIdx(idx)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "10px 18px", border: "none",
                    background: isFocus ? "rgba(26,184,196,0.06)" : "transparent",
                    cursor: "pointer", textAlign: "left",
                    borderLeft: isFocus ? "3px solid #1ab8c4" : "3px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${meta.color}15`, color: meta.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: meta.color,
                        background: `${meta.color}15`, padding: "2px 6px", borderRadius: 4,
                        textTransform: "uppercase", letterSpacing: "0.3px",
                      }}>{meta.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>{r.code}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                    {r.subtitle && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{r.subtitle}</div>}
                  </div>
                  {r.meta && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                      background: "var(--bg-tertiary)", color: "var(--text-secondary)",
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {STATUS_LABELS[r.meta] || r.meta}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer con tips */}
        <div style={{ padding: "8px 18px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 14 }}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>ESC cerrar</span>
        </div>
      </div>
    </div>
  );
}
