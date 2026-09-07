import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app already installed or running as standalone PWA
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or already installed: provide friendly instruction
      alert("To install NutriScan on your home screen:\n\n1. Tap the Share button in Safari/Chrome\n2. Tap 'Add to Home Screen' (+)\n3. Launch NutriScan directly like a native app!");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="mx-0 sm:mx-2 mb-3 bg-[#0E1118] text-white p-3 rounded-2xl border border-zinc-700/80 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#D5FF3F] flex items-center justify-center text-zinc-950 shrink-0 font-black">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-white flex items-center gap-1.5 truncate">
            <span>Install NutriScan App</span>
            <span className="bg-[#FF2A85] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">PWA</span>
          </p>
          <p className="text-[10px] text-zinc-400 truncate">
            Fast, full-screen mobile experience with 1-tap label scanning
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-[#D5FF3F] hover:bg-[#c9f635] text-zinc-950 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1"
        >
          <Download className="w-3 h-3 stroke-[2.5]" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="text-zinc-400 hover:text-white p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
