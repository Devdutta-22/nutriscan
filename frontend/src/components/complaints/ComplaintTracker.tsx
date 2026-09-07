import React, { useState } from 'react';
import {
  Search, CheckCircle2, Clock, AlertTriangle, XCircle,
  Building2, Phone, ExternalLink, Loader2, ChevronRight
} from 'lucide-react';

const API_BASE = '/api';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'done':    <CheckCircle2 className="w-4 h-4 text-green-500" />,
  'pending': <Clock className="w-4 h-4 text-zinc-300" />,
  'active':  <AlertTriangle className="w-4 h-4 text-yellow-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  'Submitted':    'bg-blue-100 text-blue-700 border-blue-200',
  'Under Review': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Forwarded':    'bg-purple-100 text-purple-700 border-purple-200',
  'Action Taken': 'bg-orange-100 text-orange-700 border-orange-200',
  'Resolved':     'bg-green-100 text-green-700 border-green-200',
  'Closed':       'bg-zinc-100 text-zinc-600 border-zinc-200',
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
        setError(`No complaint found with reference number "${ref}". Please check and try again.`);
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0E1118] px-5 pt-5 pb-4 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[#D5FF3F] text-xs font-black uppercase tracking-widest mb-1">Track Complaint</p>
            <h2 className="text-white font-black text-base">Check Complaint Status</h2>
            <p className="text-slate-400 text-xs mt-0.5">Enter your reference number below</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-xl font-bold leading-none">
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-4 border-b border-zinc-100 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              placeholder="e.g., NSC-AB12CD34"
              className="flex-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D5FF3F]/40 focus:border-zinc-400 uppercase tracking-widest"
            />
            <button
              onClick={handleTrack}
              disabled={!refInput.trim() || isLoading}
              className="bg-[#0E1118] text-[#D5FF3F] px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5 disabled:opacity-40 hover:bg-zinc-800 transition-colors active:scale-95"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!result && !isLoading && !error && (
            <div className="text-center py-8 text-zinc-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">Enter your reference number</p>
              <p className="text-xs mt-1">You received this when you submitted your complaint</p>
            </div>
          )}

          {result && (
            <>
              {/* Status Header */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Reference</p>
                    <p className="font-black text-lg text-zinc-900 font-mono tracking-widest">{result.ref_number}</p>
                    <p className="text-sm font-bold text-zinc-700 mt-1">{result.product_name}</p>
                    <p className="text-xs text-zinc-500">{result.consumer_state}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${STATUS_COLORS[result.status] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                    {result.status}
                  </span>
                </div>
              </div>

              {/* Routing info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-blue-800">Assigned Department</p>
                  <p className="text-xs font-semibold text-blue-700 mt-0.5">{result.routed_to_dept}</p>
                  {result.routed_to_phone && (
                    <p className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" /> {result.routed_to_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Officer notes */}
              {result.officer_notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider mb-1">Officer Notes</p>
                  <p className="text-xs text-yellow-800">{result.officer_notes}</p>
                </div>
              )}

              {/* Action taken */}
              {result.action_taken && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-1">Action Taken</p>
                  <p className="text-xs text-orange-800">{result.action_taken}</p>
                </div>
              )}

              {/* Timeline */}
              {result.timeline && result.timeline.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-zinc-700 uppercase tracking-wider">Timeline</p>
                  <div className="space-y-0">
                    {result.timeline.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="shrink-0 mt-1">{STATUS_ICONS[step.status] ?? STATUS_ICONS['pending']}</div>
                          {i < result.timeline.length - 1 && (
                            <div className={`w-px flex-1 my-1 min-h-[16px] ${step.status === 'done' ? 'bg-green-200' : 'bg-zinc-200'}`} />
                          )}
                        </div>
                        <div className={`pb-3 flex-1 ${step.status === 'pending' ? 'opacity-50' : ''}`}>
                          <p className={`text-xs font-bold ${step.status === 'done' ? 'text-zinc-800' : 'text-zinc-500'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{step.desc}</p>
                          {step.timestamp && (
                            <p className="text-[9px] text-zinc-400 mt-0.5 font-mono">
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

              {/* INGRAM status */}
              {result.ingram_forwarded && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-black text-purple-800">Forwarded to INGRAM ✓</p>
                      <p className="text-[10px] text-purple-600">National Consumer Helpline Portal</p>
                    </div>
                  </div>
                  <a
                    href="https://consumerhelpline.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:text-purple-900"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* NCH Helpline */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="text-xs font-black text-orange-800">National Consumer Helpline</p>
                  <p className="text-sm font-black text-zinc-900">1800-11-4000</p>
                  <p className="text-[10px] text-zinc-500">Toll-free · Mon–Sat 9 AM – 5 PM</p>
                </div>
              </div>

              {/* Dates */}
              <div className="text-[10px] text-zinc-400 space-y-0.5 pb-2">
                <p>Filed: {result.created_at ? new Date(result.created_at).toLocaleString('en-IN') : '—'}</p>
                <p>Last Updated: {result.updated_at ? new Date(result.updated_at).toLocaleString('en-IN') : '—'}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full text-zinc-500 font-semibold text-sm py-2 hover:text-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
