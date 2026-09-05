// src/pages/KycDashboard.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Clock, UserCheck, AlertTriangle,
  Search, Shield, ArrowUpDown, SortAsc,
  SortDesc, XCircle, Zap, RefreshCw
} from 'lucide-react';
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
  getRejectedKYC,
  getFlaggedKYC,
  getAutoConfirmedKYC,
  getResubmittedKYC,
} from '../Redux/kycSlice';

export default function KycTab() {
  const [currentView, setCurrentView] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dispatch = useDispatch();

  const {
    pendingRunners = [], totalPending = 0,
    verifiedRunners = [],
    rejectedRunners = [], totalRejected = 0,
    flaggedRunners = [], totalFlagged = 0,
    autoConfirmedRunners = [], totalAutoConfirmed = 0,
    resubmittedRunners = [], totalResubmitted = 0,
    selectedRunner = null,
    status = 'idle',
    error = '',
  } = useSelector(state => state.adminKyc || {});

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    dispatch(getPendingKYC());
    dispatch(getVerifiedRunners());
  }, [dispatch]);

  const refreshData = useCallback(() => {
    dispatch(getPendingKYC());
    dispatch(getVerifiedRunners());
    dispatch(getRejectedKYC());
    dispatch(getFlaggedKYC());
    dispatch(getAutoConfirmedKYC());
    dispatch(getResubmittedKYC());
  }, [dispatch]);
  

  useEffect(() => {
    refreshData();
  }, [dispatch, refreshData]);

  const viewDataMap = {
    pending: pendingRunners,
    verified: verifiedRunners,
    rejected: rejectedRunners,
    flagged: flaggedRunners,
    autoConfirmed: autoConfirmedRunners,
    resubmitted: resubmittedRunners,
  };

  // Filter and sort runners
  const displayedRunners = useMemo(() => {
    const baseData = viewDataMap[currentView] || [];

    let filtered = baseData;
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      filtered = baseData.filter(runner =>
        `${runner.firstName} ${runner.lastName} ${runner.email} ${runner.phone} ${runner.fleetType} ${runner._id}`.toLowerCase().includes(query),
      );
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest': return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      case 'oldest': return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      case 'name_asc': return sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      case 'name_desc': return sorted.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
      case 'email_asc': return sorted.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      case 'email_desc': return sorted.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
      default: return sorted;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, pendingRunners, verifiedRunners,
    rejectedRunners, flaggedRunners, autoConfirmedRunners,
    resubmittedRunners, debouncedQuery, sortBy
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApproveDocument = (runnerId, documentType) =>
    dispatch(approveDocument({ runnerId, documentType })).then(refreshData);

  const handleRejectDocument = (runnerId, documentType, reason) => {
    if (!reason?.trim()) return alert('Please provide a rejection reason');
    dispatch(rejectDocument({ runnerId, documentType, reason })).then(refreshData);
  };

  const handleApproveSelfie = (runnerId) =>
    dispatch(approveSelfie({ runnerId })).then(refreshData);

  const handleRejectSelfie = (runnerId, reason) => {
    if (!reason?.trim()) return alert('Please provide a rejection reason');
    dispatch(rejectSelfie({ runnerId, reason })).then(refreshData);
  };

  // Handle search input change without losing focus
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
    setSearchQuery('');
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  // Get sort icon based on current sort
  const getSortIcon = () => {
    switch (sortBy) {
      case 'newest': return <SortDesc size={14} />;
      case 'oldest': return <SortAsc size={14} />;
      default: return <ArrowUpDown size={14} />;
    }
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
    },
    {
      label: 'Rejected',
      value: (rejectedRunners || []).length,
      icon: UserCheck,
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/20',
      textClass: 'text-red-500',
      iconClass: 'text-red-500'
    },
    {
      label: 'Flagged',
      value: (flaggedRunners || []).length,
      icon: UserCheck,
      bgClass: 'bg-yellow-500/10',
      borderClass: 'border-yellow-500/20',
      textClass: 'text-yellow-500',
      iconClass: 'text-yellow-500'
    },
    {
      label: 'Auto-Confirmed',
      value: (autoConfirmedRunners || []).length,
      icon: UserCheck,
      bgClass: 'bg-green-500/30',
      borderClass: 'border-green-500/40',
      textClass: 'text-green-500',
      iconClass: 'text-green-500'
    },
    {
      label: 'Resubmitted',
      value: (resubmittedRunners || []).length,
      icon: UserCheck,
      bgClass: 'bg-blue-500/30',
      borderClass: 'border-blue-500/40',
      textClass: 'text-blue-500',
      iconClass: 'text-blue-500'
    },
  ];

  // Search & Sort component
  const SearchSortBar = () => (
    <div className="flex gap-2 mb-4">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full sm:w-64 focus-within:border-primary/40 transition-colors">
        <Search size={12} className="text-white/30 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={`Search ${currentView} runners...`}
          className="bg-transparent text-xs text-white/70 placeholder-white/25 outline-none w-full"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="text-white/30 hover:text-white/70 transition-colors text-sm font-bold"
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="appearance-none bg-secondary border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white/70 focus:outline-none focus:border-primary/40 cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="email_asc">Email (A-Z)</option>
          <option value="email_desc">Email (Z-A)</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {getSortIcon()}
        </div>
      </div>
    </div>
  );

  const ViewToggleBar = () => (
    <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 gap-0.5 w-full sm:w-auto overflow-x-auto mb-4">
      {[
        { key: 'pending', label: 'Pending', icon: Clock, count: totalPending },
        { key: 'verified', label: 'Verified', icon: UserCheck, count: (verifiedRunners || []).length },
        { key: 'rejected', label: 'Rejected', icon: XCircle, count: totalRejected },
        { key: 'flagged', label: 'Flagged', icon: AlertTriangle, count: totalFlagged },
        { key: 'autoConfirmed', label: 'Auto-Confirmed', icon: Zap, count: totalAutoConfirmed },
        { key: 'resubmitted', label: 'Resubmitted', icon: RefreshCw, count: totalResubmitted },
      ].map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          onClick={() => handleViewChange(key)}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap
        ${currentView === key ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/40 hover:text-white'}`}
        >
          <Icon size={12} />
          {label}
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${currentView === key ? 'bg-primary text-white' : 'bg-white/10 text-white/40'}`}>
            {count ?? 0}
          </span>
        </button>
      ))}
    </div>
  );

  // Toolbar component (now only contains the view toggle)
  const Toolbar = () => (
    <ViewToggleBar />
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
        toolbar={<Toolbar />}
      >
        {/* 🆕 Search & Sort bar now appears here - under stats, above the content */}
        <SearchSortBar />

        {displayedRunners.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-white/20">
            <Shield size={28} className="opacity-30" />
            <p className="text-xs">
              {searchQuery
                ? `No ${currentView} runners match "${searchQuery}"`
                : `No ${currentView} runners found`
              }
            </p>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Search results count */}
            {searchQuery && (
              <div className="mb-3 text-xs text-white/40">
                Found {displayedRunners.length} runner{displayedRunners.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </div>
            )}

            {/* Runner cards grid */}
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
          </>
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