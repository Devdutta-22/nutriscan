import React, { useState } from 'react';
import {
  Megaphone, Search, ExternalLink, Shield, Building2, Phone, Mail,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, FileText, Scale,
  HelpCircle, ChevronRight, Sparkles, Send, Loader2, XCircle
} from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { STATE_DEPT_MAP } from './PortalRoutingPreview';

interface DedicatedComplaintViewProps {
  report: AuditReport | null;
  onOpenComplaintModal: () => void;
  onOpenTrackerModal: () => void;
  onOpenGovPortal: () => void;
}

const GOV_PORTALS = [
  {
    id: 'ingram',
    name: 'National Consumer Helpline (NCH / INGRAM)',
    dept: 'Dept of Consumer Affairs, Govt of India',
    url: 'https://consumerhelpline.gov.in',
    helpline: '1800-11-4000',
    sms: '8800001915',
    timing: 'Mon–Sat 9:30 AM – 5:30 PM (National Toll-Free)',
    description: 'Integrated Grievance Redress Mechanism for pre-litigation consumer complaints against manufacturers, packers, and e-commerce platforms.',
    badge: 'Primary Redressal',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    color: 'border-emerald-200 bg-emerald-50/50',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'edaakhil',
    name: 'e-Daakhil Consumer Commission Portal',
    dept: 'National Consumer Disputes Redressal Commission (NCDRC)',
    url: 'https://edaakhil.nic.in',
    helpline: '011-24300657',
    sms: null,
    timing: '24/7 Digital Filing across District, State & National Commissions',
    description: 'Statutory online court filing platform to lodge formal consumer cases under the Consumer Protection Act, 2019 without physical court presence.',
    badge: 'Legal Redressal',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    color: 'border-indigo-200 bg-indigo-50/50',
    iconColor: 'text-indigo-600',
  },
  {
    id: 'lm_dept',
    name: 'Legal Metrology Department (Weights & Measures)',
    dept: 'State Controllers of Legal Metrology',
    url: 'https://consumeraffairs.nic.in',
    helpline: '011-23063633',
    sms: null,
    timing: 'Official State Inspectorate Offices across 34 States & UTs',
    description: 'Statutory regulatory body enforcing Legal Metrology (Packaged Commodities) Rules, 2011. Inspects label violations, seizure of defective stock & Rule 32 compounding.',
    badge: 'Packaging & MRP Laws',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    color: 'border-purple-200 bg-purple-50/50',
    iconColor: 'text-purple-600',
  },
  {
    id: 'fssai_cms',
    name: 'FSSAI Food Safety Grievance Portal',
    dept: 'Food Safety and Standards Authority of India (MoHFW)',
    url: 'https://foodlicensing.fssai.gov.in/cmsweb/',
    helpline: '1800-11-2100',
    sms: null,
    timing: 'Toll-free 7 AM – 11 PM',
    description: 'Central portal to report food safety violations, deceptive nutrition declarations, adulteration, expired foodstuffs, and unauthorized ingredients.',
    badge: 'Food Quality & Safety',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    color: 'border-amber-200 bg-amber-50/50',
    iconColor: 'text-amber-600',
  },
];

