"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Typewriter } from "@/components/ui/typewriter";
import { usePageLoader } from "@/lib/navigation-loading";

const Sparkles = dynamic(() => import("@/components/ui/sparkles").then(m => ({ default: m.Sparkles })), { ssr: false });
const BackgroundPaths = dynamic(() => import("@/components/ui/background-paths").then(m => ({ default: m.BackgroundPaths })), { ssr: false });
const InfiniteRibbon = dynamic(() => import("@/components/ui/infinite-ribbon").then(m => ({ default: m.InfiniteRibbon })), { ssr: false });

const TYPE_WORDS = ["ACUMULA PUNTOS.", "COMPITE SEMANALMENTE.", "DESCIFRA EL JUEGO."];

export default function LandingPage() {
  const router = useRouter();
  const { showLoader, hideLoader } = usePageLoader();
  const [step, setStep] = useState<"landing" | "register" | "login">("landing");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { hideLoader(); }, []);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, city, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const loginRes = await signIn("credentials", {
        whatsapp,
        password,
        redirect: false,
      });
      if (loginRes?.ok) { showLoader(); router.push("/dashboard"); router.refresh(); return; }
      setError("Cuenta creada. Inicia sesión.");
      setStep("login");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        whatsapp,
        password,
        redirect: false,
      });
      if (res?.ok) { showLoader(); router.push("/dashboard"); router.refresh(); return; }
      setError("WhatsApp o contraseña incorrectos");
    } catch {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (step === "landing") {
    return (
      <main className="min-h-screen relative overflow-hidden" style={{background:'#0a0008'}}>
        <div className="absolute inset-0" style={{background:'url(/images/bg2.jpeg) center/cover no-repeat', opacity: 0.6}} />
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 50% 0%, rgba(233,30,99,0.15) 0%, transparent 60%)'}} />
        <div className="absolute inset-0 bg-black/60" />
        <BackgroundPaths color="rgba(255, 20, 147, 0.08)" pathCount={6} />

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)'}}>
              <span className="drop-shadow-lg">⚽</span>
            </div>
            <span className="text-xl font-black" style={{background:'linear-gradient(90deg, #fff, #ff69b4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>FANTASY MUNDIAL</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold" style={{color:'rgba(255,255,255,0.6)'}}>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#premios" className="hover:text-white transition-colors">Premios</a>
            <a href="#ranking" className="hover:text-white transition-colors">Ranking</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("login")} className="px-4 py-2 text-sm font-bold rounded-xl transition-all hover:bg-white/5" style={{color:'#e91e63'}}>Iniciar sesión</button>
            <button onClick={() => setStep("register")} className="px-5 py-2 text-sm font-bold text-white rounded-xl" style={{background: '#e91e63', boxShadow: '0 0 15px rgba(233,30,99,0.5)'}}>Regístrate</button>
          </div>
        </nav>

        <section className="relative z-10 px-6 pt-16 pb-24 max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest mb-4 animate-reveal" style={{color:'#e91e63', animationDelay:'0.1s'}}>⚽ Copa Mundial FIFA 2026</p>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 relative">
              <span className="block animate-reveal" style={{color:'#ffffff', animationDelay:'0.2s'}}>PREDICE.</span>
              <span className="block animate-reveal" style={{color: '#e91e63', textShadow: '0 0 20px rgba(233,30,99,0.6)', animationDelay:'0.4s', height: '3.8em', display: 'flex', alignItems: 'center', overflow: 'hidden'}}>
                <Typewriter words={TYPE_WORDS} className="inline" />
              </span>
              <span className="block animate-reveal animate-gradient" style={{background:'linear-gradient(90deg, #e91e63, #ff6090, #c500ff, #ff1493)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200% 200%', animationDelay:'0.6s'}}>GANA PREMIOS INCREÍBLES.</span>
            </h1>
            <p className="text-lg mb-8 relative z-10 animate-reveal" style={{color:'rgba(255,255,255,0.6)', animationDelay:'0.8s'}}>La polla mundialista más divertida con premios que realmente quieres.</p>
            <div className="flex flex-col sm:flex-row gap-3 relative z-10 animate-reveal" style={{animationDelay:'1s'}}>
              <button onClick={() => setStep("register")} className="px-8 py-4 text-base font-black text-white rounded-xl transition-all active:scale-[0.98] relative overflow-hidden animate-pulse-glow" style={{background: 'linear-gradient(135deg, #e91e63, #c500ff)', boxShadow: '0 0 20px rgba(233,30,99,0.6)'}}>
                <Sparkles count={6} color="#ffffff" minSize={2} maxSize={4} />
                <span className="relative z-10">REGÍSTRATE GRATIS</span>
              </button>
              <a href="#como-funciona" className="px-8 py-4 text-base font-bold rounded-xl transition-all text-center hover:scale-[1.02]" style={{border:'2px solid rgba(233,30,99,0.4)', color:'#e91e63'}}>
                CÓMO FUNCIONA
              </a>
            </div>
          </div>
          
          <div className="absolute top-1/2 right-10 -translate-y-1/2 hidden lg:block w-80 h-80 animate-reveal" style={{animationDelay:'0.5s'}}>
             <Image src="/images/trofeo-neon.png" alt="Trofeo Mundial" width={320} height={320} priority className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" style={{filter:'drop-shadow(0 0 40px rgba(255,0,255,0.4))'}} />
          </div>
        </section>

        <section id="como-funciona" className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest mb-8 animate-reveal" style={{color:'rgba(255,255,255,0.4)', animationDelay:'0.2s'}}>¿Cómo funciona?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: "01", title: "Regístrate", desc: "Crea tu cuenta en segundos", icon: "👤" },
              { num: "02", title: "Predice", desc: "Haz tus pronósticos en cada partido", icon: "📝" },
              { num: "03", title: "Acumula puntos", desc: "Gana puntos por cada acierto", icon: "🎯" },
              { num: "04", title: "Gana premios", desc: "Cada semana hay premios increíbles", icon: "🏆" },
            ].map((s, i) => (
              <div key={s.num} className="rounded-2xl p-5 text-center transition-all hover:scale-[1.02] animate-reveal hover:border-[rgba(255,20,147,0.4)] hover:shadow-[0_0_30px_rgba(255,20,147,0.15)]" style={{background:'rgba(233,30,99,0.05)', border:'1px solid rgba(233,30,99,0.2)', animationDelay:`${0.3 + i * 0.15}s`}}>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110" style={{background:'rgba(233,30,99,0.15)'}}>
                  {s.icon}
                </div>
                <p className="text-xs font-bold mb-1" style={{color:'#e91e63'}}>{s.title}</p>
                <p className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="premios" className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest mb-8 animate-reveal" style={{color:'rgba(255,255,255,0.4)', animationDelay:'0.2s'}}>Premios destacados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { rank: "1ER PREMIO", prize: "Caja Misteriosa Premium", icon: "🎁", glow: 'rgba(233,30,99,0.2)' },
              { rank: "2DO PREMIO", prize: "Kit Fantasy Deluxe", icon: "📦", glow: 'rgba(233,30,99,0.1)' },
              { rank: "3ER PREMIO", prize: "Sorpresa Especial", icon: "🎉", glow: 'rgba(233,30,99,0.05)' },
            ].map((p, i) => (
              <div key={p.rank} className="rounded-2xl p-6 text-center transition-all hover:scale-[1.03] animate-reveal hover:border-[rgba(255,20,147,0.5)] hover:shadow-[0_0_40px_rgba(255,20,147,0.2)]" style={{background:p.glow, border:'1px solid rgba(233,30,99,0.3)', animationDelay:`${0.3 + i * 0.15}s`}}>
                <span className="text-4xl mb-3 block transition-transform hover:scale-125 hover:rotate-12">{p.icon}</span>
                <p className="text-xs font-bold mb-2" style={{color:'#e91e63'}}>{p.rank}</p>
                <p className="text-base font-bold text-white">{p.prize}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 px-6 py-8" style={{borderTop:'1px solid rgba(255,0,255,0.08)', borderBottom:'1px solid rgba(255,0,255,0.08)'}}>
          <div className="max-w-6xl mx-auto">
            <InfiniteRibbon
              speed={25}
              className="py-4"
              items={[
                { value: "⚽", label: "JUEGA Y GANA", icon: "🔥" },
                { value: "🎯", label: "PREDICE EL MUNDIAL", icon: "⚽" },
                { value: "🏆", label: "COMPITE CADA SEMANA", icon: "💪" },
                { value: "🎁", label: "SORPRESAS CADA DÍA", icon: "✨" },
                { value: "🚀", label: "¡PARTICIPA AHORA!", icon: "⭐" },
                { value: "💰", label: "PREMIOS REALES", icon: "🏆" },
              ]}
            />
          </div>
        </section>

        <section className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="animate-reveal" style={{animationDelay:'0.1s'}}>
              <span className="text-4xl block mb-2">⚽</span>
              <p className="text-lg font-black" style={{color:'#ff1493'}}>JUEGA</p>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Predice cada partido</p>
            </div>
            <div className="animate-reveal" style={{animationDelay:'0.2s'}}>
              <span className="text-4xl block mb-2">🎯</span>
              <p className="text-lg font-black" style={{color:'#ff69b4'}}>ACUMULA</p>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Puntos por acierto</p>
            </div>
            <div className="animate-reveal" style={{animationDelay:'0.3s'}}>
              <span className="text-4xl block mb-2">🏆</span>
              <p className="text-lg font-black" style={{color:'#c500ff'}}>COMPARTE</p>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Invita amigos</p>
            </div>
            <div className="animate-reveal" style={{animationDelay:'0.4s'}}>
              <span className="text-4xl block mb-2">🎁</span>
              <p className="text-lg font-black" style={{color:'#ffffff'}}>GANA</p>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Premios cada semana</p>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-6 py-16 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-4 animate-reveal" style={{color:'#ffffff', animationDelay:'0.1s'}}>¿ESTÁS LISTO PARA SER EL CAMPEÓN?</h2>
          <p className="text-base mb-8 animate-reveal" style={{color:'rgba(255,255,255,0.5)', animationDelay:'0.2s'}}>Entra al Mundial y demuestra que eres el mejor prediciendo.</p>
          <button onClick={() => setStep("register")} className="px-10 py-4 text-lg font-black text-white rounded-xl transition-all active:scale-[0.98] relative overflow-hidden animate-reveal animate-pulse-glow hover:scale-105" style={{background: 'linear-gradient(135deg, #e91e63, #c500ff)', boxShadow: '0 0 20px rgba(233,30,99,0.6)', animationDelay:'0.3s'}}>
            <Sparkles count={8} color="#ffffff" minSize={2} maxSize={5} />
            <span className="relative z-10">ENTRAR AL MUNDIAL</span>
          </button>
        </section>

        <footer className="relative z-10 text-center text-xs py-6" style={{borderTop:'1px solid rgba(233,30,99,0.2)', color:'rgba(255,255,255,0.3)'}}>
          Fantasy Mundial © 2026 · Copa Mundial FIFA
        </footer>
      </main>
    );
  }

  if (step === "register") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 relative" style={{background:'#0a0008'}}>
        <div className="absolute inset-0" style={{background:'url(/backgrounds/landing_bg.jpeg) center/cover no-repeat', opacity: 0.3}} />
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 50% 30%, rgba(233,30,99,0.15) 0%, transparent 60%)'}} />
        <div className="w-full max-w-sm relative z-10">
          <button onClick={() => setStep("landing")} className="flex items-center gap-2 mb-6 transition-colors" style={{color:'rgba(255,255,255,0.5)'}}>
            <span className="text-sm">←</span>
            <span className="text-xs font-semibold">Volver</span>
          </button>

          <div className="rounded-3xl p-6 space-y-5 animate-reveal" style={{background:'rgba(18,0,13,0.95)', border:'1px solid rgba(233,30,99,0.3)', boxShadow:'0 25px 50px rgba(0,0,0,0.5)'}}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:'linear-gradient(135deg, #e91e63, #ff6090)'}}>⚽</div>
                <span className="text-lg font-black" style={{background:'linear-gradient(90deg, #fff, #e91e63)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>FANTASY MUNDIAL</span>
              </div>
              <h2 className="text-xl font-black text-white">Crear cuenta</h2>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.5)'}}>Es gratis y rápido</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,255,255,0.4)'}}>Nombre completo</label>
                <input className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all focus:shadow-[0_0_15px_rgba(233,30,99,0.3)]" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="Escribe tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,255,255,0.4)'}}>WhatsApp</label>
                <input inputMode="numeric" className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all focus:shadow-[0_0_15px_rgba(233,30,99,0.3)]" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="3001234567" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,255,255,0.4)'}}>Ciudad</label>
                <input className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all focus:shadow-[0_0_15px_rgba(233,30,99,0.3)]" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="Tu ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,255,255,0.4)'}}>Contraseña</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all focus:shadow-[0_0_15px_rgba(233,30,99,0.3)]" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="Crea tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs text-center rounded-xl py-2" style={{background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)'}}>{error}</p>}
            <button disabled={loading || !whatsapp || !password} onClick={handleRegister} className="w-full py-3.5 mt-2 font-black text-white rounded-xl transition-all disabled:opacity-50 hover:shadow-[0_0_25px_rgba(233,30,99,0.5)]" style={{background: 'linear-gradient(135deg, #e91e63, #c500ff)', boxShadow: '0 0 15px rgba(233,30,99,0.5)'}}>
              {loading ? "CREANDO..." : "ENTRAR AL MUNDIAL"}
            </button>
            <p className="text-center text-[10px] text-gray-500">
              ¿Ya tienes cuenta? <button onClick={() => setStep("login")} style={{color:'#e91e63', fontWeight:'bold'}}>Iniciar sesión</button>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (step === "login") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 relative" style={{background:'#0a0008'}}>
        <div className="absolute inset-0" style={{background:'url(/images/bg1.jpeg) center/cover no-repeat', opacity: 0.3}} />
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 50% 30%, rgba(233,30,99,0.15) 0%, transparent 60%)'}} />
        <div className="w-full max-w-sm relative z-10">
          <button onClick={() => setStep("landing")} className="flex items-center gap-2 mb-6 transition-colors" style={{color:'rgba(255,255,255,0.5)'}}>
            <span className="text-sm">←</span>
            <span className="text-xs font-semibold">Volver</span>
          </button>

          <div className="rounded-3xl p-6 space-y-5 animate-reveal" style={{background:'rgba(18,0,13,0.95)', border:'1px solid rgba(233,30,99,0.3)', boxShadow:'0 25px 50px rgba(0,0,0,0.5)'}}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:'linear-gradient(135deg, #e91e63, #db2777)'}}>⚽</div>
                <span className="text-lg font-black" style={{background:'linear-gradient(90deg, #fff, #e91e63)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>FANTASY MUNDIAL</span>
              </div>
              <h2 className="text-xl font-black text-white">Bienvenido</h2>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.5)'}}>Ingresa para continuar</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,255,255,0.4)'}}>WhatsApp</label>
                <input inputMode="numeric" className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all focus:shadow-[0_0_15px_rgba(233,30,99,0.3)]" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="Tu número de WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,255,255,0.4)'}}>Contraseña</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all focus:shadow-[0_0_15px_rgba(233,30,99,0.3)]" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-red-400 text-xs text-center rounded-xl py-2" style={{background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)'}}>{error}</p>}
              <button disabled={loading} onClick={handleLogin} className="w-full py-3.5 mt-2 font-black text-white rounded-xl transition-all disabled:opacity-50 hover:shadow-[0_0_25px_rgba(233,30,99,0.5)]" style={{background: 'linear-gradient(135deg, #e91e63, #c500ff)', boxShadow: '0 0 15px rgba(233,30,99,0.5)'}}>
                {loading ? "ENTRANDO..." : "INGRESAR"}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-500">
              ¿No tienes cuenta? <button onClick={() => setStep("register")} style={{color:'#e91e63', fontWeight:'bold'}}>Regístrate gratis</button>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
