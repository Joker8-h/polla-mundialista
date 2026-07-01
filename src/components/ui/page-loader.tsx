"use client";

import { usePageLoader } from "@/lib/navigation-loading";

export function PageLoader() {
  const { isLoading } = usePageLoader();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{background:'rgba(10,0,8,0.92)', backdropFilter:'blur(12px)'}}>
      <div className="text-center space-y-5">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full animate-ping" style={{background:'rgba(255,20,147,0.2)'}} />
          <div className="relative w-full h-full rounded-full flex items-center justify-center text-4xl animate-bounce" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)'}}>
            ⚽
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-black" style={{background:'linear-gradient(90deg, #ff1493, #ff69b4, #c500ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>
            Cargando
          </p>
          <div className="flex justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{background:'#ff1493', animationDelay:'0s'}} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{background:'#ff69b4', animationDelay:'0.15s'}} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c500ff', animationDelay:'0.3s'}} />
          </div>
        </div>
      </div>
    </div>
  );
}