export const DedicatedComplaintView: React.FC<DedicatedComplaintViewProps> = ({
  report,
  onOpenComplaintModal,
  onOpenTrackerModal,
  onOpenGovPortal,
}) => {
  const [selectedState, setSelectedState] = useState<string>('Delhi');
  const [quickRef, setQuickRef] = useState<string>('');
  const [isSearchingTrack, setIsSearchingTrack] = useState<boolean>(false);
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState<string>('');

  const stateInfo = STATE_DEPT_MAP[selectedState] || STATE_DEPT_MAP['Other / Central'];

  const handleQuickTrack = async () => {
    const ref = quickRef.trim().toUpperCase();
    if (!ref) return;
    setIsSearchingTrack(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await fetch(`/api/complaints/track/${ref}`);
      if (res.status === 404) {
        setTrackError(`No complaint record found for "${ref}". Please verify the reference code.`);
        return;
      }
      if (!res.ok) throw new Error('Failed to query server');
      const data = await res.json();
      setTrackResult(data);
    } catch {
      setTrackError('Could not reach server. Please check internet connection.');
    } finally {
      setIsSearchingTrack(false);
    }
  };

  const violationsCount = (report?.violations?.length || 0) + (report?.warnings?.length || 0);

  return (
    <div className="space-y-6 pt-2 pb-24 px-1">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#0E1118] via-[#1a1f2e] to-[#0E1118] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF2A85]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D5FF3F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FF2A85] text-xs font-black tracking-wider uppercase">
            <Megaphone className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Consumer Grievance Redressal Hub</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Enforce Your Consumer Rights Under Indian Law
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            File legal metrology violations directly to your state department or escalate to the
            National Consumer Helpline (INGRAM). Report deceptive unit pricing, missing mandatory declarations,
            expired stock, and over-charging beyond MRP.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onOpenComplaintModal}
              className="bg-[#FF2A85] hover:bg-[#e0246f] text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-[#FF2A85]/30 active:scale-95 transition-all"
            >
              <Megaphone className="w-4 h-4" />
              <span>File New Complaint Now</span>
            </button>

            <button
              onClick={onOpenTrackerModal}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl flex items-center gap-2 active:scale-95 transition-all"
            >
              <Search className="w-4 h-4 text-[#D5FF3F]" />
              <span>Track Complaint Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Audit Quick Action Card (if a scanned product has violations) */}
      {report && violationsCount > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black text-rose-800 uppercase tracking-wider">
                Current Audit Violations Detected
              </span>
            </div>
            <p className="font-black text-zinc-900 text-sm sm:text-base">
              {report.product_name}
            </p>
            <p className="text-xs text-zinc-600">
              {violationsCount} issue{violationsCount > 1 ? 's' : ''} found under Legal Metrology Rules (Score: {report.compliance_score}%)
            </p>
          </div>
          <button
            onClick={onOpenComplaintModal}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <span>Auto-Fill &amp; File</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2-Column Grid: Fast Tracker + State Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Track Any Complaint Card */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900">Instant Complaint Status Tracker</h3>
              <p className="text-[11px] text-zinc-500">Query your reference number (e.g. NSC-XXXXXXXX)</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={quickRef}
              onChange={(e) => setQuickRef(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickTrack()}
              placeholder="NSC-XXXXXXXX"
              className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85]"
            />
            <button
              onClick={handleQuickTrack}
              disabled={!quickRef.trim() || isSearchingTrack}
              className="bg-[#0E1118] text-[#D5FF3F] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 disabled:opacity-40 hover:bg-zinc-800 transition-colors"
            >
              {isSearchingTrack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Track</span>}
            </button>
          </div>

          {trackError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{trackError}</span>
            </div>
          )}

          {trackResult && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-zinc-900">{trackResult.ref_number}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {trackResult.status}
                </span>
              </div>
              <p className="font-bold text-zinc-800">{trackResult.product_name}</p>
              <p className="text-zinc-500 text-[11px]">Routed: {trackResult.routed_to_dept}</p>
              {trackResult.officer_notes && (
                <div className="bg-yellow-50 p-2 rounded-lg text-[11px] text-yellow-900 border border-yellow-200">
                  <span className="font-bold">Officer Note:</span> {trackResult.officer_notes}
                </div>
              )}
              <button
                onClick={onOpenTrackerModal}
                className="w-full text-center text-xs font-bold text-[#FF2A85] hover:underline pt-1"
              >
                View Full Interactive Timeline →
              </button>
            </div>
          )}
        </div>

        {/* State Legal Metrology Routing Directory */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900">State Legal Metrology Directory</h3>
                <p className="text-[11px] text-zinc-500">Contact details for your state controller</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-600 block">Select State / Union Territory</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {Object.keys(STATE_DEPT_MAP).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <p className="font-black text-purple-950">{stateInfo.dept}</p>
            <div className="flex flex-col gap-1 text-[11px] text-zinc-700 pt-1">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-semibold">{stateInfo.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-600" />
                <span>{stateInfo.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Relevant Government Portals Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FF2A85]" />
              <span>Official Government Redressal Portals</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Verified statutory portals managed by Government of India ministries
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOV_PORTALS.map((portal) => (
            <div
              key={portal.id}
              className={`rounded-3xl border ${portal.color} p-5 space-y-3 shadow-xs hover:shadow-md transition-shadow bg-white flex flex-col justify-between`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${portal.badgeColor}`}>
                    {portal.badge}
                  </span>
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
                    title={`Open ${portal.name}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div>
                  <h3 className="font-black text-zinc-900 text-sm sm:text-base leading-snug">
                    {portal.name}
                  </h3>
                  <p className="text-[11px] font-bold text-zinc-500 mt-0.5">{portal.dept}</p>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  {portal.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 font-black text-zinc-900">
                    <Phone className={`w-3.5 h-3.5 ${portal.iconColor}`} />
                    <span>{portal.helpline}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{portal.timing}</span>
                </div>

                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#0E1118] hover:bg-zinc-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Visit {portal.name.split('(')[0].trim()}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enforcement & Officer Portal Link */}
      <div className="bg-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#D5FF3F]" />
            <span className="text-xs font-black text-[#D5FF3F] uppercase tracking-wider">
              Authorized Government Personnel
            </span>
          </div>
          <h3 className="text-base font-black">Legal Metrology Officer Portal</h3>
          <p className="text-xs text-indigo-200 max-w-xl">
            Inspectors and state controllers can log in with their official token to view all registered
            complaints, update compounding status, and forward dockets to INGRAM.
          </p>
        </div>
        <button
          onClick={onOpenGovPortal}
          className="shrink-0 bg-[#D5FF3F] hover:bg-[#c6f230] text-zinc-950 font-black text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <Shield className="w-4 h-4" />
          <span>Access Officer Portal</span>
        </button>
      </div>
    </div>
  );
};
