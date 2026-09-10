import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { NutriHeader } from './components/nutriscan/NutriHeader';
import { NutriHero } from './components/nutriscan/NutriHero';
import { Interactive3DCard } from './components/nutriscan/Interactive3DCard';
import { ActionButtons } from './components/nutriscan/ActionButtons';
import { TodaySnapshot } from './components/nutriscan/TodaySnapshot';
import { CategoryBrowse } from './components/nutriscan/CategoryBrowse';
import { RecentlyScanned, ScannedItem, RECENT_ITEMS } from './components/nutriscan/RecentlyScanned';
import { BottomNav } from './components/nutriscan/BottomNav';
import { LiveScannerModal } from './components/nutriscan/LiveScannerModal';
import { UploadProductModal } from './components/nutriscan/UploadProductModal';
import { FullPageReport } from './components/nutriscan/FullPageReport';
import { InspectionDrawer } from './components/nutriscan/InspectionDrawer';
import { InsightsView } from './components/nutriscan/InsightsView';
import { CategoryView } from './components/nutriscan/CategoryView';
import { DedicatedComplaintView } from './components/complaints/DedicatedComplaintView';
import { ProfileView } from './components/nutriscan/ProfileView';
import { PromotionalShowcase } from './components/nutriscan/PromotionalShowcase';
import { MobileQuickBar } from './components/nutriscan/MobileQuickBar';
import { PWAInstallBanner } from './components/nutriscan/PWAInstallBanner';
import { GovtTrustBanner } from './components/common/GovtEmblems';
import { GovernmentGazetteView } from './components/nutriscan/GovernmentGazetteView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NoticeModal } from './components/export/NoticeModal';
import { ComplaintPortal } from './components/complaints/ComplaintPortal';
import { ComplaintTracker } from './components/complaints/ComplaintTracker';
import { GovDashboard } from './components/complaints/GovDashboard';
import { ValidationModal } from './components/nutriscan/ValidationModal';
import { FairPackAPI } from './services/api';
import { AuditReport } from './types/compliance';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState<boolean>(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [isGovDashboardOpen, setIsGovDashboardOpen] = useState<boolean>(false);
  const [isValidationOpen, setIsValidationOpen] = useState<boolean>(false);
  const [validationSpecimen, setValidationSpecimen] = useState<any>(null);
  const [isMobileFrameMode, setIsMobileFrameMode] = useState<boolean>(false);
  const [recentItems, setRecentItems] = useState<ScannedItem[]>([]);
  const [isInitialLoadingSpecimens, setIsInitialLoadingSpecimens] = useState<boolean>(true);
  const [hasMoreSpecimens, setHasMoreSpecimens] = useState<boolean>(false);
  const [isLoadingMoreSpecimens, setIsLoadingMoreSpecimens] = useState<boolean>(false);
  const [specimensOffset, setSpecimensOffset] = useState<number>(0);

  // Helper to format ISO date to readable relative time
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // Convert raw database specimen to ScannedItem card format (matching original clean palette)
  const convertSpecimenToItem = (spec: any): ScannedItem => {
    const isA = spec.compliance_score >= 90;
    const isB = spec.compliance_score >= 70;
    const formattedName = spec.product_name || 'Scanned Specimen';
    const lowerName = formattedName.toLowerCase();
    const lowerCat = (spec.product_category || '').toLowerCase();

    // Default image resolver if spec.image_url is not set
    let resolvedImage = spec.image_url || spec.report?.image_url;
    if (!resolvedImage) {
      if (lowerName.includes('corn') || lowerName.includes('kurkure') || lowerName.includes('chips') || lowerName.includes('snack')) {
        resolvedImage = '/banners/banner_goodday.jpg';
      } else if (lowerName.includes('biscuit') || lowerName.includes('parle') || lowerName.includes('munch') || lowerName.includes('cake') || lowerName.includes('tadka') || lowerName.includes('lay')) {
        resolvedImage = '/banners/banner_goodday.jpg';
      } else if (lowerName.includes('chocolate') || lowerName.includes('lindt') || lowerName.includes('sweet') || lowerName.includes('cookie') || lowerName.includes('chewing') || lowerName.includes('gum')) {
        resolvedImage = '/banners/banner_chocolate.jpg';
      } else if (lowerName.includes('cream') || lowerName.includes('wash') || lowerName.includes('face') || lowerName.includes('lotion') || lowerName.includes('lip') || lowerName.includes('perfume') || lowerName.includes('powder') || lowerName.includes('cleaner') || lowerCat.includes('cosmetic')) {
        resolvedImage = '/banners/banner_cosmetic.jpg';
      } else if (lowerName.includes('drink') || lowerName.includes('juice') || lowerName.includes('water') || lowerName.includes('tropicana') || lowerName.includes('frooti') || lowerName.includes('maaza') || lowerName.includes('carbonated') || lowerCat.includes('beverage')) {
        resolvedImage = '/banners/banner_soda.jpg';
      } else if (lowerName.includes('protein') || lowerName.includes('supplement')) {
        resolvedImage = '/banners/banner_protein.jpg';
      }
    }

    return {
      id: spec.id || spec.audit_id,
      name: formattedName.charAt(0).toUpperCase() + formattedName.slice(1),
      category: spec.product_category || 'Stored Specimen',
      timeAgo: spec.created_at ? formatTimeAgo(spec.created_at) : 'Saved',
      grade: spec.grade || (isA ? 'A+' : isB ? 'B-' : 'C'),
      gradeBg: isA ? 'bg-[#D5FF3F]' : isB ? 'bg-[#8B5CF6]' : 'bg-[#FF2A85]',
      gradeColor: isA ? 'text-zinc-950 font-black' : 'text-white font-black',
      icon: ImageIcon,
      iconBg: 'bg-[#D5FF3F]/30 text-zinc-900',
      presetId: spec.id || 'custom-upload',
      image_url: resolvedImage,
      is_database_record: true,
      report: spec.report,
    };
  };

  // Load user's recent scans from local cache and backend on startup
  useEffect(() => {
    // 1. Check local session storage first so user's scans appear with zero delay
    try {
      const cached = localStorage.getItem('fairpack_user_scans');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentItems(parsed);
          setIsInitialLoadingSpecimens(false);
        }
      }
    } catch (e) {
      console.warn('Local scan cache load error:', e);
    }

    // 2. Initial preset audit in parallel
    FairPackAPI.runAudit('compliant-biscuit')
      .then((initialReport) => setReport(initialReport))
      .catch((err) => console.warn('Initial preset audit error:', err));

    // 3. Fetch latest specimens directly from Supabase in decreasing order of upload
    FairPackAPI.getStoredSpecimens(8, 0)
      .then((res) => {
        if (res.specimens && res.specimens.length > 0) {
          const dbItems = res.specimens.map(convertSpecimenToItem);
          setRecentItems((prev) => {
            // Merge user's freshly scanned items with DB records, preserving newest first
            const existingIds = new Set();
            const combined: ScannedItem[] = [];
            for (const item of [...prev, ...dbItems]) {
              if (item.id && !existingIds.has(item.id)) {
                existingIds.add(item.id);
                combined.push(item);
              }
            }
            return combined;
          });
          setSpecimensOffset(res.specimens.length);
          setHasMoreSpecimens(res.has_more);
        } else {
          setRecentItems((prev) => (prev.length > 0 ? prev : RECENT_ITEMS));
        }
      })
      .catch((err) => {
        console.warn('Specimens packet load error:', err);
        setRecentItems((prev) => (prev.length > 0 ? prev : RECENT_ITEMS));
      })
      .finally(() => {
        setIsInitialLoadingSpecimens(false);
      });

    // Check if opened via PWA Shortcut action or query params
    const params = new URLSearchParams(window.location.search);
    const actionParam = params.get('action');
    const tabParam = params.get('tab');

    if (actionParam === 'scan') {
      setIsScannerOpen(true);
    } else if (actionParam === 'upload') {
      setIsUploadModalOpen(true);
    }

    if (tabParam && ['home', 'insights', 'complaint', 'category', 'profile', 'gazette'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Fetch next packet of specimens on demand
  const handleLoadMoreSpecimens = async () => {
    if (isLoadingMoreSpecimens || !hasMoreSpecimens) return;
    setIsLoadingMoreSpecimens(true);
    try {
      const res = await FairPackAPI.getStoredSpecimens(8, specimensOffset);
      if (res.specimens && res.specimens.length > 0) {
        const newDbItems = res.specimens.map(convertSpecimenToItem);
        setRecentItems((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = newDbItems.filter((item) => !existingIds.has(item.id));
          return [...prev, ...uniqueNew];
        });
        setSpecimensOffset((prev) => prev + res.specimens.length);
        setHasMoreSpecimens(res.has_more);
      } else {
        setHasMoreSpecimens(false);
      }
    } catch (err) {
      console.warn('Load more specimens error:', err);
    } finally {
      setIsLoadingMoreSpecimens(false);
    }
  };

  const handleSelectItem = async (item: ScannedItem) => {
    try {
      if (item.report) {
        setReport(item.report);
        setIsDrawerOpen(true);
        return;
      }

      // If it is a stored database specimen, fetch its real saved report by specimen ID
      if (item.id) {
        const fullSpecimen = await FairPackAPI.getSpecimenById(item.id);
        if (fullSpecimen && fullSpecimen.report) {
          // Cache the report on the item so subsequent clicks are instantaneous
          item.report = fullSpecimen.report;
          setReport(fullSpecimen.report);
          setIsDrawerOpen(true);
          return;
        }
      }

      // Fallback for preset demo items
      const newReport = await FairPackAPI.runAudit(item.presetId);
      setReport(newReport);
      setIsDrawerOpen(true);
    } catch (err) {
      console.error('Error loading item audit:', err);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await FairPackAPI.deleteStoredSpecimen(id);
      setRecentItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete specimen record:', err);
    }
  };

  const handleScanComplete = async (presetId: string) => {
    try {
      const newReport = await FairPackAPI.runAudit(presetId);
      setReport(newReport);
      setIsDrawerOpen(true);
    } catch (err) {
      console.error('Scan audit error:', err);
    }
  };

  const handleAuditComplete = (newReport: AuditReport) => {
    setReport(newReport);

    // Create new scanned item card
    const isA = newReport.compliance_score >= 90;
    const isB = newReport.compliance_score >= 70;
    const formattedName = newReport.product_name || 'Scanned Specimen';

    const newItem: ScannedItem = {
      id: newReport.audit_id || `upload-${Date.now()}`,
      name: formattedName.charAt(0).toUpperCase() + formattedName.slice(1),
      category: 'Stored Specimen',
      timeAgo: 'Just now',
      grade: isA ? 'A+' : isB ? 'B-' : 'C',
      gradeBg: isA ? 'bg-[#D5FF3F]' : isB ? 'bg-[#8B5CF6]' : 'bg-[#FF2A85]',
      gradeColor: isA ? 'text-zinc-950 font-black' : 'text-white font-black',
      icon: Camera,
      iconBg: 'bg-[#D5FF3F]/30 text-zinc-900',
      presetId: 'custom-upload',
      image_url: newReport.image_url,
      is_database_record: true,
      report: newReport,
    };

    setRecentItems((prev) => {
      const updated = [newItem, ...prev.filter((i) => i.id !== newItem.id)];
      try {
        localStorage.setItem('fairpack_user_scans', JSON.stringify(updated.slice(0, 20)));
      } catch (e) {
        console.warn('Could not save scan to localStorage:', e);
      }
      return updated;
    });
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F0EDE3] flex flex-col items-center justify-start text-zinc-900 selection:bg-[#FF2A85]/20 selection:text-[#FF2A85] relative overflow-x-hidden">
      
      {/* Background Organic Pastel Blobs */}
      <div className="fixed -top-16 -right-16 w-96 h-96 rounded-full bg-[#E5F792] opacity-75 blur-3xl pointer-events-none -z-0" />
      <div className="fixed top-1/3 -left-20 w-72 h-80 rounded-full bg-[#FFD1DC] opacity-70 blur-3xl pointer-events-none -z-0" />
      <div className="fixed bottom-10 right-1/4 w-80 h-80 rounded-full bg-[#E0F7FA] opacity-50 blur-3xl pointer-events-none -z-0" />

      {/* Responsive Main Container */}
      <div
        className={`w-full transition-all duration-300 relative z-10 ${
          isMobileFrameMode
            ? 'max-w-[430px] my-0 sm:my-6 bg-[#F7F5EC] sm:rounded-[44px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] border-x sm:border border-zinc-300/80 px-4 sm:px-5 min-h-screen pb-24 overflow-hidden'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 min-h-screen pb-24 lg:pb-12'
        }`}
      >
        {/* Top Header with Mobile Feature Menu */}
        <NutriHeader
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onProfileClick={() => setActiveTab('profile')}
          onScanClick={() => setIsScannerOpen(true)}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onOpenNotice={() => setIsNoticeOpen(true)}
          onOpenComplaint={() => setIsComplaintOpen(true)}
          onOpenTracker={() => setIsTrackerOpen(true)}
          onOpenGovPortal={() => setIsGovDashboardOpen(true)}
          isMobileFrameMode={isMobileFrameMode}
          onToggleFrameMode={() => setIsMobileFrameMode(!isMobileFrameMode)}
        />

        {/* PWA Install Banner */}
        <div className="mt-2">
          <PWAInstallBanner />
        </div>

        {/* Mobile Instant Quick Action Pill Bar */}
        <div className={!isMobileFrameMode ? 'block md:hidden' : 'block'}>
          <MobileQuickBar
            onScanClick={() => setIsScannerOpen(true)}
            onUploadClick={() => setIsUploadModalOpen(true)}
            onQuickPreset={(presetId) => handleScanComplete(presetId)}
            onOpenNotice={() => setIsNoticeOpen(true)}
          />
        </div>

        {/* Tab 1: Home Tab */}
        {activeTab === 'home' && (
          <div>
            {/* Desktop / Laptop Responsive Full-Width Carousel Layout */}
            {!isMobileFrameMode ? (
              <div className="space-y-6 pt-2">
                {/* Hero Greeting Heading */}
                <NutriHero />

                {/* FULL HORIZONTAL SPACE SLIDING CAROUSEL */}
                <div className="w-full">
                  <Interactive3DCard
                    onExploreProduct={(presetId) => handleScanComplete(presetId)}
                  />
                </div>

                {/* Tactile Action Buttons */}
                <ActionButtons
                  onScanClick={() => setIsScannerOpen(true)}
                  onUploadClick={() => setIsUploadModalOpen(true)}
                  onRecentScansClick={() => setIsDrawerOpen(true)}
                  onOpenComplaint={() => setIsComplaintOpen(true)}
                  onOpenTracker={() => setIsTrackerOpen(true)}
                  onOpenGovPortal={() => setIsGovDashboardOpen(true)}
                />

                {/* 1. Horizontal Minimalist Recent Scans Carousel (Top Priority) */}
                <div className="pt-2">
                  <RecentlyScanned
                    items={recentItems}
                    isInitialLoading={isInitialLoadingSpecimens}
                    onSelectItem={handleSelectItem}
                    onSeeAll={() => setActiveTab('category')}
                    onDeleteItem={handleDeleteItem}
                    onLoadMore={handleLoadMoreSpecimens}
                    hasMore={hasMoreSpecimens}
                    isLoadingMore={isLoadingMoreSpecimens}
                  />
                </div>

                {/* 2. Active Audit Result & Visual Breakdown with Category Browse underneath */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start pt-1">
                  <div className="lg:col-span-7 space-y-6">
                    <TodaySnapshot
                      report={report}
                      onViewAll={() => setActiveTab('insights')}
                      onInspect={() => setIsDrawerOpen(true)}
                    />
                  </div>
                  <div className="lg:col-span-5 space-y-6">
                    <CategoryBrowse onSelectCategory={() => setActiveTab('category')} />
                  </div>
                </div>
              </div>
            ) : (
              /* Mobile Frame Layout (matches mobile stream) */
              <div className="space-y-4 pt-1">
                <NutriHero />
                <div className="w-full">
                  <Interactive3DCard
                    onExploreProduct={(presetId) => handleScanComplete(presetId)}
                  />
                </div>
                <ActionButtons
                  onScanClick={() => setIsScannerOpen(true)}
                  onUploadClick={() => setIsUploadModalOpen(true)}
                  onRecentScansClick={() => setIsDrawerOpen(true)}
                  onOpenComplaint={() => setIsComplaintOpen(true)}
                  onOpenTracker={() => setIsTrackerOpen(true)}
                  onOpenGovPortal={() => setIsGovDashboardOpen(true)}
                />

                {/* 1. Recent Scans above Active Audit Result in mobile as well */}
                <RecentlyScanned
                  items={recentItems}
                  isInitialLoading={isInitialLoadingSpecimens}
                  onSelectItem={handleSelectItem}
                  onSeeAll={() => setActiveTab('category')}
                  onDeleteItem={handleDeleteItem}
                  onLoadMore={handleLoadMoreSpecimens}
                  hasMore={hasMoreSpecimens}
                  isLoadingMore={isLoadingMoreSpecimens}
                />

                {/* 2. Active Audit Result & Visual Breakdown */}
                <TodaySnapshot
                  report={report}
                  onViewAll={() => setActiveTab('insights')}
                  onInspect={() => setIsDrawerOpen(true)}
                />
                <CategoryBrowse onSelectCategory={() => setActiveTab('category')} />
              </div>
            )}

            {/* Official Government of India & Jago Grahak Jago Trust Banner at bottom-most of Home page */}
            <div className="pt-6 pb-2">
              <GovtTrustBanner />
            </div>
          </div>
        )}

        {/* Tab 2: Insights View */}
        {activeTab === 'insights' && (
          <div className="max-w-3xl mx-auto">
            <InsightsView
              onBackToHome={() => setActiveTab('home')}
              onOpenValidation={(specimen: any) => {
                setValidationSpecimen(specimen);
                setIsValidationOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 3: Dedicated File Complaint View */}
        {activeTab === 'complaint' && (
          <div className="max-w-4xl mx-auto">
            <DedicatedComplaintView
              report={report}
              onOpenComplaintModal={() => setIsComplaintOpen(true)}
              onOpenTrackerModal={() => setIsTrackerOpen(true)}
              onOpenGovPortal={() => setIsGovDashboardOpen(true)}
            />
          </div>
        )}

        {/* Optional Category View (retained for direct link / category browse) */}
        {activeTab === 'category' && (
          <div className="max-w-3xl mx-auto">
            <CategoryView onSelectItem={handleSelectItem} />
          </div>
        )}

        {/* Tab 4: Profile View */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <ProfileView onOpenNotice={() => setIsNoticeOpen(true)} />
          </div>
        )}

        {/* Tab 5: Government Gazette & Statutory Guarantee View */}
        {activeTab === 'gazette' && (
          <div className="max-w-4xl mx-auto">
            <GovernmentGazetteView />
          </div>
        )}

        {/* Floating Mobile Bottom Navigation Dock */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onCenterAction={() => setIsScannerOpen(true)}
        />
      </div>

      {/* Live High-Tech Scanner Modal */}
      <LiveScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
        onAuditComplete={handleAuditComplete}
        onFileUpload={async (file) => {
          const report = await FairPackAPI.uploadImageAndAudit(file);
          handleAuditComplete(report);
        }}
      />

      {/* Dedicated Tactile Upload Product Modal */}
      <UploadProductModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAuditComplete={handleAuditComplete}
      />

      {/* Full-Page Statutory Compliance Inspection Dashboard */}
      {isDrawerOpen && (
        <ErrorBoundary
          fallbackTitle="Inspection Report Recovery"
          onReset={() => setIsDrawerOpen(false)}
        >
          <FullPageReport
            report={report}
            onClose={() => setIsDrawerOpen(false)}
            onOpenNotice={() => setIsNoticeOpen(true)}
            onOpenComplaint={() => setIsComplaintOpen(true)}
            onRescan={() => {
              setIsDrawerOpen(false);
              setIsScannerOpen(true);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Official Notice of Non-Compliance (Rule 32) Modal */}
      <NoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
        report={report}
      />

      {/* Consumer Grievance / Complaint Portal */}
      <ComplaintPortal
        isOpen={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        report={report}
      />

      {/* Complaint Status Tracker */}
      {isTrackerOpen && (
        <ComplaintTracker onClose={() => setIsTrackerOpen(false)} />
      )}

      {/* Government Officer Dashboard */}
      {isGovDashboardOpen && (
        <GovDashboard onClose={() => setIsGovDashboardOpen(false)} />
      )}

      {/* Accuracy Validation Modal */}
      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => {
          setIsValidationOpen(false);
          setValidationSpecimen(null);
        }}
        specimen={validationSpecimen}
        onValidationComplete={() => {
          // Refresh insights when validation is submitted
        }}
      />
    </div>
  );
}

export default App;
