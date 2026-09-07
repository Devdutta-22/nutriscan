import React from 'react';
import { Building2, ArrowRight, Shield, Phone, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';

const STATE_DEPT_MAP: Record<string, { dept: string; email: string; phone: string }> = {
  'Andhra Pradesh':     { dept: 'AP Dept of Legal Metrology',          email: 'lm.ap@gov.in',      phone: '0866-2410800' },
  'Arunachal Pradesh':  { dept: 'AR Legal Metrology Dept',             email: 'lm.ar@gov.in',      phone: '0360-2244311' },
  'Assam':              { dept: 'Assam Legal Metrology',               email: 'lm.as@gov.in',      phone: '0361-2237318' },
  'Bihar':              { dept: 'Bihar Legal Metrology',               email: 'lm.br@gov.in',      phone: '0612-2220039' },
  'Chhattisgarh':       { dept: 'CG Dept of Weights & Measures',       email: 'lm.cg@gov.in',      phone: '0771-2444095' },
  'Goa':                { dept: 'Goa Legal Metrology',                 email: 'lm.ga@gov.in',      phone: '0832-2226053' },
  'Gujarat':            { dept: 'Gujarat Legal Metrology Dept',        email: 'lm.gj@gov.in',      phone: '079-23253055' },
  'Haryana':            { dept: 'Haryana Legal Metrology',             email: 'lm.hr@gov.in',      phone: '0172-2740476' },
  'Himachal Pradesh':   { dept: 'HP Legal Metrology Dept',             email: 'lm.hp@gov.in',      phone: '0177-2625867' },
  'Jharkhand':          { dept: 'Jharkhand Legal Metrology',           email: 'lm.jh@gov.in',      phone: '0651-2490068' },
  'Karnataka':          { dept: 'Karnataka Dept of Legal Metrology',   email: 'lm.ka@gov.in',      phone: '080-22268190' },
  'Kerala':             { dept: 'Kerala Legal Metrology Dept',         email: 'lm.kl@gov.in',      phone: '0471-2518590' },
  'Madhya Pradesh':     { dept: 'MP Weights & Measures Dept',          email: 'lm.mp@gov.in',      phone: '0755-2572665' },
  'Maharashtra':        { dept: 'Maharashtra Legal Metrology',         email: 'lm.mh@gov.in',      phone: '022-22023565' },
  'Manipur':            { dept: 'Manipur Legal Metrology',             email: 'lm.mn@gov.in',      phone: '0385-2451373' },
  'Meghalaya':          { dept: 'Meghalaya Legal Metrology',           email: 'lm.ml@gov.in',      phone: '0364-2227892' },
  'Mizoram':            { dept: 'Mizoram Legal Metrology',             email: 'lm.mz@gov.in',      phone: '0389-2323752' },
  'Nagaland':           { dept: 'Nagaland Legal Metrology',            email: 'lm.nl@gov.in',      phone: '0370-2271011' },
  'Odisha':             { dept: 'Odisha Legal Metrology Dept',         email: 'lm.od@gov.in',      phone: '0674-2533088' },
  'Punjab':             { dept: 'Punjab Legal Metrology',              email: 'lm.pb@gov.in',      phone: '0172-2749040' },
  'Rajasthan':          { dept: 'Rajasthan Legal Metrology',           email: 'lm.rj@gov.in',      phone: '0141-2721285' },
  'Sikkim':             { dept: 'Sikkim Legal Metrology',              email: 'lm.sk@gov.in',      phone: '03592-202286' },
  'Tamil Nadu':         { dept: 'TN Legal Metrology Dept',             email: 'lm.tn@gov.in',      phone: '044-25671660' },
  'Telangana':          { dept: 'Telangana Legal Metrology',           email: 'lm.tg@gov.in',      phone: '040-23450302' },
  'Tripura':            { dept: 'Tripura Legal Metrology',             email: 'lm.tr@gov.in',      phone: '0381-2324877' },
  'Uttar Pradesh':      { dept: 'UP Legal Metrology Dept',             email: 'lm.up@gov.in',      phone: '0522-2236906' },
  'Uttarakhand':        { dept: 'Uttarakhand Legal Metrology',         email: 'lm.uk@gov.in',      phone: '0135-2710281' },
  'West Bengal':        { dept: 'WB Legal Metrology Dept',             email: 'lm.wb@gov.in',      phone: '033-22143082' },
  'Delhi':              { dept: 'Delhi Legal Metrology (GNCTD)',        email: 'lm.dl@gov.in',      phone: '011-23392382' },
  'Jammu & Kashmir':    { dept: 'J&K Legal Metrology Dept',            email: 'lm.jk@gov.in',      phone: '0194-2481800' },
  'Ladakh':             { dept: 'Ladakh Legal Metrology',              email: 'lm.la@gov.in',      phone: '01982-252037' },
  'Puducherry':         { dept: 'Puducherry Legal Metrology',          email: 'lm.py@gov.in',      phone: '0413-2334034' },
  'Chandigarh':         { dept: 'Chandigarh Legal Metrology',          email: 'lm.ch@gov.in',      phone: '0172-2740476' },
  'Other / Central':    { dept: 'DPIIT Central Legal Metrology',       email: 'lm.central@gov.in', phone: '011-23063633' },
};

interface PortalRoutingPreviewProps {
  state: string;
  compact?: boolean;
}

export const PortalRoutingPreview: React.FC<PortalRoutingPreviewProps> = ({ state, compact = false }) => {
  const dept = state ? STATE_DEPT_MAP[state] : null;

  if (!state) {
    return (
      <div className="rounded-2xl bg-[#161F30] border border-slate-700/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Complaint Routing Preview</span>
        </div>
        <p className="text-slate-500 text-xs font-mono text-center py-2">
          Select your State / UT above to see which government portal will receive your complaint.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#161F30] border border-indigo-500/30 overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-widest">
          Auto-Routing Destination
        </span>
        <span className="ml-auto text-[10px] font-mono text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">
          {state}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Routing flow visualization */}
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg">
              📱
            </div>
            <span className="font-mono text-[9px] text-cyan-400 whitespace-nowrap">FairPack</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0">
            <div className="w-full h-px bg-gradient-to-r from-cyan-500/60 to-indigo-500/60" />
            <ArrowRight className="w-3 h-3 text-indigo-400 -mt-1.5" />
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-mono text-[9px] text-indigo-400 whitespace-nowrap">State Dept</span>
          </div>

          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-mono text-[9px] text-amber-400 whitespace-nowrap">INGRAM</span>
          </div>
        </div>

        {/* State dept details */}
        {dept && (
          <div className="bg-[#0B0F17] rounded-xl border border-slate-800 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Primary Destination</p>
                <p className="text-sm font-extrabold text-white mt-0.5 leading-snug truncate">{dept.dept}</p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                Active
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{dept.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{dept.email}</span>
              </div>
            </div>
          </div>
        )}

        {/* INGRAM */}
        <div className="bg-[#0B0F17] rounded-xl border border-amber-500/20 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
              Secondary Escalation — INGRAM/NCH
            </p>
            <a
              href="https://consumerhelpline.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300"
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-sm font-black text-white font-mono">1800-11-4000</span>
            <span className="text-[10px] text-slate-500 font-mono">Toll-free</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-[10px] font-mono text-slate-500">
            Filed under <span className="text-emerald-400">Legal Metrology Act, 2009 §25</span>. Acknowledgment within 30 days.
          </span>
        </div>
      </div>
    </div>
  );
};

export { STATE_DEPT_MAP };
