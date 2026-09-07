import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, ShieldAlert, Award, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { calculateProductGrade, calculateDomainScores } from '../../utils/grading';

interface TodaySnapshotProps {
  report?: AuditReport | null;
  onViewAll?: () => void;
  onInspect?: () => void;
}

export const TodaySnapshot: React.FC<TodaySnapshotProps> = ({ report, onViewAll, onInspect }) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  if (!report) {
    return null;
  }

  const gradeInfo = calculateProductGrade(report);
  const domainScores = calculateDomainScores(report.checklist || []);

  const total = report.summary.total_mandates_checked || 11;
  const compliant = report.summary.compliant_count || 0;
  const warnings = report.summary.warnings_count || 0;
  const violations = report.summary.violations_count || 0;

  // Calculate SVG donut segments
  const radius = 38;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  const compliantPercent = total > 0 ? (compliant / total) * 100 : 0;
  const warningPercent = total > 0 ? (warnings / total) * 100 : 0;
  const violationPercent = total > 0 ? (violations / total) * 100 : 0;

  const strokeCompliant = (compliantPercent / 100) * circumference;
  const strokeWarning = (warningPercent / 100) * circumference;
  const strokeViolation = (violationPercent / 100) * circumference;

  const offsetCompliant = 0;
  const offsetWarning = -strokeCompliant;
  const offsetViolation = -(strokeCompliant + strokeWarning);

  return (
    <div className="pt-2">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-base font-extrabold text-white tracking-tight">
            Active Specimen Telemetry &amp; Breakdown
          </h3>
        </div>
        <button
          onClick={onInspect || onViewAll}
          className="text-xs font-black text-cyan-400 hover:text-cyan-300 font-mono tracking-wider transition-colors flex items-center gap-1"
        >
          <span>FULL REPORT</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Result Card */}
      <div className="bg-[#111827] rounded-3xl p-5 border border-slate-800 shadow-xl shadow-black/40 hover:border-slate-700 transition-all space-y-4">
        
        {/* Product Title & Legal Seal */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
              Scanned Packaging Specimen
            </span>
            <h4 className="text-base font-black text-white truncate leading-tight mt-0.5">
              {report.product_name}
            </h4>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 font-mono ${
              gradeInfo.lawfulForSale
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            {gradeInfo.lawfulForSale ? 'LAWFUL TO SELL' : 'UNLAWFUL FOR SALE'}
          </span>
        </div>

        {/* Middle Row: Donut Pie Chart + Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-1">
          
          {/* SVG Pie / Donut Chart */}
          <div className="relative flex items-center justify-center shrink-0 w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background track */}
              <circle cx="50" cy="50" r={radius} stroke="#1e293b" strokeWidth={strokeWidth} fill="none" />

              {/* Green Arc: Compliant */}
              {compliant > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#10b981"
                  strokeWidth={hoveredSlice === 'compliant' ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${strokeCompliant} ${circumference}`}
                  strokeDashoffset={offsetCompliant}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice('compliant')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              )}

              {/* Amber Arc: Warnings */}
              {warnings > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#f59e0b"
                  strokeWidth={hoveredSlice === 'warnings' ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${strokeWarning} ${circumference}`}
                  strokeDashoffset={offsetWarning}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice('warnings')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              )}

              {/* Pink Arc: Violations */}
              {violations > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#f43f5e"
                  strokeWidth={hoveredSlice === 'violations' ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${strokeViolation} ${circumference}`}
                  strokeDashoffset={offsetViolation}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice('violations')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              )}
            </svg>

            {/* Center Seal: Grade & Score */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white leading-none">
                {gradeInfo.grade}
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {report.compliance_score}%
              </span>
            </div>
          </div>

          {/* Right: Legend Breakdown Grid */}
          <div className="space-y-2 w-full sm:w-auto font-mono">
            <div
              onMouseEnter={() => setHoveredSlice('compliant')}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center justify-between gap-3 text-xs px-3 py-1.5 rounded-xl border transition-all ${
                hoveredSlice === 'compliant'
                  ? 'bg-emerald-500/20 border-emerald-500/50 scale-102'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-xs shadow-emerald-400/50" />
                <span className="font-bold text-emerald-300">Compliant Mandates</span>
              </div>
              <strong className="text-emerald-400 font-extrabold font-mono">
                {compliant}/{total}
              </strong>
            </div>

            <div
              onMouseEnter={() => setHoveredSlice('warnings')}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center justify-between gap-3 text-xs px-3 py-1.5 rounded-xl border transition-all ${
                hoveredSlice === 'warnings'
                  ? 'bg-amber-500/20 border-amber-500/50 scale-102'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-xs shadow-amber-400/50" />
                <span className="font-bold text-amber-300">Format Advisories</span>
              </div>
              <strong className="text-amber-400 font-extrabold font-mono">
                {warnings}
              </strong>
            </div>

            <div
              onMouseEnter={() => setHoveredSlice('violations')}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center justify-between gap-3 text-xs px-3 py-1.5 rounded-xl border transition-all ${
                hoveredSlice === 'violations'
                  ? 'bg-rose-500/20 border-rose-500/50 scale-102'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs shadow-rose-500/50" />
                <span className="font-bold text-rose-300">Critical Violations</span>
              </div>
              <strong className="text-rose-400 font-extrabold font-mono">
                {violations}
              </strong>
            </div>
          </div>
        </div>

        {/* 4-Domain Mini Progress Bars */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
            Domain Compliance Scores (4 Pillars)
          </span>

          <div className="grid grid-cols-2 gap-2">
            {domainScores.map((domain) => (
              <div key={domain.id} className="bg-[#161F30] p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300 truncate">{domain.name}</span>
                  <span className="font-mono font-extrabold text-cyan-400">{domain.score}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${domain.score}%`, backgroundColor: domain.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive CTA to open Full Inspection Drawer */}
        <button
          onClick={onInspect || onViewAll}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Launch Full Statutory Audit Report (All 11 Mandates)</span>
        </button>
      </div>
    </div>
  );
};
