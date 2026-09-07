import React, { useState } from 'react';
import { 
  ArrowLeft, FileText, CheckCircle2, AlertTriangle, XCircle, 
  BarChart3, Scale, ShieldCheck, ShieldAlert, Award, Calculator, 
  Printer, Image as ImageIcon, CheckSquare, BookOpen, RefreshCw,
  Eye, AlertOctagon, HelpCircle, ExternalLink, Sparkles, Barcode as BarcodeIcon,
  Shield, AlertCircle, ChevronDown, ChevronUp, Copy, Check, Flag,
  Building2, Tag, Calendar, Globe, PhoneCall, Languages, Layers, DollarSign
} from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { calculateProductGrade, calculateDomainScores, getPlainEnglishSummary } from '../../utils/grading';
import { CanvasViewer } from '../inspection/CanvasViewer';
import { OCRRawTextViewer } from './OCRRawTextViewer';
import { BarcodeSymbolsCard } from './BarcodeSymbolsCard';

interface FullPageReportProps {
  report: AuditReport | null;
  onClose: () => void;
  onOpenNotice: () => void;
  onOpenComplaint?: () => void;
  onRescan?: () => void;
}

const formatPenaltyText = (val: any): string => {
  if (!val) return 'Rule 32 (Fine up to ₹25,000)';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.title || val.id || 'Rule 32 (Fine up to ₹25,000)';
  return String(val);
};

