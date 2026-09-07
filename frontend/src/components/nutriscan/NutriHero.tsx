import React from 'react';
import { ShieldCheck, BookOpen, MapPin, Scale } from 'lucide-react';

export const NutriHero: React.FC = () => {
  return (
    <div className="pt-3 pb-2 space-y-2.5">
      {/* Top Regulatory Authority Breadcrumb Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>STATUTORY AUDIT ACTIVE • LMPC RULES, 2011</span>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[10px] font-mono">
          <Scale className="w-3 h-3 text-slate-400" />
          <span>Section 36 &amp; Rule 32 Enforcement</span>
        </div>
      </div>

      {/* Primary Console Headline */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
          Statutory Packaging Compliance <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400">&amp; Audit Console</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
          Automated multi-angle OCR inspection, Big-8+ statutory declarations checking, deterministic Unit Sale Price (USP) verification, and state-level grievance enforcement.
        </p>
      </div>

      {/* Live System Telemetry Chips */}
      <div className="flex items-center gap-2 pt-1 flex-wrap font-mono text-[11px]">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 shadow-xs">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span><strong className="text-white">90</strong> Gazettes Ingested (2011–2026)</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span><strong className="text-white">Rule 26(a)</strong> Pan Masala Proviso Active</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span><strong className="text-white">34</strong> State &amp; UT Controllers</span>
        </div>
      </div>
    </div>
  );
};
