"use client";

import { useCallback, useEffect, useState, useRef } from "react";

interface ApiKey { id: string; name: string; key: string; description: string | null; isActive: boolean; lastUsedAt: string | null; }
interface Winner { id: string; rank: number; code: string; claimed: boolean; claimedAt: string | null; user?: { name: string }; prize?: { label: string; value?: number; unit?: string } | null; }
interface Match { id: string; homeTeam: string; awayTeam: string; groupName: string | null; status: string; homeScore: number | null; awayScore: number | null; totalShots: number | null; shotsOnGoal: number | null; saves: number | null; fouls: number | null; yellowCards: number | null; redCards: number | null; accuratePass: number | null; totalCross: number | null; substitutions: number | null; currentMinute: number | null; }
interface User { id: string; name: string; whatsapp: string; city: string | null; createdAt: string; }
interface PrizeConfig { rank: number; label: string; description?: string; type: string; value?: number; unit?: string; minPurchase?: number; imageUrl?: string; }
interface ValidationResult { valid: boolean; code: string; used: boolean; expiresAt: string; winner?: { name: string; whatsapp: string }; prize?: { label: string; value?: number; unit?: string; minPurchase?: number }; }
type AdminTab = "ganadores" | "api-keys" | "validar" | "partidos" | "usuarios" | "premios";

function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const pw = sessionStorage.getItem("admin-pw");
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(pw ? { "x-admin-password": pw } : {}),
    },
  });
}

