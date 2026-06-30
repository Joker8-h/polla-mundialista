"use client";

import { useState } from "react";

interface ValidationResult { 
  valid: boolean; 
  code: string; 
  used: boolean; 
  expiresAt: string; 
  winner?: { name: string; whatsapp: string }; 
  prize?: { label: string; value?: number; unit?: string; minPurchase?: number }; 
}

export default function StoreRedeemPage() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="w-full max-w-sm space-y-6 bg-white rounded-3xl p-8 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-800">Tienda Física</h1>
            <p className="text-sm text-gray-500 mt-2">Acceso para validación de cupones</p>
          </div>
          <input 
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm outline-none focus:ring-2 focus:ring-pink-500 transition-all" 
            type="password" 
            placeholder="Contraseña de la tienda" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button 
            onClick={() => setAuthed(password === "tienda2026")} 
            className="w-full py-3 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  const validate = async () => { 
    setLoading(true);
    setError(""); 
    setResult(null); 
    
    try {
      const res = await fetch(`/api/v1/validate-code?code=${code}`, { 
        headers: { "x-api-key": "admin-validation" } 
      }); 
      
      if (res.ok) { 
        setResult(await res.json()); 
      } else { 
        const err = await res.json(); 
        setError(err.error || "Error al validar"); 
      }
    } catch (e) {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };
  
  const invalidate = async () => { 
    if(!confirm("¿Estás seguro de canjear este cupón? Ya no podrá usarse nuevamente.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/codes/${code}/invalidate`, { method: "POST" }); 
      if (res.ok) {
        alert("¡Cupón canjeado con éxito!"); 
        setResult(null); 
        setCode(""); 
      } else {
        alert("Error al canjear el cupón");
      }
    } catch(e) {
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-landing p-4 font-sans">
      <div className="max-w-md mx-auto space-y-6 pt-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Validar Cupón</h1>
          <p className="text-gray-500 mt-2">Ingresa el código del ganador para entregarlo</p>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-md space-y-4">
          <input 
            className="w-full px-4 py-4 rounded-xl text-2xl font-mono tracking-widest text-center text-gray-800 bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-pink-500 transition-all uppercase" 
            placeholder="XXXX-XXXX" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
          />
          <button 
            onClick={validate} 
            disabled={!code || loading} 
            className="w-full py-3.5 rounded-xl font-bold text-lg text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 transition-all shadow-md"
          >
            {loading ? "Buscando..." : "Buscar Cupón"}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-medium border border-red-100">
            {error}
          </div>
        )}
        
        {result && (
          <div className="bg-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Detalles del Cupón</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result.valid ? "Válido" : "Inválido"}
              </span>
            </div>
            
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-3">
                <span className="text-gray-500 text-sm">Ganador:</span> 
                <span className="col-span-2 font-bold text-gray-900">{result.winner?.name}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500 text-sm">Teléfono:</span> 
                <span className="col-span-2 text-gray-700">{result.winner?.whatsapp}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500 text-sm">Premio:</span> 
                <span className="col-span-2 font-bold text-pink-600">{result.prize?.label}</span>
              </div>
              {result.prize?.value && (
                <div className="grid grid-cols-3">
                  <span className="text-gray-500 text-sm">Valor:</span> 
                  <span className="col-span-2 text-green-600 font-semibold">
                    {result.prize.unit === "percent" ? `${result.prize.value}%` : `$${result.prize.value.toLocaleString("es-CO")}`}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3">
                <span className="text-gray-500 text-sm">Estado:</span> 
                <span className="col-span-2 font-medium text-gray-800">{result.used ? "Redimido (Ya usado)" : "Disponible para canje"}</span>
              </div>
            </div>
            
            {result.valid && !result.used && (
              <div className="pt-4 mt-2 border-t border-gray-100">
                <button 
                  onClick={invalidate} 
                  disabled={loading}
                  className="w-full py-4 rounded-xl text-lg font-black bg-gray-900 text-white hover:bg-black transition-all shadow-md"
                >
                  Confirmar Entrega y Canjear
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">Al confirmar, el cupón ya no podrá ser usado nuevamente.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
