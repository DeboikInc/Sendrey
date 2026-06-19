import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function PaymentReceipt({ paymentData, darkMode }) {
  const data = paymentData || {};
  const { itemBudget = 0, deliveryFee = 0, totalAmount = 0, serviceType = '' } = data;
  const isRunErrand = serviceType === 'run-errand' || serviceType === 'run_errand';
  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="flex justify-center my-4 px-4">
      <div className={`max-w-md w-full rounded-2xl shadow-lg border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
            <CheckCircle className={`w-8 h-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Payment Complete
          </h3>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your task is funded and active
          </p>
        </div>

        {/* Breakdown */}
        <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Payment Breakdown
          </h4>
          <div className="space-y-2">
            {isRunErrand && (
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Item Budget</span>
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>₦{fmt(itemBudget)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delivery Fee</span>
              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>₦{fmt(deliveryFee)}</span>
            </div>
            <div className={`pt-2 mt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex justify-between">
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                <span className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  ₦{fmt(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Paid badge */}
        <div className={`flex items-center justify-center gap-2 py-3 rounded-xl ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Paid</span>
        </div>

        <p className={`text-xs text-center mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Your payment is secure and protected
        </p>
      </div>
    </div>
  );
}