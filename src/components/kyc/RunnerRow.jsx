// src/components/kyc/RunnerRow.jsx
import { Eye } from 'lucide-react';
import Button from '../ui/Button';
import StatusIndicator from './StatusIndicator';
import DocumentTag from './DocumentTag';

export default function RunnerRow({ runner, view, onReview }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {runner.firstName?.[0]}{runner.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm text-white/80 font-medium">
              {runner.firstName} {runner.lastName}
            </p>
            <p className="text-[9px] text-white/30 mt-0.5 font-mono">{runner._id?.slice(-10)}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <p className="text-xs text-white/60">{runner.email}</p>
        <p className="text-[10px] text-white/30 mt-0.5">{runner.phone}</p>
      </td>
      <td className="px-5 py-3.5">
        {runner.pendingItems?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {runner.pendingItems.map((item, idx) => <DocumentTag key={idx} label={item} />)}
          </div>
        ) : (
          <span className="text-[10px] text-white/30">
            {view === 'verified' ? 'All verified' : '—'}
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <StatusIndicator status={runner.runnerStatus} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <Button
          onClick={onReview}
          variant="outline"
          size="xs"
          leftIcon={<Eye size={11} />}
        >
          Review
        </Button>
      </td>
    </tr>
  );
}