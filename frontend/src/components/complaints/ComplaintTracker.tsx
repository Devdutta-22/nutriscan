import React, { useState } from 'react';
import {
  Search, CheckCircle2, Clock, AlertTriangle, XCircle,
  Building2, Phone, ExternalLink, Loader2, Shield
} from 'lucide-react';

const API_BASE = '/api';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'done':    <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  'pending': <Clock className="w-4 h-4 text-slate-600" />,
  'active':  <AlertTriangle className="w-4 h-4 text-amber-400" />,
};

const STATUS_STYLES: Record<string, string> = {
  'Submitted':    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Under Review': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Forwarded':    'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'Action Taken': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Resolved':     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Closed':       'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

interface ComplaintTrackerProps {
  onClose: () => void;
}

export const ComplaintTracker: React.FC<ComplaintTrackerProps> = ({ onClose }) => {
  const [refInput, setRefInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    const ref = refInput.trim().toUpperCase();
    if (!ref) return;
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/complaints/track/${ref}`);
      if (res.status === 404) {
        setError(`No complaint found with reference "${ref}". Please check and try again.`);
        return;
      }
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111827] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] border border-slate-800">

        {/* Header */}
        <div className="bg-[#0B0F17] px-5 pt-5 pb-4 flex items-start justify-between shrink-0 border-b border-slate-800">
          <div>
            <p className="text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
              Track Complaint
            </p>
            <h2 className="text-white font-black text-base">Check Complaint Status</h2>
            <p className="text-slate-400 text-xs font-mono mt-0.5">Enter your reference number below</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              placeholder="e.g., NSC-AB12CD34"
              className="flex-1 bg-[#161F30] border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 uppercase tracking-widest transition-all"
            />
            <button
              onClick={handleTrack}
              disabled={!refInput.trim() || isLoading}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5 disabled:opacity-40 hover:from-cyan-500 hover:to-cyan-400 transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 mt-2">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!result && !isLoading && !error && (
            <div className="text-center py-10">
              <Search className="w-8 h-8 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-mono font-semibold text-slate-400">Enter your reference number</p>
              <p className="text-xs font-mono text-slate-600 mt-1">You received this when you submitted your complaint</p>
            </div>
          )}

          {result && (
            <>
              {/* Status Header Card */}
              <div className="bg-[#161F30] border border-slate-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider mb-1">Reference</p>
                    <p className="font-black text-lg text-white font-mono tracking-widest">{result.ref_number}</p>
                    <p className="text-sm font-bold text-slate-200 mt-1">{result.product_name}</p>
                    <p className="text-xs font-mono text-slate-400">{result.consumer_state}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black font-mono border shrink-0 ${STATUS_STYLES[result.status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                    {result.status}
                  </span>
                </div>
              </div>

              {/* Routing info */}
              <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-3 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-black text-indigo-300">Assigned Department</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">{result.routed_to_dept}</p>
                  {result.routed_to_phone && (
                    <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" /> {result.routed_to_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Officer notes */}
              {result.officer_notes && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
                  <p className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider mb-1">Officer Notes</p>
                  <p className="text-xs font-mono text-slate-300">{result.officer_notes}</p>
                </div>
              )}

              {/* Action taken */}
              {result.action_taken && (
                <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl p-3">
                  <p className="text-[10px] font-mono font-black text-orange-400 uppercase tracking-wider mb-1">Action Taken</p>
                  <p className="text-xs font-mono text-slate-300">{result.action_taken}</p>
                </div>
              )}

              {/* Timeline */}
              {result.timeline && result.timeline.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono font-black text-slate-400 uppercase tracking-wider">Timeline</p>
                  <div className="space-y-0">
                    {result.timeline.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="shrink-0 mt-1">{STATUS_ICONS[step.status] ?? STATUS_ICONS['pending']}</div>
                          {i < result.timeline.length - 1 && (
                            <div className={`w-px flex-1 my-1 min-h-[16px] ${step.status === 'done' ? 'bg-emerald-500/30' : 'bg-slate-800'}`} />
                          )}
                        </div>
                        <div className={`pb-3 flex-1 ${step.status === 'pending' ? 'opacity-40' : ''}`}>
                          <p className={`text-xs font-bold ${step.status === 'done' ? 'text-slate-200' : 'text-slate-500'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 leading-relaxed mt-0.5">{step.desc}</p>
                          {step.timestamp && (
                            <p className="text-[9px] font-mono text-slate-600 mt-0.5">
                              {new Date(step.timestamp).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INGRAM forwarded badge */}
              {result.ingram_forwarded && (
                <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="text-xs font-mono font-black text-indigo-300">Forwarded to INGRAM ✓</p>
                      <p className="text-[10px] font-mono text-slate-400">National Consumer Helpline Portal</p>
                    </div>
                  </div>
                  <a
                    href="https://consumerhelpline.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* NCH Helpline */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-center gap-3">
                <Phone className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-mono font-black text-amber-300">National Consumer Helpline</p>
                  <p className="text-sm font-black text-white font-mono">1800-11-4000</p>
                  <p className="text-[10px] font-mono text-slate-500">Toll-free · Mon–Sat 9 AM – 5 PM</p>
                </div>
              </div>

              {/* Dates */}
              <div className="text-[10px] font-mono text-slate-600 space-y-0.5 pb-2">
                <p>Filed: {result.created_at ? new Date(result.created_at).toLocaleString('en-IN') : '—'}</p>
                <p>Last Updated: {result.updated_at ? new Date(result.updated_at).toLocaleString('en-IN') : '—'}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 py-3 shrink-0 bg-[#0B0F17]">
          <button
            onClick={onClose}
            className="w-full text-slate-500 font-mono font-semibold text-sm py-2 hover:text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
