import React, { useState } from 'react';
import { 
  ChevronLeft, Share2, AlertCircle, Check, X, 
  Building2, Tag, Scale, IndianRupee, Calendar, 
  Calculator, PhoneCall, Globe, Clock, Languages, 
  Layers, Eye, BookOpen, FileText, Barcode as BarcodeIcon, 
  Image as ImageIcon, RefreshCw, Copy, CheckCircle2,
  ExternalLink, Sparkles, ChevronDown, ChevronUp, Award
} from 'lucide-react';
import { AuditReport, ChecklistItem } from '../../types/compliance';
import { calculateProductGrade } from '../../utils/grading';
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

// Map each statutory mandate to an icon, background tint, and default rule text
const getMandateConfig = (mandateId: string) => {
  switch (mandateId) {
    case 'mfg_address':
      return {
        title: 'Manufacturer Address',
        icon: Building2,
        iconBg: 'bg-[#E0F7FA] text-[#00BCD4]',
        defaultRule: 'FSSAI-2024-ADR',
      };
    case 'generic_name':
      return {
        title: 'Generic or Common Name',
        icon: Tag,
        iconBg: 'bg-[#EDE7F6] text-[#7E57C2]',
        defaultRule: 'LEGAL-METRO-NAM',
      };
    case 'net_quantity':
      return {
        title: 'Net Quantity',
        icon: Scale,
        iconBg: 'bg-[#FCE4EC] text-[#E91E63]',
        defaultRule: 'RULE: NET-QTY-SI',
      };
    case 'mrp':
      return {
        title: 'MRP Details',
        icon: IndianRupee,
        iconBg: 'bg-[#E0F7FA] text-[#00BCD4]',
        defaultRule: 'PRICE-NORM-SEC3',
      };
    case 'mfg_date':
      return {
        title: 'MFG/ Packing Date',
        icon: Calendar,
        iconBg: 'bg-[#F9FBE7] text-[#9E9D24]',
        defaultRule: 'EXP-MFG-VISIBILITY',
      };
    case 'usp':
      return {
        title: 'Unit Sale Price (USP)',
        icon: Calculator,
        iconBg: 'bg-[#EDE7F6] text-[#5C6BC0]',
        defaultRule: 'G.S.R. 779(E)',
      };
    case 'consumer_care':
      return {
        title: 'Consumer Care Details',
        icon: PhoneCall,
        iconBg: 'bg-[#E8F5E9] text-[#43A047]',
        defaultRule: 'RULE: 6(1)(h)',
      };
    case 'country_of_origin':
      return {
        title: 'Country of Origin',
        icon: Globe,
        iconBg: 'bg-[#E1F5FE] text-[#0288D1]',
        defaultRule: 'RULE: 6(1)(g)',
      };
    case 'best_before':
      return {
        title: 'Best Before / Expiry Date',
        icon: Clock,
        iconBg: 'bg-[#FFF3E0] text-[#FB8C00]',
        defaultRule: 'RULE: 6(1)(f)',
      };
    case 'language':
      return {
        title: 'Language Compliance',
        icon: Languages,
        iconBg: 'bg-[#E0F2F1] text-[#00897B]',
        defaultRule: 'RULE: 9(4)',
      };
    case 'dual_mrp':
      return {
        title: 'Dual MRP Verification',
        icon: Layers,
        iconBg: 'bg-[#FBE9E7] text-[#E64A19]',
        defaultRule: 'RULE: 18(2A)',
      };
    default:
      return {
        title: mandateId.replace(/_/g, ' ').toUpperCase(),
        icon: Building2,
        iconBg: 'bg-zinc-100 text-zinc-600',
        defaultRule: 'LMPC-2011',
      };
  }
};

