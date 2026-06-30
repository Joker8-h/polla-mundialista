"use client";
import { useState } from "react";

export default function SetupPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const handlePromote = async () => {
    const res = await fetch("/api/admin/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp, adminPassword: password }),
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    setOk(data.ok);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-5 bg-zinc-900 rounded-3xl p-8 border border-pink-500/20">
        <h1 className="text-2xl font-black text-white text-center">Configurar Admin</h1>
        <p className="text-sm text-gray-400 text-center">Promuéve tu cuenta a administrador</p>
        <input className="w-full px-4 py-3 rounded-xl bg-black/50 border border-pink-500/20 text-white text-sm" placeholder="Tu WhatsApp (ej: 3001234567)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
        <input className="w-full px-4 py-3 rounded-xl bg-black/50 border border-pink-500/20 text-white text-sm" type="password" placeholder="Contraseña de admin" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handlePromote} className="w-full py-3 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 transition-all">
          Hacerme Admin
        </button>
        {msg && <p className={`text-sm text-center font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        {ok && <a href="/admin" className="block text-center text-sm text-pink-400 underline">Ir al Panel Admin</a>}
      </div>
    </div>
  );
}
