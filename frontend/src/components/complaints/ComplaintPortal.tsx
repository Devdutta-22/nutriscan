import React, { useState } from 'react';
import {
  X, AlertTriangle, Flag, MapPin, User, Phone, Mail,
  CheckCircle2, Loader2, ExternalLink, ChevronRight,
  ChevronLeft, Shield, Building2, ClipboardList, Info, Zap
} from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { PortalRoutingPreview } from './PortalRoutingPreview';

interface ComplaintPortalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AuditReport | null;
}

type Step = 'violations' | 'consumer' | 'review' | 'success';

const API_BASE = '/api';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Other / Central',
];

export const ComplaintPortal: React.FC<ComplaintPortalProps> = ({ isOpen, onClose, report }) => {
  const [step, setStep] = useState<Step>('violations');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [selectedViolations, setSelectedViolations] = useState<string[]>(
    report?.violations?.map((v) => v.mandate_id) ?? []
  );
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [description, setDescription] = useState('');

  const [consumerName, setConsumerName] = useState('');
  const [consumerEmail, setConsumerEmail] = useState('');
  const [consumerPhone, setConsumerPhone] = useState('');
  const [consumerState, setConsumerState] = useState('');
  const [consumerDistrict, setConsumerDistrict] = useState('');

  if (!isOpen || !report) return null;

  const violationsFromReport = report.violations ?? [];
  const warningsFromReport = report.warnings ?? [];
  const allIssues = [...violationsFromReport, ...warningsFromReport];

  const toggleViolation = (mandateId: string) => {
    setSelectedViolations((prev) =>
      prev.includes(mandateId) ? prev.filter((v) => v !== mandateId) : [...prev, mandateId]
    );
  };

  const selectedViolationObjs = allIssues.filter((v) => selectedViolations.includes(v.mandate_id));

  const canProceedStep1 = selectedViolations.length > 0 && purchaseLocation.trim().length >= 3 && description.trim().length >= 10;
  const canProceedStep2 = consumerName.trim().length >= 2 && consumerState.length > 0;

  const handleSubmit = async () => {
    if (!canProceedStep1 || !canProceedStep2) return;
    setIsSubmitting(true);
    try {
      const payload = {
        product_name: report.product_name,
        brand_name: report.label_data?.generic_name || report.product_name,
        barcode_value: report.barcode_data?.value || null,
        purchase_location: purchaseLocation,
        purchase_date: purchaseDate || null,
        audit_id: report.audit_id,
        violations: selectedViolations,
        violation_rules: selectedViolationObjs.map((v) => v.rule),
        description,
        consumer_name: consumerName,
        consumer_email: consumerEmail || null,
        consumer_phone: consumerPhone || null,
        consumer_state: consumerState,
        consumer_district: consumerDistrict || null,
      };

      const res = await fetch(`${API_BASE}/complaints/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to submit complaint');
      }

      const data = await res.json();
      setResult(data);
      setStep('success');
    } catch (e: any) {
      alert(`Submission failed: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels: Record<Step, string> = {
    violations: 'Violations',
    consumer: 'Your Details',
    review: 'Review',
    success: 'Submitted!',
  };
  const stepOrder: Step[] = ['violations', 'consumer', 'review', 'success'];
  const stepIndex = stepOrder.indexOf(step);

  const inputClass = "w-full bg-[#161F30] border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all";
  const selectClass = "w-full bg-[#161F30] border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all";
  const labelClass = "block text-xs font-mono font-bold text-slate-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111827] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] border border-slate-800">

        {/* ── Header ── */}
        <div className="bg-[#0B0F17] px-5 pt-5 pb-4 flex items-start justify-between shrink-0 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-rose-500" />
              <span className="text-rose-400 text-[10px] font-mono font-bold uppercase tracking-widest">
                File Complaint — Legal Metrology
              </span>
            </div>
            <h2 className="text-white font-black text-base leading-tight">
              Ministry of Consumer Affairs
            </h2>
            <p className="text-slate-400 text-xs font-mono mt-0.5">
              FairPack — Statutory Consumer Grievance Portal
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step Progress Bar ── */}
        {step !== 'success' && (
          <div className="bg-[#0B0F17] px-5 pb-4 shrink-0">
            <div className="flex items-center gap-2">
              {(['violations', 'consumer', 'review'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 ${stepIndex >= i ? 'text-slate-100' : 'text-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                      stepIndex > i
                        ? 'bg-emerald-500 text-white'
                        : stepIndex === i
                        ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {stepIndex > i ? '✓' : i + 1}
                    </div>
                    <span className="text-[10px] font-mono hidden sm:block">{stepLabels[s]}</span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-px transition-colors ${stepIndex > i ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── Product Context Bar ── */}
        {step !== 'success' && (
          <div className="bg-[#161F30] border-b border-slate-800 px-5 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate font-mono">{report.product_name}</p>
              <p className="text-[10px] font-mono text-slate-500">
                Audit: {report.audit_id} · Score: {report.compliance_score}%
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase tracking-wide shrink-0 ${
              (report.violations?.length ?? 0) > 0
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {report.violations?.length ?? 0} Violations
            </span>
          </div>
        )}

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── STEP 1: Violations ── */}
          {step === 'violations' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-sm text-slate-100 mb-0.5">Select Violations to Report</h3>
                <p className="text-xs font-mono text-slate-500">
                  Auto-detected from your audit. Tap to select / deselect.
                </p>
              </div>

              <div className="space-y-2">
                {allIssues.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-mono text-center">
                    ✓ No violations detected. You can still file a complaint with a description below.
                  </div>
                ) : (
                  allIssues.map((item) => {
                    const isSelected = selectedViolations.includes(item.mandate_id);
                    const isViolation = item.status === 'VIOLATION';
                    return (
                      <button
                        key={item.mandate_id}
                        onClick={() => toggleViolation(item.mandate_id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? isViolation
                              ? 'border-rose-500/60 bg-rose-500/10'
                              : 'border-amber-500/60 bg-amber-500/10'
                            : 'border-slate-700 bg-[#161F30] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-4 h-4 rounded shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? isViolation ? 'bg-rose-500 border-rose-500' : 'bg-amber-500 border-amber-500'
                              : 'border-slate-600 bg-transparent'
                          }`}>
                            {isSelected && <span className="text-white text-[9px] font-black">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-100">{item.name}</span>
                              <span className={`px-1.5 py-0 rounded text-[9px] font-black font-mono ${
                                isViolation
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {isViolation ? 'VIOLATION' : 'WARNING'}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">{item.rule}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{item.reason}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Purchase Details */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h3 className="font-black text-sm text-slate-100">Purchase Details</h3>
                <div>
                  <label className={labelClass}>
                    Purchase Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={purchaseLocation}
                    onChange={(e) => setPurchaseLocation(e.target.value)}
                    placeholder="e.g., DMart, Sector 18, Noida, UP"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Purchase Date (optional)</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Describe the Violation <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what's wrong with the product packaging..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className="text-[10px] font-mono text-slate-500 mt-1">{description.length}/2000 chars (min 10)</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Consumer Info ── */}
          {step === 'consumer' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-sm text-slate-100 mb-0.5">Your Information</h3>
                <p className="text-xs font-mono text-slate-500">
                  Required for the Legal Metrology department to contact you. Email/phone are kept confidential.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>
                    <User className="w-3 h-3 inline mr-1" />
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={consumerName}
                    onChange={(e) => setConsumerName(e.target.value)}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email Address (optional)
                  </label>
                  <input
                    type="email"
                    value={consumerEmail}
                    onChange={(e) => setConsumerEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <Phone className="w-3 h-3 inline mr-1" />
                    Mobile Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={consumerPhone}
                    onChange={(e) => setConsumerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <MapPin className="w-3 h-3 inline mr-1" />
                    State / UT <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={consumerState}
                    onChange={(e) => setConsumerState(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select your state / UT</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>District (optional)</label>
                  <input
                    type="text"
                    value={consumerDistrict}
                    onChange={(e) => setConsumerDistrict(e.target.value)}
                    placeholder="Your district"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Live portal routing preview */}
              <PortalRoutingPreview state={consumerState} />

              {/* Privacy notice */}
              <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-indigo-300">Privacy Notice</p>
                  <p className="text-[10px] font-mono text-indigo-400/70 mt-0.5 leading-relaxed">
                    Your personal details are shared only with the competent Legal Metrology authority
                    under the Legal Metrology Act, 2009. They will not be published publicly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-sm text-slate-100 mb-0.5">Review Your Complaint</h3>
                <p className="text-xs font-mono text-slate-500">Please verify all details before submitting.</p>
              </div>

              {/* Product */}
              <div className="bg-[#161F30] border border-slate-800 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">Product</p>
                <p className="text-sm font-black text-slate-100">{report.product_name}</p>
                <p className="text-xs font-mono text-slate-500">
                  Audit: {report.audit_id} · Compliance Score: {report.compliance_score}%
                </p>
              </div>

              {/* Selected Violations */}
              <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-mono font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Selected Violations ({selectedViolations.length})
                </p>
                {selectedViolationObjs.map((v) => (
                  <div key={v.mandate_id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-xs font-mono text-slate-300">{v.name} ({v.rule})</span>
                  </div>
                ))}
              </div>

              {/* Purchase details */}
              <div className="bg-[#161F30] border border-slate-800 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">Purchase Details</p>
                <p className="text-xs font-mono text-slate-300">
                  <span className="text-slate-500">Location:</span> {purchaseLocation}
                </p>
                {purchaseDate && (
                  <p className="text-xs font-mono text-slate-300">
                    <span className="text-slate-500">Date:</span> {purchaseDate}
                  </p>
                )}
                <p className="text-xs font-mono text-slate-300">
                  <span className="text-slate-500">Description:</span> {description}
                </p>
              </div>

              {/* Consumer */}
              <div className="bg-[#161F30] border border-slate-800 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">Consumer Details</p>
                <p className="text-xs font-mono font-bold text-slate-100">{consumerName}</p>
                {consumerEmail && <p className="text-xs font-mono text-slate-400">{consumerEmail}</p>}
                {consumerPhone && <p className="text-xs font-mono text-slate-400">{consumerPhone}</p>}
                <p className="text-xs font-mono text-slate-400">
                  {consumerState}{consumerDistrict ? `, ${consumerDistrict}` : ''}
                </p>
              </div>

              {/* Full routing preview */}
              <PortalRoutingPreview state={consumerState} />
            </div>
          )}

          {/* ── STEP: Success ── */}
          {step === 'success' && result && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-100">Complaint Registered!</h3>
                <p className="text-sm font-mono text-slate-400 mt-1">Your reference number:</p>
                <div className="mt-3 inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xl px-6 py-3 rounded-2xl tracking-widest font-mono shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  {result.ref_number}
                </div>
                <p className="text-xs font-mono text-slate-500 mt-2">Save this number to track your complaint</p>
              </div>

              {/* Routing info */}
              <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs font-mono font-black text-indigo-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Routed To
                </p>
                <p className="text-sm font-bold text-slate-100">{result.routed_to?.department}</p>
                <p className="text-xs font-mono text-slate-400">📧 {result.routed_to?.email}</p>
                <p className="text-xs font-mono text-slate-400">📞 {result.routed_to?.phone}</p>
              </div>

              {/* INGRAM info */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs font-mono font-black text-amber-300">National Consumer Helpline — INGRAM</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📞</span>
                  <div>
                    <p className="text-sm font-black text-slate-100 font-mono">1800-11-4000</p>
                    <p className="text-[10px] font-mono text-slate-500">Toll-free · Mon–Sat 9 AM – 5 PM</p>
                  </div>
                </div>
                <a
                  href="https://consumerhelpline.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  consumerhelpline.gov.in (INGRAM)
                </a>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    window.open(`/api/complaints/track/${result.ref_number}`, '_blank');
                  }}
                  className="w-full bg-[#161F30] hover:bg-[#1e2d44] border border-slate-700 text-slate-100 font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <ClipboardList className="w-4 h-4 text-cyan-400" />
                  Track Complaint Status
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-slate-500 font-mono font-semibold py-2 text-sm hover:text-slate-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Navigation ── */}
        {step !== 'success' && (
          <div className="border-t border-slate-800 px-5 py-4 flex items-center justify-between gap-3 shrink-0 bg-[#0B0F17]">
            {step !== 'violations' ? (
              <button
                onClick={() => {
                  const idx = stepOrder.indexOf(step);
                  if (idx > 0) setStep(stepOrder[idx - 1]);
                }}
                className="flex items-center gap-1.5 text-slate-400 font-mono font-semibold text-sm hover:text-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-slate-500 font-mono font-semibold text-sm hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}

            {step === 'violations' && (
              <button
                onClick={() => setStep('consumer')}
                disabled={!canProceedStep1}
                className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'consumer' && (
              <button
                onClick={() => setStep('review')}
                disabled={!canProceedStep2}
                className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Review <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Submit Complaint</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