// Map each statutory mandate to an unmistakable visual icon & badge styling
const getMandateIconConfig = (mandateId: string) => {
  switch (mandateId) {
    case 'mfg_address':
      return {
        icon: Building2,
        category: 'Origin & Facility',
        iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
      };
    case 'generic_name':
      return {
        icon: Tag,
        category: 'Identity & Nature',
        iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    case 'net_quantity':
      return {
        icon: Scale,
        category: 'Metrology Weight',
        iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    case 'mrp':
      return {
        icon: DollarSign,
        category: 'Consumer Price',
        iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
      };
    case 'mfg_date':
      return {
        icon: Calendar,
        category: 'Batch & Packing',
        iconBg: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      };
    case 'usp':
      return {
        icon: Calculator,
        category: 'Unit Sale Rate',
        iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      };
    case 'consumer_care':
      return {
        icon: PhoneCall,
        category: 'Grievance Redressal',
        iconBg: 'bg-green-100 text-green-700 border-green-200',
      };
    case 'country_of_origin':
      return {
        icon: Globe,
        category: 'Customs & Origin',
        iconBg: 'bg-sky-100 text-sky-700 border-sky-200',
      };
    case 'best_before':
      return {
        icon: Calendar,
        category: 'Shelf Life & Safety',
        iconBg: 'bg-orange-100 text-orange-700 border-orange-200',
      };
    case 'language':
      return {
        icon: Languages,
        category: 'Official Languages',
        iconBg: 'bg-teal-100 text-teal-700 border-teal-200',
      };
    case 'dual_mrp':
      return {
        icon: Layers,
        category: 'Fair Pricing Law',
        iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
      };
    default:
      return {
        icon: ShieldCheck,
        category: 'Statutory Clause',
        iconBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      };
  }
};

export const FullPageReport: React.FC<FullPageReportProps> = ({
  report,
  onClose,
  onOpenNotice,
  onOpenComplaint,
  onRescan,
}) => {
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'barcodes' | 'canvas' | 'gazette'>('overview');
  const [filter, setFilter] = useState<'ALL' | 'VIOLATION' | 'WARNING' | 'COMPLIANT'>('ALL');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number>(0);

  if (!report) return null;

  const gradeInfo = calculateProductGrade(report);
  const domainScores = calculateDomainScores(report.checklist || []);

  const summary = report.summary || {
    total_mandates_checked: (report.checklist || []).length || 11,
    compliant_count: (report.checklist || []).filter((c) => c.status === 'COMPLIANT').length,
    warnings_count: (report.checklist || []).filter((c) => c.status === 'WARNING').length,
    violations_count: (report.checklist || []).filter((c) => c.status === 'VIOLATION').length,
  };

  const total = summary.total_mandates_checked || 11;
  const compliant = summary.compliant_count || 0;
  const warnings = summary.warnings_count || 0;
  const violations = summary.violations_count || 0;

  // Donut / Pie Chart calculations
  const radius = 58;
  const strokeWidth = 14;
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

  const usp = report.usp_verification;
  const isUspValid = usp?.status === 'COMPLIANT';

  const filteredItems = (report.checklist || []).filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const handleSpotlight = (mandateId: string) => {
    setSelectedMandateId(mandateId);
    const match = report.bounding_boxes?.find((b) => b.mandate_id === mandateId);
    if (match) {
      setActiveBoxId(match.id);
    }
    setActiveTab('canvas');
  };

  const isLawful = gradeInfo.lawfulForSale;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F0EDE3] text-zinc-900 selection:bg-rose-500/20 selection:text-rose-900 flex flex-col font-sans antialiased">
      
      {/* Dynamic Ambient Mesh Glow Background */}
      <div 
        className="fixed inset-0 pointer-events-none -z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(at 10% 15%, rgba(244, 63, 94, 0.08) 0px, transparent 50%),
            radial-gradient(at 90% 10%, rgba(16, 185, 129, 0.08) 0px, transparent 45%),
            radial-gradient(at 50% 85%, rgba(245, 158, 11, 0.06) 0px, transparent 60%)
          `
        }}
      />

      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200 flex items-center gap-2 font-medium text-xs transition-all active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Scanner</span>
            </button>

            <div className="h-5 w-px bg-zinc-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold text-rose-600 tracking-wider">
                  STATUTORY AUDIT CONSOLE
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse hidden sm:inline-block" />
              </div>
              <h1 className="text-base sm:text-lg font-black text-zinc-900 truncate max-w-[220px] sm:max-w-md tracking-tight leading-none mt-0.5">
                {report.product_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRescan && (
              <button
                onClick={onRescan}
                className="hidden sm:flex px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200 font-semibold text-xs items-center gap-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                <span>Rescan</span>
              </button>
            )}

            <button
              onClick={onOpenNotice}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                isLawful
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isLawful ? 'View Official Certificate' : 'Issue Rule 32 Legal Notice'}
              </span>
              <span className="sm:hidden">
                {isLawful ? 'Certificate' : 'Notice'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Page Scrollable Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6 relative z-10">
        
        {/* 1. Hero Status Card */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm relative overflow-hidden">
          
          {/* Top Edge Gradient Stripe */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
            isLawful 
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
              : 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600'
          }`} />

          {/* Background Holographic Watermark */}
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none select-none">
            <Scale className="w-80 h-80 text-zinc-900" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Left Column: Grade Badge + Identity */}
            <div className="flex items-start sm:items-center gap-5">
              
              {/* Vibrant Grade Badge Square */}
              <div className="flex flex-col items-center">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg shrink-0 ${
                  isLawful 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                    : 'bg-gradient-to-br from-amber-500 via-rose-500 to-rose-700 text-white'
                }`}>
                  <span className="text-3xl sm:text-4xl leading-none tracking-tight">{gradeInfo.grade}</span>
                  <span className="text-[10px] sm:text-[11px] tracking-widest uppercase font-bold mt-1 opacity-95">
                    GRADE
                  </span>
                </div>
                <div className="mt-2 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                    isLawful 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {isLawful ? 'LOW RISK' : 'HIGH RISK'}
                  </span>
                </div>
              </div>

              {/* Identity & Legal Posture */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-mono font-bold">
                    {report.audit_id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                    isLawful
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {isLawful ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{isLawful ? 'LAWFUL FOR DISTRIBUTION' : 'STATUTORY CONTRAVENTION DETECTED'}</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                  {report.product_name}
                </h2>

                <p className="text-sm font-medium text-zinc-600 max-w-xl leading-relaxed">
                  {gradeInfo.description}
                </p>

                <div className="pt-2 flex items-center gap-3 sm:gap-4 text-xs font-medium text-zinc-500 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span>Audit:</span>
                    <strong className="text-zinc-800 font-mono">
                      {report.audit_timestamp ? new Date(report.audit_timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                    </strong>
                  </span>
                  <span className="text-zinc-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <span>Corpus:</span>
                    <strong className="text-indigo-700 font-mono">
                      LMPC Gazette v{report.corpus_version || '2024.1'}
                    </strong>
                  </span>
                  <span className="text-zinc-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <span>Penalty Exposure:</span>
                    <strong className="text-rose-600 font-mono">
                      {gradeInfo.penaltyEstimate}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Key Metrology Metrics Tiles */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-center min-w-[130px] shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                  Compliance Score
                </span>
                <p className="text-3xl font-black text-zinc-900 mt-1 font-mono tracking-tight">
                  {report.compliance_score}%
                </p>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {total} Mandates Audited
                </span>
              </div>

              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-center min-w-[130px] shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                  Defects Found
                </span>
                <p className={`text-3xl font-black mt-1 font-mono tracking-tight ${violations > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {violations}
                </p>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {violations === 0 ? 'Zero Violations' : `${violations} Non-Compliant`}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Analytical Visual Graphs & Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Donut / Pie Chart Column (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-zinc-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                  Statutory Compliance Breakdown
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Proportionate compliance across mandatory Legal Metrology declarations
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
                {total} Mandates
              </span>
            </div>

            <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-8">
              
              {/* Interactive SVG Donut Ring */}
              <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90 transform drop-shadow-sm" viewBox="0 0 160 160">
                  {/* Track ring */}
                  <circle cx="80" cy="80" r={radius} stroke="#e4e4e7" strokeWidth={strokeWidth} fill="none" />

                  {/* Compliant Arc */}
                  {compliant > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="#10b981"
                      strokeWidth={hoveredSlice === 'compliant' ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={`${strokeCompliant} ${circumference}`}
                      strokeDashoffset={offsetCompliant}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSlice('compliant')}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )}

                  {/* Warnings Arc */}
                  {warnings > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="#f59e0b"
                      strokeWidth={hoveredSlice === 'warnings' ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={`${strokeWarning} ${circumference}`}
                      strokeDashoffset={offsetWarning}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSlice('warnings')}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )}

                  {/* Violations Arc */}
                  {violations > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="#f43f5e"
                      strokeWidth={hoveredSlice === 'violations' ? strokeWidth + 4 : strokeWidth}
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

                {/* Center Seal */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-4xl font-black text-zinc-900 tracking-tight leading-none">
                    {gradeInfo.grade}
                  </span>
                  <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest mt-1 font-mono">
                    {report.compliance_score}%
                  </span>
                </div>
              </div>

              {/* Interactive Legend Cards */}
              <div className="space-y-3 w-full sm:w-64">
                <div
                  onMouseEnter={() => setHoveredSlice('compliant')}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    hoveredSlice === 'compliant'
                      ? 'bg-emerald-50 border-emerald-300 scale-102 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                    <div>
                      <p className="font-bold text-xs text-zinc-900">Compliant (Pass)</p>
                      <p className="text-[10px] text-zinc-500 font-medium">Satisfies statutory rules</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-700">
                    {compliant} <span className="text-[11px] text-zinc-500 font-sans">({Math.round(compliantPercent)}%)</span>
                  </span>
                </div>

                <div
                  onMouseEnter={() => setHoveredSlice('warnings')}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    hoveredSlice === 'warnings'
                      ? 'bg-amber-50 border-amber-300 scale-102 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-xs" />
                    <div>
                      <p className="font-bold text-xs text-zinc-900">Format Advisories</p>
                      <p className="text-[10px] text-zinc-500 font-medium">Non-penal corrections</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-amber-700">
                    {warnings} <span className="text-[11px] text-zinc-500 font-sans">({Math.round(warningPercent)}%)</span>
                  </span>
                </div>

                <div
                  onMouseEnter={() => setHoveredSlice('violations')}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    hoveredSlice === 'violations'
                      ? 'bg-rose-50 border-rose-300 scale-102 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs" />
                    <div>
                      <p className="font-bold text-xs text-zinc-900">Critical Violations</p>
                      <p className="text-[10px] text-zinc-500 font-medium">Rule 32 penalty liability</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-rose-700">
                    {violations} <span className="text-[11px] text-zinc-500 font-sans">({Math.round(violationPercent)}%)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Authority: Dept. of Consumer Affairs, Legal Metrology Division</span>
              <span className="font-bold text-zinc-700 font-mono">G.S.R. 784(E) 2024</span>
            </div>
          </div>

          {/* 4 Pillars Legal Category Graph (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border border-zinc-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                  4 Legal Domain Pillar Scores
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Automated metric weights across statutory pillars
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-500 font-mono">Target: 100%</span>
            </div>

            <div className="space-y-3 py-1">
              {domainScores.map((domain) => (
                <div key={domain.id} className="space-y-1.5 bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: domain.color }} />
                      <span className="font-bold text-zinc-800">{domain.name}</span>
                    </div>
                    <span className="font-black font-mono text-zinc-900 text-xs">
                      {domain.score}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 shadow-xs"
                      style={{ width: `${domain.score}%`, backgroundColor: domain.color }}
                    />
                  </div>

                  <p className="text-[10px] text-zinc-500 font-medium pt-0.5">
                    {domain.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 font-medium">
              Ground truth verified against LMPC 2011 Rules &amp; Decriminalization Amendments.
            </div>
          </div>
        </section>

        {/* 3. Mathematical USP Verification Visualizer */}
        {usp && (
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-zinc-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-xs">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                    Unit Sale Price (USP) Mathematical Verification
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Statutory computation audit under Rule 6(1)(s) and Rule 6(11) (G.S.R. 779(E))
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-md text-xs font-black tracking-wide uppercase self-start sm:self-auto ${
                  isUspValid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
                }`}
              >
                {isUspValid ? 'STATUTORILY ACCURATE' : 'USP STATUTORY MISMATCH / OMITTED'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Printed on Label
                </span>
                <p className="text-xl font-black text-zinc-900 font-mono">
                  {usp.printed || '[NOT DECLARED]'}
                </p>
                <p className="text-xs text-zinc-500">Extracted from packaging OCR token scan</p>
              </div>

              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Mandated Calculated Rate
                </span>
                <p className="text-xl font-black text-emerald-700 font-mono">
                  {usp.calculated?.expected_display || 'N/A'}
                </p>
                <p className="text-xs text-zinc-500 font-mono">
                  Formula: {usp.calculated?.formula || 'MRP ÷ Net Quantity'}
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border space-y-1 ${
                  isUspValid
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Enforcement Finding
                </span>
                <p className="text-sm font-black leading-snug">
                  {isUspValid ? 'Mathematical Tolerance Satisfied' : 'Actionable Discrepancy'}
                </p>
                <p className="text-xs opacity-90 leading-relaxed">
                  {usp.discrepancy || usp.reason || 'Unit sale price satisfies legal metrology standard.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 4. Tab Navigation for Detailed Sections - Clean, Responsive 4-Button Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-1.5 bg-zinc-200/70 rounded-2xl border border-zinc-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 sm:px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs ${
              activeTab === 'overview'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 border border-zinc-200/80'
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">11 Mandates ({compliant}/{total})</span>
          </button>

          <button
            onClick={() => setActiveTab('barcodes')}
            className={`px-3 sm:px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs ${
              activeTab === 'barcodes'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 border border-zinc-200/80'
            }`}
          >
            <BarcodeIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">Barcode &amp; Symbols</span>
            {report.barcode_data?.detected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 sm:px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs ${
              activeTab === 'canvas'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 border border-zinc-200/80'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">Spatial Canvas</span>
          </button>

          <button
            onClick={() => setActiveTab('gazette')}
            className={`px-3 sm:px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs ${
              activeTab === 'gazette'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 border border-zinc-200/80'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Gazette Citations</span>
          </button>
        </div>

        {/* TAB A: 11 Mandates Breakdown (Clause Inspection List with Filter Tabs) */}
        {activeTab === 'overview' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-5">
            
            {/* Filter Pills Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                  Statutory Clause Inspection List
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Click any item to inspect its official Gazette clause, penalty exposure, or spotlight on packaging
                </p>
              </div>

              {/* Filter Tabs matching HTML mockup */}
              <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto border border-zinc-200">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'ALL' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  All ({report.checklist?.length || 11})
                </button>
                {violations > 0 && (
                  <button
                    onClick={() => setFilter('VIOLATION')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filter === 'VIOLATION' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    Violations ({violations})
                  </button>
                )}
                {warnings > 0 && (
                  <button
                    onClick={() => setFilter('WARNING')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filter === 'WARNING' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    Advisories ({warnings})
                  </button>
                )}
                <button
                  onClick={() => setFilter('COMPLIANT')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'COMPLIANT' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Pass ({compliant})
                </button>
              </div>
            </div>

            {/* Mandate Cards List with Distinct Icons */}
            <div className="space-y-3.5">
              {filteredItems.map((item) => {
                const isViolation = item.status === 'VIOLATION';
                const isWarning = item.status === 'WARNING';
                const isCitationOpen = expandedCitationId === item.mandate_id;
                const plainSummary = getPlainEnglishSummary(item);
                const iconConfig = getMandateIconConfig(item.mandate_id);
                const MandateIcon = iconConfig.icon;

                return (
                  <div
                    key={item.mandate_id}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isViolation
                        ? 'bg-rose-50/40 border-rose-300 border-l-4 border-l-rose-600 shadow-2xs'
                        : isWarning
                        ? 'bg-amber-50/40 border-amber-300 border-l-4 border-l-amber-500 shadow-2xs'
                        : 'bg-zinc-50/70 border-zinc-200/90 hover:border-zinc-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Distinct Visual Category Icon */}
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${iconConfig.iconBg}`}>
                          <MandateIcon className="w-5 h-5" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-zinc-900">
                              {item.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-200/80 text-zinc-700 border border-zinc-300">
                              {item.rule}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                              {iconConfig.category}
                            </span>
                          </div>

                          {/* Plain English Finding */}
                          <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                            {plainSummary}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-md text-xs font-black shrink-0 ${
                          item.status === 'COMPLIANT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                        }`}
                      >
                        {item.status === 'COMPLIANT' ? 'PASS' : item.status === 'WARNING' ? 'ADVISORY' : 'VIOLATION'}
                      </span>
                    </div>

                    {/* Detected Content & Action Controls */}
                    <div className="mt-3.5 pt-3 border-t border-zinc-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider shrink-0">
                          Detected on Packaging:
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-white text-zinc-800 border border-zinc-200 font-mono text-xs font-semibold truncate max-w-sm shadow-2xs">
                          {item.extracted_text || '[NOT FOUND ON PACKAGING]'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSpotlight(item.mandate_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 border border-zinc-200 font-medium text-xs transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Spotlight on Canvas</span>
                        </button>

                        <button
                          onClick={() => setExpandedCitationId(isCitationOpen ? null : item.mandate_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium text-xs transition-colors shadow-2xs"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isCitationOpen ? 'Hide Law Citation' : 'View Gazette Law'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Gazette Law Accordion */}
                    {isCitationOpen && item.gazette_citation && (
                      <div className="mt-3.5 p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5 text-xs text-zinc-800 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between font-bold text-indigo-900 text-xs">
                          <span>Official Gazette Ref: {item.gazette_citation.gazette_ref || 'LMPC Rules 2011'}</span>
                          <span className="font-mono bg-indigo-100 px-2 py-0.5 rounded text-[11px] border border-indigo-200 text-indigo-800">
                            {item.gazette_citation.rule || item.rule}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-700 italic bg-white p-3 rounded-lg border border-indigo-100 leading-relaxed font-serif shadow-2xs">
                          "{item.gazette_citation.verbatim_clause || item.gazette_citation.verbatim_text}"
                        </p>

                        {item.gazette_citation.officer_guidance && (
                          <p className="text-xs text-zinc-700">
                            <strong className="text-zinc-900">Enforcement Directive: </strong>
                            {item.gazette_citation.officer_guidance}
                          </p>
                        )}

                        <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs font-semibold text-zinc-700">
                          <span>Statutory Sanction / Penalty:</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {formatPenaltyText(item.gazette_citation?.penalty_rule)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB B: Barcode, QR & Statutory Packaging Symbols */}
        {activeTab === 'barcodes' && (
          <div className="space-y-6">
            <BarcodeSymbolsCard
              barcode={report.barcode_data || report.label_data?.barcode_data}
              qr={report.qr_data || report.label_data?.qr_data}
              symbols={report.packaging_symbols || report.label_data?.packaging_symbols}
            />
          </div>
        )}

        {/* TAB C: Packaging Spatial Canvas & OCR */}
        {activeTab === 'canvas' && (
          <section className="space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                    Interactive Packaging Canvas &amp; Token Zones
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Click any highlighted token bounding box on the packaging to inspect its statutory declaration
                  </p>
                </div>
                {selectedMandateId && (
                  <button
                    onClick={() => setSelectedMandateId(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800"
                  >
                    Clear Spotlight
                  </button>
                )}
              </div>

              {/* Multi-Panel Image Switcher */}
              {report.additional_image_urls && report.additional_image_urls.length > 0 && (
                <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-zinc-100 overflow-x-auto">
                  <span className="text-[11px] font-bold text-zinc-500 shrink-0">
                    Panels ({1 + report.additional_image_urls.length}):
                  </span>
                  {[report.image_url || '/presets/compliant_biscuit.svg', ...report.additional_image_urls].map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPanelIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedPanelIndex === idx
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                      }`}
                    >
                      {idx === 0 ? 'Panel 1 (Front)' : idx === 1 ? 'Panel 2 (Back)' : `Panel ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              <CanvasViewer
                imageUrl={
                  [report.image_url || '/presets/compliant_biscuit.svg', ...(report.additional_image_urls || [])][
                    selectedPanelIndex
                  ] || report.image_url || '/presets/compliant_biscuit.svg'
                }
                boundingBoxes={report.bounding_boxes || []}
                activeBoxId={activeBoxId}
                onSelectBox={setActiveBoxId}
                selectedMandateId={selectedMandateId}
              />
            </div>

            {/* Raw OCR Text Box */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                Raw Extracted OCR Text Stream
              </h4>
              <OCRRawTextViewer
                rawText={report.raw_ocr_text}
                extractedFields={report.label_data}
              />
            </div>
          </section>
        )}

        {/* TAB D: Official Gazette Citations (38 Rules) */}
        {activeTab === 'gazette' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-4">
            <div className="pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                Statutory Gazette Citations &amp; Legal Authorities
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Every citation is retrieved from the 38 statutory rules of the Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {(report.checklist || []).map((item) => (
                <div key={item.mandate_id} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900">{item.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-zinc-700 border border-zinc-200">
                      {item.rule}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 italic bg-white p-3 rounded-lg border border-zinc-200 leading-relaxed font-serif shadow-2xs">
                    "{item.gazette_citation?.verbatim_clause || item.gazette_citation?.verbatim_text || item.reason}"
                  </p>

                  <div className="text-[11px] flex items-center justify-between text-zinc-500 font-medium">
                    <span>Gazette Ref: {item.gazette_citation?.gazette_ref || 'LMPC Rules 2011'}</span>
                    <span className="font-bold text-rose-600 font-mono">
                      {formatPenaltyText(item.gazette_citation?.penalty_rule)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Sticky Bottom Actions Bar */}
      <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200 font-semibold text-xs transition-colors shadow-2xs"
          >
            Close Full Report
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenComplaint && (
              <button
                onClick={onOpenComplaint}
                className="px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 bg-[#FF2A85] hover:bg-[#e0246f] text-white"
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">File Govt Complaint</span>
                <span className="sm:hidden">Complaint</span>
              </button>
            )}
            <button
              onClick={onOpenNotice}
              className={`px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 ${
                isLawful
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>
                {isLawful ? 'Compliance Certificate' : 'Issue Notice'}
              </span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
