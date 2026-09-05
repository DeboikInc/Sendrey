import { Eye } from 'lucide-react';
import Button from '../ui/Button';
import StatusIndicator from './StatusIndicator';
import DocumentTag from './DocumentTag';

const ITEMS_KEY_BY_VIEW = {
  pending: 'pendingItems',
  rejected: 'rejectedItems',
  flagged: 'flaggedItems',
  resubmitted: 'resubmittedItems',
};

export default function RunnerCard({ runner, view, onReview }) {
  const itemsKey = ITEMS_KEY_BY_VIEW[view];
  const items = itemsKey ? runner[itemsKey] : null;

  return (
    <div className="p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {runner.firstName?.[0]}{runner.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/80 font-medium truncate">{runner.firstName} {runner.lastName}</p>
            <p className="text-[9px] text-white/30 font-mono mt-0.5">{runner._id?.slice(-10)}</p>
          </div>
        </div>
        <StatusIndicator status={runner.kycStatus} />
      </div>

      <div className="mt-2.5 space-y-0.5">
        <p className="text-xs text-white/50 truncate">{runner.email}</p>
        <p className="text-[10px] text-white/30">{runner.phone}</p>
        <p className="text-[10px] text-white/30">{runner.fleetType}</p>
      </div>

      {runner.faceMatchScore !== undefined && runner.faceMatchScore !== null && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9px] text-white/30 uppercase tracking-wider">Face Match</span>
          <span className={`text-[10px] font-bold ${runner.faceMatchScore >= 0.85 ? 'text-green-500'
            : runner.faceMatchScore <= 0.5 ? 'text-red-500'
              : 'text-yellow-500'
            }`}>
            {(runner.faceMatchScore * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {items?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {items.map((item, idx) => (
            <DocumentTag key={idx} label={typeof item === 'string' ? item : item.type} />
          ))}
        </div>
      )}
      {!items?.length && view === 'verified' && (
        <p className="mt-2 text-[10px] text-white/30">All verified</p>
      )}

      {!items?.length && view === 'verified' && runner.verifiedAt && (
        <p className="mt-2 text-[10px] text-white/30">
          Verified At: {new Date(runner.verifiedAt).toLocaleDateString()}
        </p>
      )}

      {!items?.length && view === 'autoConfirmed' && (
        <p className="mt-2 text-[10px] text-white/30">Prembly auto-confirmed</p>
      )}

      <Button onClick={onReview} variant="outline" size="sm" fullWidth leftIcon={<Eye size={12} />} className="mt-3">
        Review Runner
      </Button>
    </div>
  );
}