// Dynamic visual styling for meter & badge according to grading
const getGradeVisuals = (grade: string) => {
  switch (grade) {
    case 'A+':
    case 'A':
      return {
        meterColor: '#D5FF3F', // neon lime
        needleColor: '#FF2A85', // pink indicator tick
        badgeBg: 'bg-[#D5FF3F] text-black border-2 border-black',
        textColor: 'text-[#D5FF3F]',
        label: 'A GRADE (HIGH COMPLIANCE)',
      };
    case 'B':
      return {
        meterColor: '#FACC15', // yellow
        needleColor: '#00E5FF', // cyan tick
        badgeBg: 'bg-[#FACC15] text-black border-2 border-black',
        textColor: 'text-[#FACC15]',
        label: 'B GRADE (SATISFACTORY)',
      };
    case 'C':
      return {
        meterColor: '#FB923C', // orange
        needleColor: '#D5FF3F', // lime tick
        badgeBg: 'bg-[#FB923C] text-black border-2 border-black',
        textColor: 'text-[#FB923C]',
        label: 'C GRADE (ADVISORIES PRESENT)',
      };
    case 'F':
    default:
      return {
        meterColor: '#FF2A85', // hot pink / red
        needleColor: '#D5FF3F', // lime tick
        badgeBg: 'bg-[#FF2A85] text-white border-2 border-black',
        textColor: 'text-[#FF2A85]',
        label: 'F GRADE (CRITICAL VIOLATION)',
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
  const [activeTab, setActiveTab] = useState<'details' | 'canvas' | 'barcodes' | 'gazette'>('details');
  const [filter, setFilter] = useState<'ALL' | 'VIOLATION' | 'WARNING' | 'COMPLIANT'>('ALL');
  const [expandedMandateId, setExpandedMandateId] = useState<string | null>(null);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(null);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number>(0);
  const [copiedShare, setCopiedShare] = useState(false);

  if (!report) return null;

  const gradeInfo = calculateProductGrade(report);
  const isLawful = gradeInfo.lawfulForSale;
  const score = Math.max(0, Math.min(100, report.compliance_score ?? 0));
  const gradeVisuals = getGradeVisuals(gradeInfo.grade);

  // Summary counts for passed / failed / warnings
  const checklistItems = report.checklist || [];
  const passedCount = checklistItems.filter((c) => c.status === 'COMPLIANT').length;
  const failedCount = checklistItems.filter((c) => c.status === 'VIOLATION').length;
  const warningsCount = checklistItems.filter((c) => c.status === 'WARNING').length;

  const filteredItems = checklistItems.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  // Semicircular speedometer gauge calculations (180° arc)
  const cx = 120;
  const cy = 115;
  const r = 85;
  const circumference = Math.PI * r; // ~267.03
  const strokeDash = (score / 100) * circumference;

  // Indicator needle tick coordinates
  const angleDeg = 180 - (score / 100) * 180;
  const angleRad = angleDeg * (Math.PI / 180);
  const x1 = cx + (r - 12) * Math.cos(angleRad);
  const y1 = cy - (r - 12) * Math.sin(angleRad);
  const x2 = cx + (r + 12) * Math.cos(angleRad);
  const y2 = cy - (r + 12) * Math.sin(angleRad);

  // Nutritional values from report or calibrated fallback matching reference
  const ld = report.label_data || {};
  const nutrition = {
    calories: Number(ld.calories || ld.energy_kcal || ld.energy || 450),
    fat: Number(ld.total_fat || ld.fat || 12),
    carbs: Number(ld.carbohydrates || ld.carbs || 65),
    protein: Number(ld.protein || 8),
    sugar: Number(ld.sugars || ld.sugar || 24),
  };

  const handleSpotlight = (mandateId: string) => {
    setSelectedMandateId(mandateId);
    setActiveTab('canvas');
  };

  const handleShare = async () => {
    const text = `NutriScan / LabelScout Audit: ${report.product_name} - Grade ${gradeInfo.grade} (${report.compliance_score}% Compliance Score)`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Product Details Audit',
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F6F0] overflow-y-auto flex flex-col font-sans antialiased text-zinc-900">
      
      {/* Dynamic Responsive Container: Mobile full-width / Desktop max-w-6xl */}
      <div className="w-full max-w-6xl mx-auto min-h-screen flex flex-col px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Top App Header */}
        <header className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#12161A] hover:bg-black text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <h1 className="font-black text-base sm:text-lg text-[#12161A] tracking-tight">
            Product Details
          </h1>

          <div className="relative">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-xl bg-[#12161A] hover:bg-black text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
              aria-label="Share"
            >
              {copiedShare ? (
                <Check className="w-4 h-4 text-[#D5FF3F]" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            {copiedShare && (
              <span className="absolute -bottom-7 right-0 text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                Copied!
              </span>
            )}
          </div>
        </header>

        {/* View Mode Navigation Switcher (Details vs Canvas vs Barcodes vs Gazette) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200/80 rounded-xl text-xs font-bold max-w-xl mx-auto w-full">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all text-center ${
              activeTab === 'details'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Audit Report
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all text-center ${
              activeTab === 'canvas'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Spatial Canvas
          </button>
          <button
            onClick={() => setActiveTab('barcodes')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all text-center ${
              activeTab === 'barcodes'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Barcodes &amp; Symbols
          </button>
          <button
            onClick={() => setActiveTab('gazette')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all text-center ${
              activeTab === 'gazette'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Gazette Citations
          </button>
        </div>

        {/* MAIN TAB: AUDIT REPORT (DYNAMIC RESPONSIVE FOR MOBILE + PC) */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            
            {/* Top Product Title Block + CERTIFICATE BUTTON (Replaces Grade Button) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/70">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#12161A] uppercase leading-tight">
                  {report.product_name}
                </h2>
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  <span>PACKAGED COMMODITY</span>
                  <span>•</span>
                  <span>{report.product_category?.toUpperCase() || 'BRANDX'}</span>
                  <span>•</span>
                  <span className="text-zinc-700 font-bold">{report.audit_id}</span>
                </div>
              </div>

              {/* CERTIFICATE PDF BUTTON ON TOP (replaces static grade pill) */}
              <button
                onClick={onOpenNotice}
                className="bg-[#D5FF3F] hover:bg-[#c2ef2b] text-black border-2 border-black font-black px-4 py-2.5 rounded-xl text-xs tracking-wider shadow-[3px_3px_0px_#000] shrink-0 transition-all active:scale-95 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                title="View and download official statutory compliance certificate & PDF report"
              >
                <FileText className="w-4 h-4 text-black stroke-[2.5]" />
                <span className="font-extrabold uppercase">
                  {isLawful ? 'Compliance Certificate PDF' : 'Rule 32 Legal Notice PDF'}
                </span>
              </button>
            </div>

            {/* DYNAMIC TWO-COLUMN GRID ON DESKTOP (lg:), SINGLE-COLUMN ON MOBILE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* LEFT COLUMN: GAUGE + NUTRITION ANALYSIS + ACTIONS (5 cols on desktop) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
                
                {/* 1. Semicircular Speedometer Gauge Card */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#8B5CF6] rounded-full inline-block" />
                    <h3 className="text-base sm:text-lg font-black text-[#12161A] tracking-tight">
                      Label Compliance
                    </h3>
                  </div>

                  <div className="bg-[#131722] rounded-3xl p-6 text-white text-center relative overflow-hidden shadow-lg border border-black">
                    {/* Soft decorative background bubble */}
                    <div className="w-44 h-44 rounded-full bg-[#2C2B4E]/60 absolute -top-10 -right-10 pointer-events-none blur-[1px]" />

                    {/* SVG Gauge */}
                    <svg className="w-full max-w-[280px] mx-auto overflow-visible" viewBox="0 0 240 135">
                      {/* Top 50 label */}
                      <text x="120" y="16" fill="#9CA3AF" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                        50
                      </text>

                      {/* Background Track Arc */}
                      <path
                        d="M 35,115 A 85,85 0 0,1 205,115"
                        fill="none"
                        stroke="#2B313F"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />

                      {/* Dynamic Active Arc (colored according to grade) */}
                      <path
                        d="M 35,115 A 85,85 0 0,1 205,115"
                        fill="none"
                        stroke={gradeVisuals.meterColor}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Dynamic Indicator Needle Tick */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={gradeVisuals.needleColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* GRADE AT CENTER OF SEMICIRCLE METER */}
                      <text 
                        x="120" 
                        y="72" 
                        textAnchor="middle" 
                        fill="#FFFFFF" 
                        fontSize="38" 
                        fontWeight="900"
                        letterSpacing="-0.5"
                      >
                        {gradeInfo.grade}
                      </text>

                      {/* PERCENTAGE DIRECTLY BELOW THE GRADE */}
                      <text 
                        x="120" 
                        y="94" 
                        textAnchor="middle" 
                        fill={gradeVisuals.meterColor} 
                        fontSize="17" 
                        fontWeight="800"
                      >
                        {score}%
                      </text>

                      {/* Subtitle */}
                      <text x="120" y="107" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="800" letterSpacing="1.5">
                        COMPLIANCE SCORE
                      </text>
                    </svg>

                    {/* Bottom Big Percentage Text in Grade Color */}
                    <p className="text-3xl sm:text-4xl font-black tracking-tight mt-1" style={{ color: gradeVisuals.meterColor }}>
                      {score} %
                    </p>

                    {/* TEST CASE PASS / FAIL COUNTS TEXT */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3 pt-3 border-t border-white/10 text-xs font-bold font-mono flex-wrap">
                      <span className="text-[#D5FF3F] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        {passedCount} Passed
                      </span>
                      <span className="text-white/30">•</span>
                      {failedCount > 0 ? (
                        <span className="text-[#FF2A85] flex items-center gap-1">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          {failedCount} Failed
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> 0 Failed
                        </span>
                      )}
                      {warningsCount > 0 && (
                        <>
                          <span className="text-white/30">•</span>
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {warningsCount} Warnings
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. Nutrition Analysis Bar Chart */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#00E5FF] rounded-full inline-block" />
                    <h3 className="text-base sm:text-lg font-black text-[#12161A] tracking-tight">
                      Nutrition Analysis
                    </h3>
                  </div>

                  <div className="bg-[#131722] rounded-3xl p-3 sm:p-4 border border-black shadow-lg">
                    <div className="bg-white rounded-2xl p-4 sm:p-5">
                      
                      {/* Chart Container with Y Axis */}
                      <div className="relative h-56 sm:h-60 flex">
                        {/* Y Axis Numbers */}
                        <div className="flex flex-col justify-between text-[10px] font-bold text-zinc-400 pr-2 select-none py-1 text-right w-7">
                          <span>400</span>
                          <span>300</span>
                          <span>200</span>
                          <span>100</span>
                          <span>0</span>
                        </div>

                        {/* Grid lines & Bars container */}
                        <div className="relative flex-1 border-l border-b border-zinc-200">
                          {/* Horizontal Grid lines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
                            <div className="w-full border-b border-zinc-100" />
                            <div className="w-full border-b border-zinc-100" />
                            <div className="w-full border-b border-zinc-100" />
                            <div className="w-full border-b border-zinc-100" />
                            <div className="w-full border-b border-transparent" />
                          </div>

                          {/* 5 Vertical Bars */}
                          <div className="relative h-full flex items-end justify-between px-1.5 sm:px-3 pb-0">
                            {/* Calories (Black bar) */}
                            <div className="flex flex-col items-center w-8 sm:w-11">
                              <div 
                                className="w-full bg-[#12161A] border-2 border-black rounded-t flex items-center justify-center overflow-hidden transition-all duration-700"
                                style={{ height: `${Math.min(205, (nutrition.calories / 500) * 205)}px` }}
                              >
                                <span className="text-white text-[10px] font-black -rotate-90 whitespace-nowrap tracking-wider select-none">
                                  {nutrition.calories}kcal
                                </span>
                              </div>
                            </div>

                            {/* Fat (Cyan bar) */}
                            <div className="flex flex-col items-center w-8 sm:w-11">
                              <span className="text-[10px] font-bold text-zinc-700 pb-1">
                                {nutrition.fat}g
                              </span>
                              <div 
                                className="w-full bg-[#00E5FF] border-2 border-black rounded-t transition-all duration-700"
                                style={{ height: `${Math.max(12, Math.min(180, (nutrition.fat / 100) * 170))}px` }}
                              />
                            </div>

                            {/* Carbs (Purple bar) */}
                            <div className="flex flex-col items-center w-8 sm:w-11">
                              <div 
                                className="w-full bg-[#8B5CF6] border-2 border-black rounded-t flex items-center justify-center transition-all duration-700"
                                style={{ height: `${Math.max(22, Math.min(180, (nutrition.carbs / 100) * 170))}px` }}
                              >
                                <span className="text-white text-[10px] font-black select-none">
                                  {nutrition.carbs}g
                                </span>
                              </div>
                            </div>

                            {/* Protein (Lime bar) */}
                            <div className="flex flex-col items-center w-8 sm:w-11">
                              <span className="text-[10px] font-bold text-zinc-700 pb-1">
                                {nutrition.protein}g
                              </span>
                              <div 
                                className="w-full bg-[#D5FF3F] border-2 border-black rounded-t transition-all duration-700"
                                style={{ height: `${Math.max(10, Math.min(180, (nutrition.protein / 100) * 170))}px` }}
                              />
                            </div>

                            {/* Sugar (Pink bar) */}
                            <div className="flex flex-col items-center w-8 sm:w-11">
                              <span className="text-[10px] font-bold text-zinc-700 pb-1">
                                {nutrition.sugar}g
                              </span>
                              <div 
                                className="w-full bg-[#FF2A85] border-2 border-black rounded-t transition-all duration-700"
                                style={{ height: `${Math.max(16, Math.min(180, (nutrition.sugar / 100) * 170))}px` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* X Axis Labels */}
                      <div className="flex justify-between pl-7 pr-1.5 sm:pr-3 pt-2 text-center text-xs font-bold text-zinc-900 select-none">
                        <span className="w-8 sm:w-11">Calories</span>
                        <span className="w-8 sm:w-11">Fat</span>
                        <span className="w-8 sm:w-11">Carbs</span>
                        <span className="w-8 sm:w-11">Protein</span>
                        <span className="w-8 sm:w-11">Sugar</span>
                      </div>

                    </div>
                  </div>
                </section>

                {/* 3. Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={onOpenComplaint ? onOpenComplaint : onOpenNotice}
                    className="w-full bg-[#131722] hover:bg-black text-white py-4 px-6 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] border border-zinc-800"
                  >
                    <span>REPORT VIOLATION</span>
                    <AlertCircle className="w-5 h-5 text-white" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onOpenNotice}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-xs text-center transition-colors shadow-2xs"
                    >
                      {isLawful ? 'Compliance Certificate' : 'Rule 32 Notice'}
                    </button>
                    {onRescan && (
                      <button
                        onClick={onRescan}
                        className="py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Rescan</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: 11 STATUTORY TEST CASE BOXES (7 cols on desktop) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Header & Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#12161A] tracking-tight">
                      Statutory Declarations Checklist
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      11 mandatory declarations evaluated under Legal Metrology Rules, 2011
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-zinc-200/80 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
                    <button
                      onClick={() => setFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filter === 'ALL' ? 'bg-black text-white shadow-2xs' : 'text-zinc-600 hover:text-black'
                      }`}
                    >
                      All ({checklistItems.length})
                    </button>
                    {failedCount > 0 && (
                      <button
                        onClick={() => setFilter('VIOLATION')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          filter === 'VIOLATION' ? 'bg-[#FF2A85] text-white shadow-2xs' : 'text-[#FF2A85] hover:bg-rose-100/50'
                        }`}
                      >
                        Failed ({failedCount})
                      </button>
                    )}
                    {warningsCount > 0 && (
                      <button
                        onClick={() => setFilter('WARNING')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          filter === 'WARNING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-100/50'
                        }`}
                      >
                        Advisories ({warningsCount})
                      </button>
                    )}
                    <button
                      onClick={() => setFilter('COMPLIANT')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filter === 'COMPLIANT' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-100/50'
                      }`}
                    >
                      Passed ({passedCount})
                    </button>
                  </div>
                </div>

                {/* Test Case Cards List */}
                <div className="space-y-3">
                  {filteredItems.map((item) => {
                    const iconConfig = getMandateConfig(item.mandate_id);
                    const Icon = iconConfig.icon;
                    const isViolation = item.status === 'VIOLATION';
                    const isWarning = item.status === 'WARNING';
                    const isExpanded = expandedMandateId === item.mandate_id;

                    return (
                      <div
                        key={item.mandate_id}
                        className={`rounded-2xl p-1.5 transition-all duration-200 ${
                          isViolation
                            ? 'bg-[#131722] border-2 border-[#D5FF3F] shadow-[0_0_15px_rgba(213,255,63,0.35)]'
                            : 'bg-[#131722] border border-black shadow-sm'
                        }`}
                      >
                        {/* Inner White Card */}
                        <div
                          onClick={() => setExpandedMandateId(isExpanded ? null : item.mandate_id)}
                          className="bg-white rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-zinc-50/90"
                        >
                          {/* Left Icon Square */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconConfig.iconBg}`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Middle Title & Rule Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm text-zinc-900 leading-tight truncate">
                              {iconConfig.title}
                            </h4>
                            {isViolation ? (
                              <p className="font-mono text-[10px] font-black text-[#FF2A85] tracking-tight uppercase truncate mt-0.5">
                                {item.reason ? `${item.reason.toUpperCase()}` : 'VIOLATION DETECTED'}
                              </p>
                            ) : isWarning ? (
                              <p className="font-mono text-[10px] font-bold text-amber-500 tracking-tight uppercase truncate mt-0.5">
                                ADVISORY: {item.reason ? item.reason.toUpperCase() : 'NON-PENAL ADVISORY'}
                              </p>
                            ) : (
                              <p className="font-mono text-[10px] font-bold text-zinc-400 tracking-wider uppercase truncate mt-0.5">
                                RULE: {item.rule ? item.rule.replace(/^Rule\s*/i, '') : iconConfig.defaultRule}
                              </p>
                            )}
                          </div>

                          {/* Right Status Badge */}
                          <div className="flex flex-col items-center shrink-0 pl-1">
                            {isViolation ? (
                              <div className="w-6 h-6 rounded-full bg-[#FF2A85] text-white flex items-center justify-center shadow-xs">
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : isWarning ? (
                              <div className="w-6 h-6 rounded-full bg-[#F59E0B] text-black flex items-center justify-center shadow-xs font-bold text-xs">
                                !
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                            <span className="bg-[#131722] text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider text-center mt-1">
                              {isViolation ? 'FAIL' : isWarning ? 'WARN' : 'PASS'}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Statutory Details Drawer */}
                        {isExpanded && (
                          <div className="px-3 pt-3 pb-2.5 text-white text-xs space-y-2.5 animate-in fade-in duration-200">
                            <div className="bg-white/10 rounded-lg p-2.5 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Detected On Packaging:
                              </span>
                              <p className="font-mono text-xs text-white break-words">
                                {item.extracted_text || '[NOT DETECTED ON LABEL]'}
                              </p>
                            </div>

                            {item.gazette_citation && (
                              <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                                  <span>Ref: {item.gazette_citation.gazette_ref || 'LMPC Rules 2011'}</span>
                                  <span className="text-[#D5FF3F] font-bold">{item.gazette_citation.rule || item.rule}</span>
                                </div>
                                <p className="text-[11px] italic text-zinc-300 font-serif leading-relaxed">
                                  "{item.gazette_citation.verbatim_clause || item.gazette_citation.verbatim_text || item.reason}"
                                </p>
                                <p className="text-[10px] font-bold text-rose-400 pt-1 border-t border-white/10">
                                  Penalty: {formatPenaltyText(item.gazette_citation.penalty_rule)}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSpotlight(item.mandate_id)}
                                className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#D5FF3F]" />
                                <span>Spotlight on Canvas</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveTab('gazette')}
                                className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-zinc-300" />
                                <span>Full Gazette</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB B: SPATIAL CANVAS */}
        {activeTab === 'canvas' && (
          <div className="space-y-4 pb-8">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-zinc-900">
                    Spatial Canvas &amp; Packaging Tokens
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Click any highlighted token box to inspect statutory text
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

              {/* Multi-panel Switcher */}
              {report.additional_image_urls && report.additional_image_urls.length > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 overflow-x-auto">
                  <span className="text-[11px] font-bold text-zinc-500 shrink-0">Panels:</span>
                  {[report.image_url || '/presets/compliant_biscuit.svg', ...report.additional_image_urls].map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPanelIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedPanelIndex === idx
                          ? 'bg-black text-white shadow-2xs'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {idx === 0 ? 'Panel 1' : `Panel ${idx + 1}`}
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
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-300 shadow-sm space-y-2">
              <h4 className="font-black text-xs uppercase tracking-wider text-zinc-900">
                Raw Extracted OCR Text Stream
              </h4>
              <OCRRawTextViewer
                rawText={report.raw_ocr_text}
                extractedFields={report.label_data}
              />
            </div>
          </div>
        )}

        {/* TAB C: BARCODES & PACKAGING SYMBOLS */}
        {activeTab === 'barcodes' && (
          <div className="space-y-4 pb-8">
            <BarcodeSymbolsCard
              barcode={report.barcode_data || report.label_data?.barcode_data}
              qr={report.qr_data || report.label_data?.qr_data}
              symbols={report.packaging_symbols || report.label_data?.packaging_symbols}
            />
          </div>
        )}

        {/* TAB D: OFFICIAL GAZETTE CITATIONS */}
        {activeTab === 'gazette' && (
          <div className="space-y-4 pb-8">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-300 shadow-sm space-y-2">
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-zinc-900">
                Statutory Gazette Citations
              </h3>
              <p className="text-xs text-zinc-500">
                Official rules under Legal Metrology (Packaged Commodities) Rules, 2011 &amp; amendments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklistItems.map((item) => (
                <div key={item.mandate_id} className="p-4 rounded-xl bg-white border border-zinc-300 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900">{item.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                      {item.rule}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 italic bg-zinc-50 p-3 rounded-lg border border-zinc-200 leading-relaxed font-serif">
                    "{item.gazette_citation?.verbatim_clause || item.gazette_citation?.verbatim_text || item.reason}"
                  </p>

                  <div className="text-[11px] flex items-center justify-between text-zinc-500 font-medium pt-1">
                    <span>Gazette Ref: {item.gazette_citation?.gazette_ref || 'LMPC Rules 2011'}</span>
                    <span className="font-bold text-rose-600 font-mono">
                      {formatPenaltyText(item.gazette_citation?.penalty_rule)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
