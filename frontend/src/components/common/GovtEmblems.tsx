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
          // Fallback if image fails to load
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      <div className="hidden sm:flex flex-col text-left leading-none">
        <span className="text-[11px] font-black text-amber-950 tracking-tight">
          जागो ग्राहक जागो
        </span>
        <span className="text-[8px] font-extrabold text-amber-700 tracking-wider">
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/15 border border-amber-500/30 text-amber-950 shrink-0 select-none shadow-xs ${className}`}
      title="National Consumer Helpline - 1915 or 1800-11-4000"
    >
      <div className="w-6 h-6 rounded-full bg-[#EAB308] text-zinc-950 flex items-center justify-center font-black text-[11px] shadow-xs shrink-0">
        📞
      </div>
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center gap-1.5 font-mono font-black text-[11px] text-zinc-900">
          <span className="bg-amber-400/30 px-1 py-0.5 rounded text-zinc-950">1915</span>
          <span className="text-zinc-400 text-[8px]">OR</span>
          <span className="text-[10px]">1800-11-4000</span>
        </div>
        <span className="text-[7.5px] font-extrabold text-amber-900 uppercase tracking-wider mt-0.5">
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
        className="object-contain shrink-0 max-h-10"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      <div className="flex flex-col text-left leading-none">
        <span className="text-[11px] font-black text-zinc-900 tracking-wide">
          भारत सरकार
        </span>
        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
          Govt. of India
        </span>
      </div>
    </div>
  );
};

export const GovtTrustBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-md rounded-2xl p-3 px-4 border border-zinc-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3.5 text-xs ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <AshokaEmblem size={30} />
        <div className="h-7 w-px bg-zinc-200 hidden sm:block" />
        <div className="hidden md:block">
          <p className="text-[11px] font-black text-zinc-900 leading-tight">
            उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय
          </p>
          <p className="text-[9.5px] font-medium text-zinc-500 mt-0.5">
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
