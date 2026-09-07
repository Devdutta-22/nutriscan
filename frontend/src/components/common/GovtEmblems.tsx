import React from 'react';

/**
 * Official Government of India & Consumer Affairs Emblems:
 * 1. Jago Grahak Jago (जागो ग्राहक जागो)
 * 2. National Consumer Helpline (1915 / 1800-11-4000)
 * 3. State Emblem of India (Ashoka Lion Capital & Satyameva Jayate)
 * 4. Department of Consumer Affairs Crest
 */

export const JagoGrahakJagoLogo: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 38,
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 shrink-0 select-none ${className}`}
      title="Jago Grahak Jago - Ministry of Consumer Affairs, Govt. of India"
    >
      <img
        src="/logos/jago_grahak_jago.png"
        alt="Jago Grahak Jago Official Logo"
        width={size}
        height={size}
        className="object-contain shrink-0 drop-shadow-xs"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      <div className="hidden sm:flex flex-col text-left leading-none">
        <span className="text-[11px] font-black text-amber-300 tracking-tight">
          जागो ग्राहक जागो
        </span>
        <span className="text-[8px] font-extrabold text-amber-500 tracking-wider">
          JAGO GRAHAK JAGO
        </span>
      </div>
    </div>
  );
};

export const NationalConsumerHelplineBadge: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0 select-none shadow-xs ${className}`}
      title="National Consumer Helpline - 1915 or 1800-11-4000"
    >
      <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[11px] shadow-xs shrink-0">
        📞
      </div>
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center gap-1.5 font-mono font-black text-[11px] text-white">
          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1 py-0.5 rounded">1915</span>
          <span className="text-slate-500 text-[8px]">OR</span>
          <span className="text-[10px] text-slate-200">1800-11-4000</span>
        </div>
        <span className="text-[7.5px] font-extrabold text-amber-400 uppercase tracking-wider mt-0.5">
          National Consumer Helpline (NCH)
        </span>
      </div>
    </div>
  );
};

export const AshokaEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 34,
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 shrink-0 select-none ${className}`}
      title="State Emblem of India • भारत सरकार"
    >
      <img
        src="/logos/emblem-gold.png"
        alt="State Emblem of India"
        width={size}
        height={Math.round((size * 320) / 220)}
        className="object-contain shrink-0 max-h-10 drop-shadow-md"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      <div className="flex flex-col text-left leading-none">
        <span className="text-[11px] font-black text-slate-100 tracking-wide">
          भारत सरकार
        </span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 font-mono">
          Govt. of India
        </span>
      </div>
    </div>
  );
};

export const GovtTrustBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`w-full bg-[#111827]/90 backdrop-blur-md rounded-2xl p-3 px-4 border border-slate-800 shadow-xl shadow-black/30 flex flex-wrap items-center justify-between gap-3.5 text-xs ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <AshokaEmblem size={30} />
        <div className="h-7 w-px bg-slate-800 hidden sm:block" />
        <div className="hidden md:block">
          <p className="text-[11px] font-black text-slate-100 leading-tight">
            उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय
          </p>
          <p className="text-[9.5px] font-medium text-slate-400 mt-0.5">
            Ministry of Consumer Affairs, Food &amp; Public Distribution • Legal Metrology Division
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <JagoGrahakJagoLogo size={34} />
        <NationalConsumerHelplineBadge />
      </div>
    </div>
  );
};
