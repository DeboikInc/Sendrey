// components/common/OrderPendingModal.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function OrderPendingModal({ isOpen, onLeave, darkMode, userType = 'user' }) {
  if (!isOpen) return null;

  const isRunner = userType === 'runner';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4">
      <div className={`w-full max-w-sm rounded-2xl p-6 ${darkMode ? 'bg-black-100 text-white' : 'bg-white text-black-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="font-bold text-lg">Session could not start</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          {isRunner
            ? "We couldn't set up this task in time. Please go back and wait for a new request."
            : "We couldn't set up this order in time. No payment can be made in this session. Please go back and try starting again."}
        </p>
        <button
          onClick={onLeave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-primary hover:opacity-90 transition-all"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}