import React from 'react';
import { Building2, ArrowRight, Shield, Phone, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';

export const STATE_DEPT_MAP: Record<string, { dept: string; email: string; phone: string }> = {
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
}

export const PortalRoutingPreview: React.FC<PortalRoutingPreviewProps> = ({ state }) => {
  const dept = state ? STATE_DEPT_MAP[state] : null;

  if (!state) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 overflow-hidden text-zinc-900 mt-2">
      <div className="px-3.5 py-2 bg-indigo-100/80 border-b border-indigo-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-700" />
          <span className="text-[11px] font-bold text-indigo-900">
            Auto-Routing: {state} Legal Metrology
          </span>
        </div>
        <span className="text-[9px] font-mono font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
          Act 2009
        </span>
      </div>

      <div className="p-3 space-y-2 text-xs">
        {dept && (
          <div className="bg-white rounded-xl p-2.5 border border-indigo-100 space-y-1">
            <p className="font-extrabold text-zinc-900 text-xs">{dept.dept}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-indigo-600" />
                {dept.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-indigo-600" />
                {dept.email}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-0.5 px-1">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Direct forward to State Controller &amp; INGRAM (NCH 1800-11-4000)
          </span>
        </div>
      </div>
    </div>
  );
};
