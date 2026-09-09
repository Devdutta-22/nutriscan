import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  User,
  Cpu,
  Send,
  ShieldCheck,
  Sparkles,
  Scale,
  Check,
} from 'lucide-react';
import { FairPackAPI } from '../../services/api';
import type { ComplianceStatus } from '../../types/compliance';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  specimen: any;
  onValidationComplete?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; label: string; icon: React.ReactNode }
> = {
  COMPLIANT: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/30',
    label: 'COMPLIANT',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  },
  WARNING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-800',
    border: 'border-amber-500/30',
    label: 'WARNING',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
  },
  VIOLATION: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-700',
    border: 'border-rose-500/30',
    label: 'VIOLATION',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
  },
};

const MANDATE_NAMES: Record<string, { title: string; subtitle: string }> = {
  mfg_address: { title: 'Manufacturer Address', subtitle: 'Rule 6(1)(a) & Rule 10' },
  generic_name: { title: 'Generic or Common Name', subtitle: 'Rule 6(1)(b)' },
  net_quantity: { title: 'Net Quantity (SI Units)', subtitle: 'Rule 6(1)(c) & Rule 12' },
  mrp: { title: 'Maximum Retail Price', subtitle: 'Rule 6(1)(d)' },
  mfg_date: { title: 'Date of Manufacture', subtitle: 'Rule 6(1)(e)' },
  usp: { title: 'Unit Sale Price (USP)', subtitle: 'Rule 6(1)(s)' },
  consumer_care: { title: 'Consumer Care Contact', subtitle: 'Rule 6(1)(h)' },
  country_of_origin: { title: 'Country of Origin', subtitle: 'Rule 6(1)(g)' },
  best_before: { title: 'Best Before / Expiry', subtitle: 'Rule 6(1)(f)' },
  language: { title: 'Language Compliance', subtitle: 'Rule 9(4)' },
  dual_mrp: { title: 'Dual MRP Prohibition', subtitle: 'Rule 18(2A)' },
};

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  specimen,
  onValidationComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [humanVerdicts, setHumanVerdicts] = useState<Record<string, ComplianceStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && specimen) {
      runValidation();
    }
    return () => {
      setValidationData(null);
      setHumanVerdicts({});
      setError(null);
      setSubmitted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, specimen?.id]);

  const runValidation = async () => {
    if (!specimen?.id) return;
    setLoading(true);
    setError(null);
    try {
      const existing = await FairPackAPI.getValidationStatus(specimen.id);
      if (existing && existing.referee_results) {
        setValidationData(existing);
        if (existing.human_verdicts) {
          setHumanVerdicts(existing.human_verdicts);
          setSubmitted(true);
        }
      } else {
        const result = await FairPackAPI.runValidation(specimen.id);
        setValidationData(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run validation. Make sure the backend is connected.');
    } finally {
      setLoading(false);
    }
  };

  const toggleVerdict = (mandateId: string, status: ComplianceStatus) => {
    if (submitted) return;
    setHumanVerdicts((prev) => ({
      ...prev,
      [mandateId]: prev[mandateId] === status ? (undefined as any) : status,
    }));
  };

  const handleMarkAllEngine = () => {
    if (submitted || !validationData?.engine_results) return;
    const prefilled: Record<string, ComplianceStatus> = {};
    for (const r of validationData.engine_results) {
      prefilled[r.mandate_id] = r.status === 'COMPLIANT' ? 'COMPLIANT' : 'VIOLATION';
    }
    setHumanVerdicts(prefilled);
  };

  const handleSubmitVerdicts = async () => {
    if (!specimen?.id || Object.keys(humanVerdicts).length === 0) return;
    setSubmitting(true);
    try {
      const result = await FairPackAPI.submitHumanVerdicts(specimen.id, humanVerdicts);
      setValidationData(result);
      setSubmitted(true);
      onValidationComplete?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ground truth verdicts');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const engineResults = validationData?.engine_results || [];
  const refereeResults = validationData?.referee_results || [];
  const metrics = validationData?.accuracy_metrics;

  const mandateIds = [
    ...new Set([
      ...engineResults.map((r: any) => r.mandate_id),
      ...refereeResults.map((r: any) => r.mandate_id),
    ]),
  ];

  const getRefereeForMandate = (id: string) =>
    refereeResults.find((r: any) => r.mandate_id === id);

  const getEngineForMandate = (id: string) =>
    engineResults.find((r: any) => r.mandate_id === id);

  const totalVerifiedCount = mandateIds.filter((id) => humanVerdicts[id]).length;
  const allMandatesVerified = mandateIds.length > 0 && totalVerifiedCount === mandateIds.length;

  const StatusPill = ({ status }: { status?: string }) => {
    if (!status) return <span className="text-xs text-zinc-400 font-mono">—</span>;
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.COMPLIANT;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {cfg.icon}
        <span>{cfg.label}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF9F5] rounded-[32px] w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border-2 border-black">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-white border-b-2 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-black text-[#D5FF3F] flex items-center justify-center font-black shadow-sm shrink-0">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">
                  3-Column Accuracy Ground Truth Benchmarking
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#D5FF3F] border border-black text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                  Audit Referee
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <span className="font-bold text-zinc-900">
                  {specimen?.product_name || specimen?.report?.product_name || 'Commodity Specimen'}
                </span>
                <span>•</span>
                <span className="font-mono text-zinc-500">
                  {specimen?.id || specimen?.audit_id || ''}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer border border-zinc-200"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading View */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border-2 border-black/10">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-black text-zinc-900">Running Independent LLM Referee...</p>
              <p className="text-xs text-zinc-500 text-center max-w-sm">
                Google Gemini is independently inspecting each mandate without looking at our
                engine&apos;s verdicts (Zero Information Leakage).
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-sm text-rose-800 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">Validation Pipeline Warning</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
              <button
                onClick={runValidation}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Post-Verification Accuracy Scoreboard */}
          {submitted && metrics && (
            <div className="bg-white rounded-3xl p-4 border-2 border-black shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Computed Specimen Accuracy Matrix</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                  Verified Ground Truth Saved
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Overall Accuracy', value: metrics.accuracy, color: 'text-indigo-600', bg: 'bg-indigo-50/60', border: 'border-indigo-200' },
                  { label: 'Precision', value: metrics.precision, color: 'text-emerald-600', bg: 'bg-emerald-50/60', border: 'border-emerald-200' },
                  { label: 'Recall', value: metrics.recall, color: 'text-amber-600', bg: 'bg-amber-50/60', border: 'border-amber-200' },
                  { label: 'F1-Score', value: metrics.f1_score, color: 'text-rose-600', bg: 'bg-rose-50/60', border: 'border-rose-200' },
                ].map((m) => (
                  <div key={m.label} className={`${m.bg} rounded-2xl p-3 border ${m.border} text-center`}>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                      {m.label}
                    </span>
                    <p className={`text-2xl font-black ${m.color} font-mono mt-0.5`}>
                      {typeof m.value === 'number' ? `${(m.value * 100).toFixed(1)}%` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3-Column Structured Grid Table */}
          {validationData && !loading && (
            <div className="bg-white rounded-3xl border-2 border-black shadow-sm overflow-hidden flex flex-col">
              {/* Quick Actions Header Bar */}
              <div className="p-3 sm:px-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D5FF3F] ring-2 ring-black" />
                  <span className="font-bold text-zinc-700">
                    Review each statutory clause across all 3 referee columns:
                  </span>
                </div>
                {!submitted && (
                  <button
                    onClick={handleMarkAllEngine}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl transition-colors cursor-pointer"
                  >
                    Auto-Fill Column 3 with Engine Verdicts
                  </button>
                )}
              </div>

              {/* Table Column Header (Fixed Symmetric Widths) */}
              <div className="grid grid-cols-12 gap-2 sm:gap-3 p-3 sm:px-4 bg-zinc-100/90 border-b-2 border-black text-[11px] font-black uppercase tracking-wider text-zinc-700">
                <div className="col-span-12 sm:col-span-3">Statutory Mandate</div>
                <div className="col-span-12 sm:col-span-3 flex items-center gap-1.5 text-zinc-900">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Column 1: Our Engine</span>
                </div>
                <div className="col-span-12 sm:col-span-3 flex items-center gap-1.5 text-zinc-900">
                  <Bot className="w-3.5 h-3.5 text-violet-600" />
                  <span>Column 2: LLM Referee</span>
                </div>
                <div className="col-span-12 sm:col-span-3 flex items-center gap-1.5 text-zinc-900">
                  <User className="w-3.5 h-3.5 text-black" />
                  <span>Column 3: Ground Truth</span>
                </div>
              </div>

              {/* Mandate Rows */}
              <div className="divide-y divide-zinc-200">
                {mandateIds.map((mandateId, index) => {
                  const engine = getEngineForMandate(mandateId);
                  const referee = getRefereeForMandate(mandateId);
                  const humanVerdict = humanVerdicts[mandateId];
                  const info = MANDATE_NAMES[mandateId] || {
                    title: engine?.name || mandateId,
                    subtitle: engine?.rule || 'LMPC Rule',
                  };

                  // Disagreement highlight
                  const agree = engine?.status === referee?.status;

                  return (
                    <div
                      key={mandateId}
                      className={`grid grid-cols-12 gap-2 sm:gap-3 p-3 sm:px-4 items-center transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'
                      } ${!agree ? 'ring-1 ring-inset ring-amber-300 bg-amber-50/20' : ''}`}
                    >
                      {/* Mandate Column */}
                      <div className="col-span-12 sm:col-span-3 space-y-0.5">
                        <p className="text-xs font-black text-zinc-900 leading-snug">
                          {info.title}
                        </p>
                        <p className="text-[10px] font-mono font-semibold text-zinc-500">
                          {info.subtitle}
                        </p>
                      </div>

                      {/* Column 1: Our Engine */}
                      <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <StatusPill status={engine?.status} />
                        <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2">
                          {engine?.reason || 'Verified under deterministic engine.'}
                        </p>
                      </div>

                      {/* Column 2: LLM Referee */}
                      <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={referee?.status} />
                          {!agree && (
                            <span
                              className="text-[9px] font-mono font-black text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded"
                              title="Engine and Referee disagree"
                            >
                              Mismatch
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2">
                          {referee?.reasoning || referee?.reason || 'Evaluated independently.'}
                        </p>
                      </div>

                      {/* Column 3: Ground Truth (Human Inspector Verdict) */}
                      <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                        {submitted ? (
                          <div className="w-full">
                            <StatusPill status={humanVerdict} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={() => toggleVerdict(mandateId, 'COMPLIANT')}
                              className={`py-1.5 px-2 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                humanVerdict === 'COMPLIANT'
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm scale-[1.02]'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border-zinc-300'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Pass</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleVerdict(mandateId, 'VIOLATION')}
                              className={`py-1.5 px-2 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                humanVerdict === 'VIOLATION'
                                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm scale-[1.02]'
                                  : 'bg-white hover:bg-rose-50 text-rose-700 border-zinc-300'
                              }`}
                            >
                              <X className="w-3 h-3 stroke-[3]" />
                              <span>Fail</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 sm:p-5 bg-white border-t-2 border-black flex items-center justify-between shrink-0 gap-3 flex-wrap">
          {validationData && !loading && !submitted ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    allMandatesVerified ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <p className="text-xs font-bold text-zinc-700">
                  <span className="font-black text-zinc-950 font-mono text-sm">
                    {totalVerifiedCount}
                  </span>{' '}
                  of {mandateIds.length} mandates marked
                  {!allMandatesVerified && (
                    <span className="text-zinc-400 font-normal"> (mark all to submit)</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl border border-zinc-300 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitVerdicts}
                  disabled={!allMandatesVerified || submitting}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    allMandatesVerified && !submitting
                      ? 'bg-black text-[#D5FF3F] hover:bg-zinc-800 active:scale-95 shadow-md'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D5FF3F]" />
                  ) : (
                    <Send className="w-4 h-4 text-[#D5FF3F]" />
                  )}
                  <span>Submit Ground Truth Verification</span>
                </button>
              </div>
            </>
          ) : submitted ? (
            <>
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verification record permanently logged and metrics benchmarked.</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-black text-[#D5FF3F] font-black text-xs hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
              >
                Close Window
              </button>
            </>
          ) : (
            <div className="ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-600 font-bold text-xs"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