function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="admin-toast" style={type === "ok"
      ? { background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
      : { background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
      {msg}
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm mb-5" style={{ color: "rgba(255,105,180,0.6)" }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "rgba(255,0,255,0.08)", border: "1px solid rgba(255,0,255,0.15)", color: "#ff69b4" }}>Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.4)" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,20,147,0.3)", borderTopColor: "#ff1493" }} />
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-xs mt-1" style={{ color: "rgba(255,105,180,0.4)" }}>{desc}</p>
    </div>
  );
}

function AdminSelect({ value, options, onChange }: { value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="admin-input text-left flex items-center justify-between" style={{ color: sel?.value ? "#fff" : "rgba(255,105,180,0.35)" }}>
        <span className="truncate">{sel?.label || "Seleccionar..."}</span>
        <svg className={`w-4 h-4 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "rgba(255,105,180,0.4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg" style={{ background: "rgba(12,0,10,0.97)", border: "1px solid rgba(255,0,255,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className="w-full px-3 py-2 text-left text-sm transition-colors" style={o.value === value ? { background: "rgba(255,20,147,0.25)", color: "#ff69b4" } : { color: "#fff" }} onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = "rgba(255,0,255,0.08)"; }} onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("ganadores");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(() => typeof window !== "undefined" && localStorage.getItem("admin-auth") === "true");
  const [authError, setAuthError] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setAuthed(true); localStorage.setItem("admin-auth", "true"); sessionStorage.setItem("admin-pw", password); setAuthError(false); }
      else { setAuthError(true); }
    } catch {
      setAuthError(true);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0008" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,0,255,0.1) 0%, transparent 60%)" }} />
        <div className="w-full max-w-sm space-y-4 relative z-10 rounded-3xl p-6 glass-panel">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg pink-button">⚽</div>
              <span className="text-lg font-black" style={{ background: "linear-gradient(90deg, #fff, #ff69b4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ADMIN</span>
            </div>
            <h1 className="text-xl font-black text-white">Panel Admin</h1>
          </div>
          <input className="admin-input" type="password" placeholder="Contraseña de administrador" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(false); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          {authError && <p className="text-xs text-center" style={{ color: "#fca5a5" }}>Contraseña incorrecta</p>}
          <button onClick={handleLogin} className="w-full py-3 rounded-xl font-bold text-white pink-button">Ingresar</button>
        </div>
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: "ganadores", label: "Ganadores", icon: "🏆" },
    { key: "premios", label: "Premios", icon: "🎁" },
    { key: "api-keys", label: "API Keys", icon: "🔑" },
    { key: "validar", label: "Códigos", icon: "🔍" },
    { key: "partidos", label: "Partidos", icon: "⚽" },
    { key: "usuarios", label: "Usuarios", icon: "👥" },
  ];

  return (
    <div className="min-h-screen bg-admin">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white" style={{ background: "linear-gradient(90deg, #fff, #ff69b4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Panel de Administración</h1>
          <button onClick={() => setAuthed(false)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,0,255,0.08)", border: "1px solid rgba(255,0,255,0.15)", color: "#ff69b4" }}>Cerrar sesión</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
              style={tab === t.key
                ? { background: "linear-gradient(135deg,#ff1493,#c500ff)", color: "#fff", boxShadow: "0 4px 12px rgba(255,20,147,0.3)" }
                : { background: "rgba(255,0,255,0.06)", border: "1px solid rgba(255,0,255,0.12)", color: "#ff69b4" }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {tab === "ganadores" && <WinnersTab />}
        {tab === "premios" && <PrizesTab />}
        {tab === "api-keys" && <ApiKeysTab />}
        {tab === "validar" && <CodeValidatorTab />}
        {tab === "partidos" && <MatchesTab />}
        {tab === "usuarios" && <UsersTab />}
      </div>
    </div>
  );
}

function WinnersTab() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminFetch("/api/admin/winners").then(r => r.json()).then(d => { setWinners(d.winners || []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  if (!winners.length) return <EmptyState icon="🏆" title="No hay ganadores aún" desc="Los ganadores aparecerán aquí cuando se cierre una semana." />;
  return (
    <div className="space-y-2">
      {winners.map((w) => (
        <div key={w.id} className="admin-row flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={w.rank <= 3 ? { background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05))", color: "#ffd700" } : { background: "rgba(255,0,255,0.08)", color: "#ff69b4" }}>#{w.rank}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{w.user?.name || "Sin nombre"}</p>
              <p className="text-xs" style={{ color: "rgba(255,105,180,0.4)" }}>{w.prize?.label || "Premio"} · Semana {(w as any).week?.number || "-"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <code className="text-xs font-mono" style={{ color: "#4ade80" }}>{w.code}</code>
            <p className="text-[10px] mt-0.5" style={{ color: w.claimed ? "#4ade80" : "rgba(255,105,180,0.4)" }}>{w.claimed ? `Redimido ${w.claimedAt ? new Date(w.claimedAt).toLocaleDateString("es-CO") : ""}` : "Pendiente"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrizesTab() {
  const [prizes, setPrizes] = useState<PrizeConfig[]>([]);
  const [week, setWeek] = useState<{ id: string; number: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchPrizes = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/prizes");
      const data = await res.json();
      setWeek(data.week);
      if (data.prizes?.length) { setPrizes(data.prizes); }
      else { setPrizes(Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, label: "", description: "", type: "cash", value: i === 0 ? undefined : i === 1 ? 100000 : i === 2 ? 50000 : undefined, unit: "cop" }))); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrizes(); }, [fetchPrizes]);

  const updatePrize = (rank: number, field: string, value: string | number | undefined) => {
    setPrizes((prev) => prev.map((p) => (p.rank === rank ? { ...p, [field]: value } : p)));
  };

  const save = async () => {
    if (!week) return;
    setSaving(true);
    try {
      await adminFetch("/api/admin/prizes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekId: week.id, prizes }) });
      setToast({ msg: "Premios guardados correctamente", type: "ok" });
    } catch { setToast({ msg: "Error al guardar premios", type: "err" }); }
    setSaving(false);
  };

  const createWeek = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/weeks", { method: "POST" });
      const data = await res.json();
      setWeek(data.week);
      setPrizes(Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, label: "", description: "", type: "cash", value: i === 0 ? undefined : i === 1 ? 100000 : i === 2 ? 50000 : undefined, unit: "cop" })));
      setToast({ msg: "Semana creada", type: "ok" });
    } catch { setToast({ msg: "Error al crear semana", type: "err" }); }
    setSaving(false);
  };

  const uploadImage = async (rank: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await adminFetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) { updatePrize(rank, "imageUrl", data.url); setToast({ msg: "Imagen subida", type: "ok" }); }
      else { setToast({ msg: data.error || "Error al subir imagen", type: "err" }); }
    } catch { setToast({ msg: "Error al subir imagen", type: "err" }); }
  };

  if (loading) return <Spinner />;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="admin-card p-5 space-y-4">
        {!week ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📦</div>
            <h2 className="font-bold text-lg text-white mb-1">No hay semana activa</h2>
            <p className="text-xs mb-5" style={{ color: "rgba(255,105,180,0.5)" }}>Crea una nueva semana para definir los premios.</p>
            <button onClick={createWeek} disabled={saving} className="px-8 py-3 rounded-xl font-bold text-white disabled:opacity-40 pink-button">
              {saving ? "Creando..." : "Crear Nueva Semana"}
            </button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-bold text-lg text-white">Premios Semana {week.number}</h2>
              <p className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>Define qué gana cada posición del podio.</p>
            </div>
            <div className="space-y-3">
              {prizes.map((p) => (
                <div key={p.rank} className="admin-section space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-center font-black text-sm shrink-0" style={p.rank <= 3 ? { color: p.rank === 1 ? "#ffd700" : p.rank === 2 ? "#c0c0c0" : "#cd7f32" } : { color: "#ff69b4" }}>#{p.rank}</span>
                    <input className="flex-1 admin-input" placeholder={p.type === "toy" ? "Nombre del producto" : "Nombre del premio"} value={p.label} onChange={(e) => updatePrize(p.rank, "label", e.target.value)} />
                    <div className="w-32">
                      <AdminSelect value={p.type} options={[{ label: "Efectivo", value: "cash" }, { label: "Juguete", value: "toy" }, { label: "Descuento", value: "discount" }, { label: "Ticket", value: "free_ticket" }]} onChange={(v) => updatePrize(p.rank, "type", v)} />
                    </div>
                    {p.type !== "toy" ? (
                      <input className="w-24 admin-input text-right" type="number" placeholder="Valor $" value={p.value ?? ""} onChange={(e) => updatePrize(p.rank, "value", e.target.value ? Number(e.target.value) : undefined)} />
                    ) : (
                      <input className="w-24 admin-input text-right" type="number" placeholder="Precio" value={p.value ?? ""} onChange={(e) => updatePrize(p.rank, "value", e.target.value ? Number(e.target.value) : undefined)} />
                    )}
                  </div>
                  <div className="pl-10">
                    <textarea className="admin-input w-full text-xs resize-none" rows={2} placeholder="Descripción del premio (opcional)" value={p.description ?? ""} onChange={(e) => updatePrize(p.rank, "description", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 pl-10">
                    <label className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors" style={{ background: "rgba(255,20,147,0.15)", color: "#ff69b4", border: "1px solid rgba(255,20,147,0.25)" }}>
                      📷 Imagen
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadImage(p.rank, e.target.files[0]); }} />
                    </label>
                    {p.imageUrl && <img src={p.imageUrl} alt="preview" className="h-10 w-10 object-cover rounded-lg" style={{ border: "1px solid rgba(255,0,255,0.2)" }} />}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={save} disabled={saving || !week} className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40 pink-button">
              {saving ? "Guardando..." : "Guardar Premios"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try { const res = await adminFetch("/api/admin/api-keys"); const data = await res.json(); setKeys(data.keys || []); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!name) return;
    await adminFetch("/api/admin/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc }) });
    setName(""); setDesc(""); fetchKeys(); setToast({ msg: "API Key creada", type: "ok" });
  };

  const revokeKey = async (id: string) => {
    await adminFetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    fetchKeys(); setConfirmRevoke(null); setToast({ msg: "API Key revocada", type: "ok" });
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmRevoke && <ConfirmModal title="Revocar API Key" message="Esta acción no se puede deshacer. La key dejará de funcionar inmediatamente." onConfirm={() => revokeKey(confirmRevoke)} onCancel={() => setConfirmRevoke(null)} />}
      <div className="space-y-4">
        <div className="admin-card p-5 space-y-3">
          <h2 className="font-bold text-white">Generar Nueva API Key</h2>
          <input className="admin-input" placeholder="Nombre (ej: WhatsApp Bot)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="admin-input" placeholder="Descripción (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button onClick={createKey} disabled={!name} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 pink-button">Crear Key</button>
        </div>
        {loading ? <Spinner /> : !keys.length ? <EmptyState icon="🔑" title="No hay API Keys" desc="Crea tu primera key para conectar servicios externos." /> : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="admin-row flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white">{k.name}</p>
                  <code className="text-xs font-mono block truncate" style={{ color: "#ff69b4" }}>{k.key}</code>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,105,180,0.4)" }}>
                    {k.description && `${k.description} · `}
                    <span style={{ color: k.isActive ? "#4ade80" : "#f87171" }}>{k.isActive ? "Activa" : "Inactiva"}</span>
                    {" · "}Último uso: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("es-CO") : "Nunca"}
                  </p>
                </div>
                {k.isActive && <button onClick={() => setConfirmRevoke(k.id)} className="text-xs px-3 py-1.5 rounded-lg shrink-0 font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>Revocar</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CodeValidatorTab() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [confirmInvalidate, setConfirmInvalidate] = useState(false);

  const validate = async () => {
    if (!code) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const res = await fetch(`/api/v1/validate-code?code=${code}`, { headers: { "x-api-key": "admin-validation" } });
      if (res.ok) { setResult(await res.json()); } else { const err = await res.json(); setError(err.error || "Error al validar"); }
    } catch { setError("Error de conexión"); }
    setLoading(false);
  };

  const invalidate = async () => {
    try {
      await adminFetch(`/api/admin/codes/${code}/invalidate`, { method: "POST" });
      setToast({ msg: "Código invalidado para tienda física", type: "ok" });
      setResult(null); setCode(""); setConfirmInvalidate(false);
    } catch { setToast({ msg: "Error al invalidar código", type: "err" }); }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmInvalidate && <ConfirmModal title="Invalidar código" message="El código será invalidado y no podrá canjearse en tienda física. ¿Continuar?" onConfirm={invalidate} onCancel={() => setConfirmInvalidate(false)} />}
      <div className="space-y-4">
        <div className="admin-card p-5 space-y-3">
          <h2 className="font-bold text-white">Validar Código de Redención</h2>
          <input className="admin-input text-center text-lg tracking-wider font-mono" placeholder="F24-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && validate()} />
          <button onClick={validate} disabled={!code || loading} className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40 pink-button">
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {error && <p className="text-sm text-center" style={{ color: "#fca5a5" }}>{error}</p>}
        {result && (
          <div className="admin-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="admin-badge" style={result.valid ? { background: "rgba(34,197,94,0.2)", color: "#4ade80" } : { background: "rgba(239,68,68,0.2)", color: "#f87171" }}>
                {result.valid ? "Válido" : "Inválido"}
              </span>
              {result.used && <span className="admin-badge" style={{ background: "rgba(255,20,147,0.15)", color: "#ff69b4" }}>Redimido</span>}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>Jugador</span><span className="text-base font-black text-white">{result.winner?.name || result.winner?.whatsapp}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>WhatsApp</span><span className="text-sm text-white">{result.winner?.whatsapp}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>Código</span><code className="text-lg font-mono tracking-widest" style={{ color: "#4ade80" }}>{result.code}</code></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>Premio</span><span className="text-sm text-white">{result.prize?.label}</span></div>
              {result.prize?.value && <div className="flex justify-between"><span className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>Valor</span><span className="text-sm text-white">{result.prize.unit === "percent" ? `${result.prize.value}%` : `$${result.prize.value.toLocaleString("es-CO")}`}{result.prize.minPurchase ? ` (mín $${result.prize.minPurchase.toLocaleString("es-CO")})` : ""}</span></div>}
              <div className="flex justify-between"><span className="text-xs" style={{ color: "rgba(255,105,180,0.5)" }}>Vence</span><span className="text-sm text-white">{new Date(result.expiresAt).toLocaleDateString("es-CO")}</span></div>
            </div>
            {result.valid && !result.used && (
              <button onClick={() => setConfirmInvalidate(true)} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                Invalidar (Tienda Física)
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function MatchesTab() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { adminFetch("/api/admin/matches").then(r => r.json()).then(d => { setMatches(d.matches || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = filter === "all" ? matches : matches.filter((m) => m.status === filter);

  const startEdit = (m: Match) => {
    setEditing(m.id);
    setForm({
      status: m.status, homeScore: m.homeScore ?? "", awayScore: m.awayScore ?? "",
      totalShots: m.totalShots ?? "", shotsOnGoal: m.shotsOnGoal ?? "", saves: m.saves ?? "",
      fouls: m.fouls ?? "", yellowCards: m.yellowCards ?? "", redCards: m.redCards ?? "",
      accuratePass: m.accuratePass ?? "", totalCross: m.totalCross ?? "",
      substitutions: m.substitutions ?? "", currentMinute: m.currentMinute ?? "",
    });
  };

  const save = async (id: string) => {
    setSaving(true);
    const res = await adminFetch(`/api/admin/matches/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setToast({ msg: "Partido guardado", type: "ok" }); setEditing(null); adminFetch("/api/admin/matches").then(r => r.json()).then(d => setMatches(d.matches || [])); }
    else { setToast({ msg: "Error al guardar", type: "err" }); }
    setSaving(false);
  };

  const field = (key: string, label: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,105,180,0.5)" }}>{label}</label>
      <input type="number" value={form[key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="admin-input text-center" />
    </div>
  );

  const statusColor = (s: string) => s === "live" ? "#4ade80" : s === "finished" ? "#a78bfa" : "rgba(255,105,180,0.6)";
  const statusLabel = (s: string) => s === "live" ? "En vivo" : s === "finished" ? "Finalizado" : "Programado";

  const filters = [
    { value: "all", label: "Todos" },
    { value: "scheduled", label: "Programados" },
    { value: "live", label: "En vivo" },
    { value: "finished", label: "Finalizados" },
  ];

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={filter === f.value ? { background: "rgba(255,20,147,0.2)", color: "#ff69b4", border: "1px solid rgba(255,20,147,0.3)" } : { background: "rgba(255,0,255,0.05)", color: "rgba(255,105,180,0.4)" }}>
            {f.label} ({f.value === "all" ? matches.length : matches.filter((m) => m.status === f.value).length})
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : !filtered.length ? <EmptyState icon="⚽" title="No hay partidos" desc="No se encontraron partidos con este filtro." /> : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="admin-card overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white text-sm">{m.homeTeam} vs {m.awayTeam}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,105,180,0.4)" }}>
                    {m.groupName || ""} · <span style={{ color: statusColor(m.status) }}>{statusLabel(m.status)}</span> · {m.homeScore ?? "?"}-{m.awayScore ?? "?"}
                  </p>
                </div>
                <button onClick={() => editing === m.id ? setEditing(null) : startEdit(m)} className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0" style={{ background: "rgba(255,20,147,0.15)", color: "#ff69b4", border: "1px solid rgba(255,20,147,0.25)" }}>
                  {editing === m.id ? "Cancelar" : "✏️ Editar"}
                </button>
              </div>
              {editing === m.id && (
                <div className="p-4 space-y-3" style={{ borderTop: "1px solid rgba(255,0,255,0.08)" }}>
                  <div className="admin-section space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ff69b4" }}>Resultado</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,105,180,0.5)" }}>Estado</label>
                        <AdminSelect value={String(form.status ?? "scheduled")} options={[{ label: "Programado", value: "scheduled" }, { label: "En vivo", value: "live" }, { label: "Finalizado", value: "finished" }]} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
                      </div>
                      {field("homeScore", `Goles ${m.homeTeam.split(" ").pop()}`)}
                      {field("awayScore", `Goles ${m.awayTeam.split(" ").pop()}`)}
                    </div>
                  </div>
                  <div className="admin-section space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ff69b4" }}>Estadísticas</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {field("totalShots", "Tiros totales")}
                      {field("shotsOnGoal", "Tiros al arco")}
                      {field("saves", "Atajadas")}
                      {field("fouls", "Faltas")}
                      {field("yellowCards", "T. Amarillas")}
                      {field("redCards", "T. Rojas")}
                      {field("accuratePass", "Pases precisos")}
                      {field("totalCross", "Centros")}
                      {field("substitutions", "Sustituciones")}
                      {field("currentMinute", "Minuto")}
                    </div>
                  </div>
                  <button onClick={() => save(m.id)} disabled={saving} className="w-full py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40 pink-button">
                    {saving ? "Guardando..." : "💾 Guardar Cambios"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { adminFetch("/api/admin/users").then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = search ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.whatsapp.includes(search)) : users;

  return (
    <div className="space-y-4">
      <div className="admin-card p-4">
        <input className="admin-input" placeholder="🔍 Buscar por nombre o WhatsApp..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading ? <Spinner /> : !users.length ? <EmptyState icon="👥" title="No hay usuarios" desc="Los usuarios registrados aparecerán aquí." /> : !filtered.length ? (
        <EmptyState icon="🔍" title="Sin resultados" desc={`No se encontraron usuarios para "${search}".`} />
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: "rgba(255,105,180,0.4)" }}>{filtered.length} usuario{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((u) => (
            <div key={u.id} className="admin-row flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-white">{u.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,105,180,0.4)" }}>{u.whatsapp} · {u.city || "Sin ciudad"}</p>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "rgba(255,105,180,0.3)" }}>{new Date(u.createdAt).toLocaleDateString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
