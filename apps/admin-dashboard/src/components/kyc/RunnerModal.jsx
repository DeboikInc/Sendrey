// src/components/kyc/RunnerModal.jsx
import { useState, useEffect } from 'react';
import { ChevronLeft, X, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import StatusIndicator from './StatusIndicator';
import VerificationCard from './VerificationCard';

export default function RunnerModal({ 
  runner, 
  onClose, 
  onApproveDocument, 
  onRejectDocument, 
  onApproveSelfie, 
  onRejectSelfie 
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirmingAction, setConfirmingAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localDocuments, setLocalDocuments] = useState({});

  // Initialize local documents state from runner data
  useEffect(() => {
    if (runner) {
      setLocalDocuments({
        documents: runner.documents || {},
        biometrics: runner.biometrics || {}
      });
    }
  }, [runner]);

  const documents = localDocuments.documents || {};
  const biometrics = localDocuments.biometrics || {};

  const identityDocuments = [];
  if (documents.nin) identityDocuments.push({ title: 'NIN Document', data: documents.nin, type: 'nin' });
  if (documents.driverLicense) identityDocuments.push({ title: "Driver's License", data: documents.driverLicense, type: 'driverLicense' });
  if (documents.passport) identityDocuments.push({ title: 'Passport', data: documents.passport, type: 'passport' });

  const hasSelfie = biometrics?.status && biometrics.status !== 'not_submitted';
  
  // Check if any document is still pending
  const hasPendingDocuments = identityDocuments.some(doc => doc.data?.status === 'pending_review') ||
    (hasSelfie && biometrics?.status === 'pending_review');
  
  // Check if all documents are approved
  const allDocumentsApproved = identityDocuments.length > 0 && 
    identityDocuments.every(doc => doc.data?.status === 'approved') &&
    (!hasSelfie || biometrics?.status === 'approved');
  
  // Check if any document is rejected
  const hasRejectedDocuments = identityDocuments.some(doc => doc.data?.status === 'rejected') ||
    (hasSelfie && biometrics?.status === 'rejected');

  const handleApproveDocument = async (docType) => {
    setIsSubmitting(true);
    try {
      await onApproveDocument(runner._id, docType);
      // Update local state
      setLocalDocuments(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docType]: { ...prev.documents[docType], status: 'approved' }
        }
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDocument = async (docType, reason) => {
    if (!reason?.trim()) return;
    setIsSubmitting(true);
    try {
      await onRejectDocument(runner._id, docType, reason);
      // Update local state
      setLocalDocuments(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docType]: { ...prev.documents[docType], status: 'rejected', rejectionReason: reason }
        }
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSelfie = async () => {
    setIsSubmitting(true);
    try {
      await onApproveSelfie(runner._id);
      setLocalDocuments(prev => ({
        ...prev,
        biometrics: { ...prev.biometrics, status: 'approved' }
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSelfie = async (reason) => {
    if (!reason?.trim()) return;
    setIsSubmitting(true);
    try {
      await onRejectSelfie(runner._id, reason);
      setLocalDocuments(prev => ({
        ...prev,
        biometrics: { ...prev.biometrics, status: 'rejected', rejectionReason: reason }
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAll = async () => {
    setIsSubmitting(true);
    try {
      for (const doc of identityDocuments) {
        if (doc.data?.status === 'pending_review') {
          await onApproveDocument(runner._id, doc.type);
          // Update local state
          setLocalDocuments(prev => ({
            ...prev,
            documents: {
              ...prev.documents,
              [doc.type]: { ...prev.documents[doc.type], status: 'approved' }
            }
          }));
        }
      }
      if (hasSelfie && biometrics?.status === 'pending_review') {
        await onApproveSelfie(runner._id);
        setLocalDocuments(prev => ({
          ...prev,
          biometrics: { ...prev.biometrics, status: 'approved' }
        }));
      }
      onClose();
    } finally {
      setIsSubmitting(false);
      setConfirmingAction(null);
    }
  };

  const handleRejectAll = async () => {
    if (!rejectionReason.trim()) return;
    setIsSubmitting(true);
    try {
      for (const doc of identityDocuments) {
        if (doc.data?.status === 'pending_review') {
          await onRejectDocument(runner._id, doc.type, rejectionReason);
          setLocalDocuments(prev => ({
            ...prev,
            documents: {
              ...prev.documents,
              [doc.type]: { ...prev.documents[doc.type], status: 'rejected', rejectionReason: rejectionReason }
            }
          }));
        }
      }
      if (hasSelfie && biometrics?.status === 'pending_review') {
        await onRejectSelfie(runner._id, rejectionReason);
        setLocalDocuments(prev => ({
          ...prev,
          biometrics: { ...prev.biometrics, status: 'rejected', rejectionReason: rejectionReason }
        }));
      }
      onClose();
    } finally {
      setIsSubmitting(false);
      setConfirmingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black-200/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl sm:max-h-[88vh] max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-secondary/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 shrink-0 bg-secondary/30">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              leftIcon={<ChevronLeft size={14} />}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10"
            />
            <div>
              <h2 className="text-white font-bold text-sm tracking-tight">{runner.firstName} {runner.lastName}</h2>
              <p className="text-white/40 text-[10px] mt-0.5 truncate max-w-[160px] sm:max-w-none">{runner.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <StatusIndicator status={runner.runnerStatus} />
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              leftIcon={<X size={14} />}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10"
            />
          </div>
        </div>

        {/* Info strip */}
        <div className="flex items-center gap-4 sm:gap-8 px-4 sm:px-6 py-3 bg-white/[0.02] border-b border-white/5 shrink-0 overflow-x-auto">
          {[
            ['Phone', runner.phone], 
            ['ID', runner._id?.slice(-8)], 
            ['Email', runner.email]
          ].map(([label, value]) => (
            <div key={label} className="shrink-0">
              <p className="text-[9px] text-white/30 uppercase tracking-widest">{label}</p>
              <p className="text-[11px] text-white/70 font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-secondary/30">
          {identityDocuments.length > 0 && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Identity Documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {identityDocuments.map(doc => (
                  <VerificationCard
                    key={doc.type}
                    title={doc.title}
                    data={doc.data}
                    type={doc.type}
                    onApprove={() => handleApproveDocument(doc.type)}
                    onReject={() => handleRejectDocument(doc.type, rejectionReason)}
                    rejectionReason={rejectionReason}
                    setRejectionReason={setRejectionReason}
                    isReadOnly={doc.data?.status !== 'pending_review'}
                  />
                ))}
              </div>
            </div>
          )}

          {hasSelfie && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Biometric Verification</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <VerificationCard
                  title="Selfie Image"
                  data={biometrics}
                  type="selfie"
                  onApprove={handleApproveSelfie}
                  onReject={() => handleRejectSelfie(rejectionReason)}
                  rejectionReason={rejectionReason}
                  setRejectionReason={setRejectionReason}
                  isReadOnly={biometrics?.status !== 'pending_review'}
                />
              </div>
            </div>
          )}

          {identityDocuments.length === 0 && !hasSelfie && (
            <div className="py-12 text-center text-white/30 text-sm">No documents submitted yet</div>
          )}

          {confirmingAction === 'reject' && hasPendingDocuments && (
            <div className="mt-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Rejection Reason</p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why these documents are being rejected..."
                rows={3}
                className="w-full bg-secondary/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/25 outline-none resize-none focus:border-primary/40 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer - Only show if there are pending documents */}
        {(identityDocuments.length > 0 || hasSelfie) && hasPendingDocuments && (
          <div className="px-4 sm:px-6 py-4 border-t border-white/5 shrink-0 bg-secondary/30">
            {confirmingAction === null ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => setConfirmingAction('reject')}
                  variant="destructive"
                  fullWidth
                  leftIcon={<XCircle size={13} />}
                  disabled={allDocumentsApproved}
                >
                  Reject All Pending
                </Button>
                <Button
                  onClick={() => setConfirmingAction('approve')}
                  variant="success"
                  fullWidth
                  leftIcon={<CheckCircle size={13} />}
                  disabled={allDocumentsApproved}
                >
                  Approve All Pending
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => { setConfirmingAction(null); setRejectionReason(''); }}
                  variant="ghost"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  onClick={confirmingAction === 'approve' ? handleApproveAll : handleRejectAll}
                  variant={confirmingAction === 'approve' ? 'success' : 'destructive'}
                  fullWidth
                  isLoading={isSubmitting}
                  loadingText="Submitting..."
                  disabled={confirmingAction === 'reject' && !rejectionReason.trim()}
                >
                  {confirmingAction === 'approve' ? 'Confirm Approve All' : 'Confirm Reject All'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Show completion message when all documents are processed */}
        {!hasPendingDocuments && (identityDocuments.length > 0 || hasSelfie) && (
          <div className="px-4 sm:px-6 py-4 border-t border-white/5 shrink-0 bg-secondary/30">
            <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
              allDocumentsApproved
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : hasRejectedDocuments
                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}>
              {allDocumentsApproved && <CheckCircle size={16} />}
              {hasRejectedDocuments && <XCircle size={16} />}
              <span>
                {allDocumentsApproved 
                  ? 'All documents have been approved' 
                  : hasRejectedDocuments 
                  ? 'Some documents have been rejected'
                  : 'All documents have been reviewed'}
              </span>
            </div>
            <Button onClick={onClose} variant="primary" fullWidth className="mt-3">
              Close
            </Button>
          </div>
        )}

        {identityDocuments.length === 0 && !hasSelfie && (
          <div className="px-4 sm:px-6 py-4 border-t border-white/5 shrink-0 bg-secondary/30">
            <Button onClick={onClose} variant="primary" fullWidth>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}