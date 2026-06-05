// src/pages/KycDashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, UserCheck, AlertTriangle, Search, Shield } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import RunnerCard from '../components/kyc/RunnerCard';
import RunnerModal from '../components/kyc/RunnerModal';
import {
  getPendingKYC,
  getRunnerKYCDetails,
  approveDocument,
  rejectDocument,
  approveSelfie,
  rejectSelfie,
  clearSelectedRunner,
  getVerifiedRunners,
} from '../Redux/kycSlice';

export default function KycTab() {
  const [currentView, setCurrentView] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dispatch = useDispatch();

  const {
    pendingRunners = [],
    totalPending = 0,
    verifiedRunners = [],
    selectedRunner = null,
    status = 'idle',
    error = '',
  } = useSelector(state => state.adminKyc || {});

  useEffect(() => {
    dispatch(getPendingKYC());
    dispatch(getVerifiedRunners());
  }, [dispatch]);

  const displayedRunners = useMemo(() => {
    const baseData = (currentView === 'pending' ? pendingRunners : verifiedRunners) || [];
    if (!searchQuery) return baseData;
    const query = searchQuery.toLowerCase();
    return baseData.filter(runner =>
      `${runner.firstName} ${runner.lastName} ${runner.email} ${runner.phone}`.toLowerCase().includes(query)
    );
  }, [currentView, pendingRunners, verifiedRunners, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(getPendingKYC());
      await dispatch(getVerifiedRunners());
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApproveDocument = (runnerId, documentType) => 
    dispatch(approveDocument({ runnerId, documentType }));
  
  const handleRejectDocument = (runnerId, documentType, reason) => {
    if (!reason?.trim()) return alert('Please provide a rejection reason');
    dispatch(rejectDocument({ runnerId, documentType, reason }));
  };
  
  const handleApproveSelfie = (runnerId) => 
    dispatch(approveSelfie({ runnerId }));
  
  const handleRejectSelfie = (runnerId, reason) => {
    if (!reason?.trim()) return alert('Please provide a rejection reason');
    dispatch(rejectSelfie({ runnerId, reason }));
  };

  // Stats for the header
  const stats = [
    {
      label: 'Pending',
      value: totalPending ?? 0,
      icon: Clock,
      bgClass: 'bg-primary/10',
      borderClass: 'border-primary/20',
      textClass: 'text-primary',
      iconClass: 'text-primary'
    },
    {
      label: 'Verified',
      value: (verifiedRunners || []).length,
      icon: UserCheck,
      bgClass: 'bg-green-500/10',
      borderClass: 'border-green-500/20',
      textClass: 'text-green-500',
      iconClass: 'text-green-500'
    }
  ];

  // Toolbar component
  const Toolbar = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
      {/* View toggle */}
      <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 gap-0.5 w-full sm:w-auto">
        {[
          { key: 'pending', label: 'Pending', icon: Clock, count: totalPending },
          { key: 'verified', label: 'Verified', icon: UserCheck, count: (verifiedRunners || []).length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setCurrentView(key)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all
              ${currentView === key
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-white/40 hover:text-white'
              }`}
          >
            <Icon size={12} />
            {label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold
              ${currentView === key ? 'bg-primary text-white' : 'bg-white/10 text-white/40'}`}>
              {count ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full sm:w-56">
        <Search size={12} className="text-white/30 shrink-0" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search runners..."
          className="bg-transparent text-xs text-white/70 placeholder-white/25 outline-none w-full"
        />
      </div>
    </div>
  );

  // Error display
  if (error) {
    return (
      <PageLayout 
        title="KYC Verification" 
        description="Runner identity & document compliance"
        stats={stats}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      >
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertTriangle size={13} /> {error}
        </div>
      </PageLayout>
    );
  }

  // Loading state
  if (status === 'loading' && displayedRunners.length === 0) {
    return (
      <PageLayout 
        title="KYC Verification" 
        description="Runner identity & document compliance"
        stats={stats}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      >
        <div className="py-16 flex flex-col items-center gap-3 text-white/20">
          <Shield size={28} className="opacity-30" />
          <p className="text-xs">Loading runners...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout 
        title="KYC Verification" 
        description="Runner identity & document compliance"
        stats={stats}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        toolbar={<Toolbar />}  // Pass toolbar as a prop
      >
        {displayedRunners.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-white/20">
            <Shield size={28} className="opacity-30" />
            <p className="text-xs">No {currentView} runners found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedRunners.map((runner) => (
              <RunnerCard
                key={runner._id}
                runner={runner}
                view={currentView}
                onReview={() => dispatch(getRunnerKYCDetails(runner._id))}
              />
            ))}
          </div>
        )}
      </PageLayout>

      {/* Detail modal */}
      {selectedRunner && (
        <RunnerModal
          runner={selectedRunner}
          onClose={() => dispatch(clearSelectedRunner())}
          onApproveDocument={handleApproveDocument}
          onRejectDocument={handleRejectDocument}
          onApproveSelfie={handleApproveSelfie}
          onRejectSelfie={handleRejectSelfie}
        />
      )}
    </>
  );
}