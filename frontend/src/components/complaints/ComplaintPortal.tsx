import React, { useState } from 'react';
import {
  X, AlertTriangle, Flag, MapPin, User, Phone, Mail,
  CheckCircle2, Loader2, ExternalLink, ChevronRight,
  ChevronLeft, Shield, Building2, ClipboardList, Info
} from 'lucide-react';
import { AuditReport } from '../../types/compliance';

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

  // Step 1 — Violation details (auto-filled)
  const [selectedViolations, setSelectedViolations] = useState<string[]>(
    report?.violations?.map((v) => v.mandate_id) ?? []
  );
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — Consumer info
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

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0E1118] px-5 pt-5 pb-4 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-[#FF2A85]" />
              <span className="text-[#FF2A85] text-xs font-black uppercase tracking-widest">File Complaint</span>
            </div>
            <h2 className="text-white font-black text-base leading-tight">
              Ministry of Consumer Affairs
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">NutriScan — Consumer Grievance Portal</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {step !== 'success' && (
          <div className="bg-[#0E1118] px-5 pb-4 shrink-0">
            <div className="flex items-center gap-2">
              {['violations', 'consumer', 'review'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 ${stepIndex >= i ? 'text-white' : 'text-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                      stepIndex > i ? 'bg-[#D5FF3F] text-zinc-900' :
                      stepIndex === i ? 'bg-[#FF2A85] text-white' :
                      'bg-slate-800 text-slate-500'
                    }`}>{stepIndex > i ? '✓' : i + 1}</div>
                    <span className="text-[10px] font-semibold hidden sm:block">{stepLabels[s as Step]}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px ${stepIndex > i ? 'bg-[#D5FF3F]/60' : 'bg-slate-800'}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Product Context Bar */}
        {step !== 'success' && (
          <div className="bg-slate-50 border-b border-zinc-200 px-5 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#FF2A85]/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#FF2A85]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-zinc-800 truncate">{report.product_name}</p>
              <p className="text-[10px] text-zinc-500">
                Audit ID: {report.audit_id} · Score: {report.compliance_score}%
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${
              report.violations?.length > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {report.violations?.length ?? 0} Violations
            </span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── STEP 1: Violations ── */}
          {step === 'violations' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-sm text-zinc-900 mb-1">Select Violations to Report</h3>
                <p className="text-xs text-zinc-500">
                  These are auto-detected from your scan. Tap to select/deselect.
                </p>
              </div>

              <div className="space-y-2">
                {allIssues.length === 0 ? (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold text-center">
                    ✅ No violations found in audit. You can still file a complaint with a description.
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
                              ? 'border-red-500 bg-red-50'
                              : 'border-amber-400 bg-amber-50'
                            : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-4 h-4 rounded shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? isViolation ? 'bg-red-500 border-red-500' : 'bg-amber-400 border-amber-400'
                              : 'border-zinc-300 bg-white'
                          }`}>
                            {isSelected && <span className="text-white text-[9px] font-black">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-zinc-800">{item.name}</span>
                              <span className={`px-1.5 py-0 rounded text-[9px] font-black ${
                                isViolation ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isViolation ? 'VIOLATION' : 'WARNING'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{item.rule}</p>
                            <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed line-clamp-2">{item.reason}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Purchase Details */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900">Purchase Details</h3>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Where did you buy this product? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={purchaseLocation}
                    onChange={(e) => setPurchaseLocation(e.target.value)}
                    placeholder="e.g., DMart, Sector 18, Noida, UP"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Purchase Date (optional)</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Describe the Issue <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe what's wrong with the product packaging..."
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all resize-none"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">{description.length}/2000 chars (min 10)</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Consumer Info ── */}
          {step === 'consumer' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-sm text-zinc-900 mb-1">Your Information</h3>
                <p className="text-xs text-zinc-500">
                  Required for the Legal Metrology department to contact you. Your email/phone are kept confidential.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    <User className="w-3 h-3 inline mr-1" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={consumerName}
                    onChange={(e) => setConsumerName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email Address (optional)
                  </label>
                  <input
                    type="email"
                    value={consumerEmail}
                    onChange={(e) => setConsumerEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Mobile Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={consumerPhone}
                    onChange={(e) => setConsumerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    State / UT <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={consumerState}
                    onChange={(e) => setConsumerState(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all bg-white"
                  >
                    <option value="">Select your state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {consumerState && (
                    <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5" />
                      Will be routed to the {consumerState} Legal Metrology Department
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    District (optional)
                  </label>
                  <input
                    type="text"
                    value={consumerDistrict}
                    onChange={(e) => setConsumerDistrict(e.target.value)}
                    placeholder="Your district"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2A85]/30 focus:border-[#FF2A85] transition-all"
                  />
                </div>
              </div>

              {/* Info card */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-800">Privacy Notice</p>
                  <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                    Your personal details are shared only with the competent Legal Metrology authority in your state/UT 
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
                <h3 className="font-black text-sm text-zinc-900 mb-1">Review Your Complaint</h3>
                <p className="text-xs text-zinc-500">Please verify all details before submitting.</p>
              </div>

              {/* Product */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Product</p>
                <p className="text-sm font-black text-zinc-900">{report.product_name}</p>
                <p className="text-xs text-zinc-500">Audit: {report.audit_id} · Compliance Score: {report.compliance_score}%</p>
              </div>

              {/* Selected Violations */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Selected Violations ({selectedViolations.length})
                </p>
                {selectedViolationObjs.map((v) => (
                  <div key={v.mandate_id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs text-zinc-800">{v.name} ({v.rule})</span>
                  </div>
                ))}
              </div>

              {/* Purchase details */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Purchase Details</p>
                <p className="text-xs"><span className="font-semibold">Location:</span> {purchaseLocation}</p>
                {purchaseDate && <p className="text-xs"><span className="font-semibold">Date:</span> {purchaseDate}</p>}
                <p className="text-xs"><span className="font-semibold">Description:</span> {description}</p>
              </div>

              {/* Consumer */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Consumer Details</p>
                <p className="text-xs font-semibold">{consumerName}</p>
                {consumerEmail && <p className="text-xs text-zinc-600">{consumerEmail}</p>}
                {consumerPhone && <p className="text-xs text-zinc-600">{consumerPhone}</p>}
                <p className="text-xs text-zinc-600">{consumerState}{consumerDistrict ? `, ${consumerDistrict}` : ''}</p>
              </div>

              {/* Routing */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-2">
                <Building2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-indigo-800">Auto-Routing to State Department</p>
                  <p className="text-[10px] text-indigo-600 mt-0.5">
                    This complaint will be automatically routed to the <strong>{consumerState}</strong> Legal Metrology Department for enforcement action.
                  </p>
                </div>
              </div>

              {/* INGRAM Notice */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-orange-800">INGRAM Integration</p>
                  <p className="text-[10px] text-orange-600 mt-0.5">
                    Officers can forward your complaint to India's National Consumer Helpline (NCH) at 
                    <strong> consumerhelpline.gov.in</strong> for escalation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Success ── */}
          {step === 'success' && result && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="font-black text-lg text-zinc-900">Complaint Submitted!</h3>
                <p className="text-sm text-zinc-500 mt-1">Your reference number is:</p>
                <div className="mt-2 inline-block bg-[#0E1118] text-[#D5FF3F] font-black text-xl px-6 py-3 rounded-2xl tracking-widest">
                  {result.ref_number}
                </div>
                <p className="text-xs text-zinc-400 mt-2">Save this number to track your complaint</p>
              </div>

              {/* Routing info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs font-black text-blue-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Routed To
                </p>
                <p className="text-sm font-bold text-zinc-800">{result.routed_to?.department}</p>
                <p className="text-xs text-zinc-600">📧 {result.routed_to?.email}</p>
                <p className="text-xs text-zinc-600">📞 {result.routed_to?.phone}</p>
              </div>

              {/* INGRAM / NCH info */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs font-black text-orange-800">National Consumer Helpline</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📞</span>
                  <div>
                    <p className="text-sm font-black text-zinc-900">1800-11-4000</p>
                    <p className="text-[10px] text-zinc-500">Toll-free · Mon–Sat 9 AM – 5 PM</p>
                  </div>
                </div>
                <a
                  href="https://consumerhelpline.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-800 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  consumerhelpline.gov.in (INGRAM)
                </a>
              </div>

              {/* Track button */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    // Open tracker
                    const url = `/api/complaints/track/${result.ref_number}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full bg-[#0E1118] text-white font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Track Complaint Status
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-zinc-500 font-semibold py-2 text-sm hover:text-zinc-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step !== 'success' && (
          <div className="border-t border-zinc-100 px-5 py-4 flex items-center justify-between gap-3 shrink-0 bg-white">
            {step !== 'violations' ? (
              <button
                onClick={() => {
                  const idx = stepOrder.indexOf(step);
                  if (idx > 0) setStep(stepOrder[idx - 1]);
                }}
                className="flex items-center gap-1.5 text-zinc-600 font-semibold text-sm hover:text-zinc-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-zinc-400 font-semibold text-sm hover:text-zinc-700 transition-colors"
              >
                Cancel
              </button>
            )}

            {step === 'violations' && (
              <button
                onClick={() => setStep('consumer')}
                disabled={!canProceedStep1}
                className="flex items-center gap-1.5 bg-[#FF2A85] text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e0246f] transition-colors active:scale-95"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'consumer' && (
              <button
                onClick={() => setStep('review')}
                disabled={!canProceedStep2}
                className="flex items-center gap-1.5 bg-[#FF2A85] text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e0246f] transition-colors active:scale-95"
              >
                Review <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 bg-[#FF2A85] text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 hover:bg-[#e0246f] transition-colors active:scale-95"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Flag className="w-4 h-4" /> Submit Complaint</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
