"use client";
import { useEffect, useState } from "react";

interface Props {
  repairCode: string;
  clientName?: string | null;
}

export function ReviewForm({ repairCode, clientName }: Props) {
  const [existingReview, setExistingReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?repairCode=${encodeURIComponent(repairCode)}`)
      .then(r => r.json())
      .then(d => { if (d.review) setExistingReview(d.review); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repairCode]);

  const submit = async () => {
    if (rating < 1) { setError("Selecciona una calificación"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repairCode, rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess(true); setExistingReview(data.review); }
      else { setError(data.error || "Error al guardar"); }
    } catch { setError("Error de red"); }
    setSubmitting(false);
  };

  if (loading) return null;

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 20,
    border: "1px solid #e2e8f4",
    boxShadow: "0 4px 20px rgba(30,42,58,0.10)",
    padding: "24px 22px",
    textAlign: "center",
  };

  if (existingReview) {
    return (
      <div style={cardStyle}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.06))", border: "1.5px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>⭐</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#059669", marginBottom: 12 }}>¡Gracias por tu reseña!</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5].map(n => (
            <span key={n} style={{ fontSize: 26, color: n <= existingReview.rating ? "#fbbf24" : "#e2e8f4" }}>★</span>
          ))}
        </div>
        {existingReview.comment && (
          <div style={{ fontSize: 13, color: "#4a5878", fontStyle: "italic", maxWidth: 360, margin: "0 auto", padding: "10px 14px", background: "#f5f7fc", borderRadius: 10, border: "1px solid #e2e8f4" }}>
            &ldquo;{existingReview.comment}&rdquo;
          </div>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#059669", marginBottom: 6 }}>¡Gracias por tu opinión!</div>
        <div style={{ fontSize: 13, color: "#9298ae" }}>Tu reseña fue registrada con éxito</div>
      </div>
    );
  }

  const ratingLabel = rating === 5 ? "¡Excelente! 🎉" : rating === 4 ? "Muy bien 👍" : rating === 3 ? "Bien 😊" : rating === 2 ? "Regular 😐" : rating === 1 ? "Mejorable 😕" : "";
  const ratingColor = rating >= 4 ? "#059669" : rating === 3 ? "#d97706" : rating > 0 ? "#e11d48" : "#9298ae";

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))", border: "1.5px solid rgba(251,191,36,0.30)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>⭐</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1e2a3a", marginBottom: 4 }}>
          {clientName ? `${clientName}, ¿cómo calificas nuestro servicio?` : "¿Cómo calificas nuestro servicio?"}
        </div>
        <div style={{ fontSize: 12, color: "#9298ae" }}>Tu opinión nos ayuda a mejorar</div>
      </div>

      {/* Stars */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 38, padding: "2px 4px", transition: "transform 0.12s",
              color: n <= (hoverRating || rating) ? "#fbbf24" : "#dde6f5",
              transform: n <= hoverRating ? "scale(1.15)" : "scale(1)",
              filter: n <= (hoverRating || rating) ? "drop-shadow(0 2px 6px rgba(251,191,36,0.4))" : "none",
            }}
            aria-label={`${n} estrellas`}
          >★</button>
        ))}
      </div>

      {/* Rating label */}
      {rating > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: ratingColor, marginBottom: 14, height: 18 }}>
          {ratingLabel}
        </div>
      )}
      {rating === 0 && <div style={{ height: 18, marginBottom: 14 }} />}

      {/* Textarea */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comparte tu experiencia (opcional)..."
        rows={3}
        maxLength={500}
        style={{
          width: "100%", padding: "12px 14px",
          background: "#f5f7fc",
          border: "1.5px solid #e2e8f4",
          borderRadius: 12, color: "#1e2a3a",
          fontSize: 13, resize: "vertical",
          fontFamily: "inherit", outline: "none",
          marginBottom: 14, boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
      />

      {error && <div style={{ fontSize: 12, color: "#e11d48", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>⚠️ {error}</div>}

      <button
        onClick={submit}
        disabled={submitting || rating < 1}
        style={{
          width: "100%", padding: "13px 20px",
          background: rating > 0
            ? "linear-gradient(135deg,#149aa5,#1ab8c4)"
            : "#f0f3f8",
          border: "none", borderRadius: 14,
          color: rating > 0 ? "#ffffff" : "#9298ae",
          fontSize: 13, fontWeight: 800, cursor: submitting ? "wait" : (rating > 0 ? "pointer" : "not-allowed"),
          opacity: submitting ? 0.7 : 1,
          letterSpacing: "0.3px",
          boxShadow: rating > 0 ? "0 4px 16px rgba(26,184,196,0.30)" : "none",
          transition: "all 0.2s",
        }}
      >
        {submitting ? "Enviando..." : "Enviar Reseña"}
      </button>
    </div>
  );
}
