// src/components/kyc/RunnerCard.jsx
import { Eye } from 'lucide-react';
import Button from '../ui/Button';
import StatusIndicator from './StatusIndicator';
import DocumentTag from './DocumentTag';

export default function RunnerCard({ runner, view, onReview }) {
  return (
    <div className="p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      {/* Name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {runner.firstName?.[0]}{runner.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/80 font-medium truncate">
              {runner.firstName} {runner.lastName}
            </p>
            <p className="text-[9px] text-white/30 font-mono mt-0.5">{runner._id?.slice(-10)}</p>
          </div>
        </div>
        <StatusIndicator status={runner.kycStatus} />
      </div>

      {/* Contact */}
      <div className="mt-2.5 space-y-0.5">
        <p className="text-xs text-white/50 truncate">{runner.email}</p>
        <p className="text-[10px] text-white/30">{runner.phone}</p>
      </div>

      {/* Pending items */}
      {runner.pendingItems?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {runner.pendingItems.map((item, idx) => <DocumentTag key={idx} label={item} />)}
        </div>
      )}
      {!runner.pendingItems?.length && view === 'verified' && (
        <p className="mt-2 text-[10px] text-white/30">All verified</p>
      )}

      {/* Review button - using Button component */}
      <Button
        onClick={onReview}
        variant="outline"
        size="sm"
        fullWidth
        leftIcon={<Eye size={12} />}
        className="mt-3"
      >
        Review Runner
      </Button>
    </div>
  );
}