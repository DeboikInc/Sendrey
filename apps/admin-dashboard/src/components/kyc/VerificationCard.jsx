// src/components/kyc/VerificationCard.jsx
import { FileText, Camera, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';

export default function VerificationCard({ 
  title, 
  data, 
  type, 
  onApprove, 
  onReject, 
  rejectionReason, 
  setRejectionReason, 
  isReadOnly = false 
}) {
  const isPending = data?.status === 'pending_review';
  const isApproved = data?.status === 'approved';
  const isRejected = data?.status === 'rejected';

  const borderClass = isPending ? 'border-primary/30'
                    : isApproved ? 'border-green-500/20'
                    : isRejected ? 'border-red-500/20'
                    : 'border-white/10';

  const pillClass = isPending ? 'text-primary bg-primary/10 border-primary/20'
                    : isApproved ? 'text-green-600 bg-green-50 border-green-200'
                    : isRejected ? 'text-red-600 bg-red-50 border-red-200'
                    : 'text-gray-500 bg-gray-100 border-gray-300';

  const imageUrl = type === 'selfie' ? data?.selfieImage : data?.documentPath;

  return (
    <div className={`rounded-xl border bg-white/5 overflow-hidden transition-all ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {type === 'id' || type === 'nin' || type === 'driverLicense'
            ? <FileText size={14} className="text-white/30" />
            : <Camera size={14} className="text-white/30" />}
          <span className="text-xs font-bold text-white/80 tracking-wide">{title}</span>
        </div>
        <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border ${pillClass}`}>
          {data?.status?.replace(/_/g, ' ') || 'Unknown'}
        </span>
      </div>

      {/* Image preview */}
      {imageUrl ? (
        <div className="relative bg-black-200 border-b border-white/5">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-48 object-cover opacity-90"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black-200/40 to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="h-24 bg-white/[0.02] border-b border-white/5 flex items-center justify-center">
          <span className="text-xs text-white/20 italic">No image submitted</span>
        </div>
      )}

      {/* Details */}
      <div className="p-4 space-y-2">
        {data?.submittedAt && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30 tracking-wider uppercase">Submitted</span>
            <span className="text-[11px] text-white/60">{new Date(data.submittedAt).toLocaleDateString()}</span>
          </div>
        )}
        {data?.verified !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30 tracking-wider uppercase">Verified</span>
            <span className={`text-[11px] font-medium ${data.verified ? 'text-green-500' : 'text-white/40'}`}>
              {data.verified ? 'Yes' : 'No'}
            </span>
          </div>
        )}
        {data?.rejectionReason && (
          <div className="mt-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] text-red-500/80">Rejection reason: {data.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Actions - using Button component */}
      {isPending && !isReadOnly && (
        <div className="px-4 pb-4 space-y-2">
          <input
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Rejection reason (required to reject)..."
            className="w-full bg-black-100 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/25 outline-none focus:border-primary/40 transition-colors"
          />
          <div className="flex gap-2">
            <Button
              onClick={onApprove}
              variant="success"
              size="sm"
              leftIcon={<CheckCircle size={12} />}
              className="flex-1"
            >
              Approve
            </Button>
            <Button
              onClick={onReject}
              variant="destructive"
              size="sm"
              leftIcon={<XCircle size={12} />}
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}