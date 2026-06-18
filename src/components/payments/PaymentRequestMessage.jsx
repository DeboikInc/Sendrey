import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Loader } from 'lucide-react';

const PaymentRequestMessage = ({
  paymentData,
  alreadyPaid,
  message,
  onPayment,
  darkMode,
  resetRef,
  markPaidRef,
  orderCancelled,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [waitingForPin, setWaitingForPin] = useState(false);

  const data = paymentData || message?.paymentData || {};

  const handlePayment = async (method) => {
    if (isProcessing || waitingForPin) return;

    if (method === 'wallet') {
      setWaitingForPin(true);
    } else {
      setIsProcessing(true);
    }

    setPaymentMethod(method);

    try {
      const result = await onPayment(data, method);
      if (result === false) {
        setIsProcessing(false);
        setWaitingForPin(false);
        setPaymentMethod(null);
      } else if (result === 'pending') {
        setIsProcessing(false);
      } else if (result === true) {
        setIsProcessing(false);
        setWaitingForPin(false);
        setPaymentMethod(null);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setIsProcessing(false);
      setWaitingForPin(false);
      setPaymentMethod(null);
    }
  };

  useEffect(() => {
    if (resetRef) {
      resetRef.current = () => {
        setWaitingForPin(false);
        setIsProcessing(false);
        setPaymentMethod(null);
      };
    }
  }, [resetRef]);

  useEffect(() => {
    if (markPaidRef) {
      markPaidRef.current = () => {
        setIsProcessing(false);
        setWaitingForPin(false);
        setPaymentMethod(null);
      };
    }
  }, [markPaidRef]);

  return (
    <div className="flex justify-center my-4 px-4">
      <div className={`max-w-md w-full rounded-2xl shadow-lg border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${darkMode ? 'bg-primary' : 'bg-primary/20'}`}>
            <Wallet className="w-8 h-8 text-secondary" />
          </div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Payment Required
          </h3>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Complete payment to start your order
          </p>
        </div>

        {/* Breakdown */}
        <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Payment Breakdown
          </h4>
          <div className="space-y-2">
            {(data.serviceType === 'run-errand' || data.serviceType === 'run_errand') && (
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Item Budget</span>
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>₦{Number(data.itemBudget || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delivery Fee</span>
              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>₦{Number(data.deliveryFee || 0).toLocaleString()}</span>
            </div>
            <div className={`pt-2 mt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex justify-between">
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                <span className="text-lg font-bold text-secondary">₦{Number(data.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        {orderCancelled ? (
          <div className="space-y-3">
            <button disabled className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold bg-gray-400 opacity-50 cursor-not-allowed text-white">
              <Wallet className="w-5 h-5" />
              Pay via Wallet
            </button>
            <button disabled className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border-2 border-gray-300'}`}>
              <CreditCard className="w-5 h-5" />
              Pay with Card
            </button>
          </div>
        ) : isProcessing || waitingForPin ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader className="w-8 h-8 animate-spin mb-3 text-secondary" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {waitingForPin ? 'Processing...' : `Processing via ${paymentMethod === 'wallet' ? 'Wallet' : 'Card'}...`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handlePayment('wallet')}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-5 h-5" />
              Pay via Wallet
            </button>
            <button
              onClick={() => handlePayment('card')}
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300'}`}
            >
              <CreditCard className="w-5 h-5" />
              Pay with Card
            </button>
          </div>
        )}

        <p className={`text-xs text-center mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Your payment is secure and protected
        </p>
      </div>
    </div>
  );
};

export default PaymentRequestMessage;