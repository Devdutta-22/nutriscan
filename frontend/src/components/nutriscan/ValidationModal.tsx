import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, XCircle, AlertTriangle, Bot, User, Cpu, Send, ShieldCheck } from 'lucide-react';
import { FairPackAPI } from '../../services/api';
import type { ComplianceStatus } from '../../types/compliance';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  specimen: any;
  onValidationComplete?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  COMPLIANT: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  WARNING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
  },
  VIOLATION: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
  },
};

const MANDATE_NAMES: Record<string, string> = {
  mfg_address: 'Manufacturer Address',
  generic_name: 'Generic Name',
  net_quantity: 'Net Quantity',
  mrp: 'MRP',
  mfg_date: 'Mfg Date',
  usp: 'Unit Sale Price',
  consumer_care: 'Consumer Care',
  country_of_origin: 'Country of Origin',
  best_before: 'Best Before / Expiry',
  language: 'Language Compliance',
  dual_mrp: 'Dual MRP Detection',
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
      // First check if already validated
      const existing = await FairPackAPI.getValidationStatus(specimen.id);
      if (existing && existing.referee_results) {
        setValidationData(existing);
        if (existing.human_verdicts) {
          setHumanVerdicts(existing.human_verdicts);
          setSubmitted(true);
        }
      } else {
        // Run fresh validation
        const result = await FairPackAPI.runValidation(specimen.id);
        setValidationData(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run validation. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleVerdict = (mandateId: string, status: ComplianceStatus) => {
    if (submitted) return;
    setHumanVerdicts((prev) => ({
      ...prev,
      [mandateId]: prev[mandateId] === status ? undefined! : status,
    }));
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
      setError(err.message || 'Failed to submit verdicts');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const engineResults = validationData?.engine_results || [];
  const refereeResults = validationData?.referee_results || [];
  const metrics = validationData?.accuracy_metrics;

  // Build merged mandate list
  const mandateIds = [...new Set([
    ...engineResults.map((r: any) => r.mandate_id),
    ...refereeResults.map((r: any) => r.mandate_id),
  ])];

  const getRefereeForMandate = (id: string) =>
    refereeResults.find((r: any) => r.mandate_id === id);

  const getEngineForMandate = (id: string) =>
    engineResults.find((r: any) => r.mandate_id === id);

  const allMandatesVerified = mandateIds.length > 0 && mandateIds.every((id) => humanVerdicts[id]);

  const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return <span className="text-xs text-zinc-400">—</span>;
    const s = STATUS_COLORS[status] || STATUS_COLORS.COMPLIANT;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text} border ${s.border}`}>
        {s.icon}
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900">Accuracy Validation</h2>
              <p className="text-xs text-zinc-500">
                {specimen?.product_name || specimen?.report?.product_name || 'Unknown Product'} — 3-Column Ground Truth Comparison
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-zinc-600">Running Independent LLM Referee...</p>
              <p className="text-xs text-zinc-400">Gemini 2.0 Flash is evaluating this label independently</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              <p className="font-bold">Validation Error</p>
              <p className="text-xs mt-1">{error}</p>
              <button
                onClick={runValidation}
                className="mt-2 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Accuracy Metrics Banner (shown after human verification) */}
          {submitted && metrics && (
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'Accuracy', value: metrics.accuracy, color: 'text-indigo-600' },
                { label: 'Precision', value: metrics.precision, color: 'text-emerald-600' },
                { label: 'Recall', value: metrics.recall, color: 'text-amber-600' },
                { label: 'F1-Score', value: metrics.f1_score, color: 'text-rose-600' },
              ].map((m) => (
                <div key={m.label} className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{m.label}</span>
                  <p className={`text-xl font-black ${m.color} font-mono mt-0.5`}>
                    {typeof m.value === 'number' ? `${(m.value * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 3-Column Comparison Table */}
          {validationData && !loading && (
            <div className="space-y-2">
              {/* Column Headers */}
              <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-2 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100 sticky top-0 z-10">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Mandate</div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> Our Engine
                </div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3 h-3" /> LLM Referee
                </div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Your Verdict
                </div>
              </div>

              {/* Mandate Rows */}
              {mandateIds.map((mandateId) => {
                const engine = getEngineForMandate(mandateId);
                const referee = getRefereeForMandate(mandateId);
                const humanVerdict = humanVerdicts[mandateId];
                const mandateName = engine?.name || MANDATE_NAMES[mandateId] || mandateId;

                // Determine if engine and referee agree
                const agree = engine?.status === referee?.status;

                return (
                  <div
                    key={mandateId}
                    className={`grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-2 px-3 py-3 rounded-xl border transition-all ${
                      agree ? 'border-zinc-100 bg-white' : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    {/* Mandate Name */}
                    <div>
                      <p className="text-xs font-bold text-zinc-800">{mandateName}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{engine?.rule || ''}</p>
                    </div>

                    {/* Column 1: Our Engine */}
                    <div className="space-y-1">
                      <StatusBadge status={engine?.status} />
                      <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">
                        {engine?.reason || ''}
                      </p>
                    </div>

                    {/* Column 2: LLM Referee */}
                    <div className="space-y-1">
                      <StatusBadge status={referee?.status} />
                      <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">
                        {referee?.reasoning || referee?.reason || ''}
                      </p>
                    </div>

                    {/* Column 3: Human Verdict */}
                    <div className="flex flex-col gap-1">
                      {submitted ? (
                        <StatusBadge status={humanVerdict} />
                      ) : (
                        <>
                          <button
                            onClick={() => toggleVerdict(mandateId, 'COMPLIANT')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              humanVerdict === 'COMPLIANT'
                                ? 'bg-emerald-500 text-white border-emerald-600 scale-105'
                                : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            ✅ Compliant
                          </button>
                          <button
                            onClick={() => toggleVerdict(mandateId, 'VIOLATION')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              humanVerdict === 'VIOLATION'
                                ? 'bg-rose-500 text-white border-rose-600 scale-105'
                                : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                            }`}
                          >
                            ❌ Violation
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {validationData && !loading && !submitted && (
          <div className="p-4 border-t border-zinc-100 flex items-center justify-between shrink-0">
            <p className="text-xs text-zinc-500">
              {Object.keys(humanVerdicts).filter(k => humanVerdicts[k]).length} / {mandateIds.length} mandates verified
            </p>
            <button
              onClick={handleSubmitVerdicts}
              disabled={!allMandatesVerified || submitting}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all ${
                allMandatesVerified && !submitting
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit Human Verification
            </button>
          </div>
        )}

        {/* Submitted success */}
        {submitted && (
          <div className="p-4 border-t border-emerald-100 bg-emerald-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-700">
                Ground truth verification submitted successfully
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
