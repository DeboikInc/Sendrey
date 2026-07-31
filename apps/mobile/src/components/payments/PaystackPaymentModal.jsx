import React, { useState } from "react";
import { X, Lock, ExternalLink } from "lucide-react";
import { PaystackButton } from "react-paystack";

export default function PaystackPaymentModal({
  reference,
  access_code,
  authorization_url,
  amount,
  email,
  darkMode,
  onSuccess,
  onCancel,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

  // Store the fallback data when component mounts
  const [fallbackData] = useState({
    access_code,
    authorization_url,
  });

  console.log('🔍 Modal mounted with:', { reference, access_code, authorization_url });

  if (!reference) {
    console.warn('🔍 No reference provided');
    return null;
  }

  if (!publicKey) {
    console.error('REACT_APP_PAYSTACK_PUBLIC_KEY is missing');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className={`${darkMode ? "bg-black-100" : "bg-white"} rounded-2xl shadow-xl w-full max-w-md p-6 text-center`}>
          <p className={darkMode ? "text-white" : "text-gray-900"}>
            Payment is temporarily unavailable. Please try again later.
          </p>
          <button onClick={onCancel} className="mt-4 py-2 px-4 rounded-lg bg-primary text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  const config = {
    reference,
    email,
    amount: Math.round(amount * 100),
    publicKey,
    metadata: {
      custom_fields: [
        { display_name: "Wallet Funding", variable_name: "type", value: "wallet_funding" }
      ]
    },
  };

  const handleSuccess = (reference) => {
    console.log('🔍 Payment successful:', reference);
    setIsProcessing(false);
    onSuccess(reference);
  };

  const handleClose = () => {
    console.log('🔍 Paystack popup closed');
    console.log('🔍 Fallback data available:', !!fallbackData.access_code);
    setIsProcessing(false);
    
    // If we have fallback data, show fallback option
    if (fallbackData.access_code || fallbackData.authorization_url) {
      setShowFallback(true);
    } else {
      // If no fallback, just close
      console.warn('🔍 No fallback URL available');
      onCancel();
    }
  };

  const handleOpenFallback = () => {
    console.log('🔍 Opening fallback payment page');
    const url = fallbackData.authorization_url || 
                (fallbackData.access_code ? `https://checkout.paystack.com/${fallbackData.access_code}` : null);
    
    console.log('🔍 Fallback URL:', url);
    
    if (url) {
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Popup was blocked
        setPopupBlocked(true);
      } else {
        setShowFallback(false);
        // Close the modal after opening fallback
        setTimeout(() => onCancel(), 1000);
      }
    } else {
      console.error('🔍 No fallback URL available');
      alert('Unable to open payment page. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className={`${darkMode ? "bg-black-100" : "bg-white"} rounded-2xl shadow-xl w-full max-w-md p-6`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`text-base font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {showFallback ? "Complete Payment" : "Card Payment"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fund Your Wallet</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="text-center pb-4 mb-4 border-b dark:border-gray-700 border-gray-200">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount to Pay</p>
          <p className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            ₦{Number(amount).toLocaleString()}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Email</span>
            <span className="text-gray-900 dark:text-white font-medium">{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Reference</span>
            <span className="text-gray-900 dark:text-white font-medium text-xs truncate max-w-[150px]">{reference}</span>
          </div>
        </div>

        {popupBlocked && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Popup was blocked. Please allow popups for this site or use the button below.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className={`flex-1 py-3 rounded-lg border text-sm font-medium transition disabled:opacity-50
              ${darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
          >
            Cancel
          </button>

          {showFallback ? (
            <button
              onClick={handleOpenFallback}
              className="flex-1 py-3 rounded-lg bg-primary text-white text-sm font-medium transition hover:opacity-90 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Payment Page
            </button>
          ) : (
            <PaystackButton
              {...config}
              text={`Pay ₦${Number(amount).toLocaleString()}`}
              onSuccess={handleSuccess}
              onClose={handleClose}
              className="flex-1 py-3 rounded-lg bg-primary text-white text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90"
              disabled={isProcessing}
            />
          )}
        </div>

        {showFallback && (
          <p className="text-xs text-center text-amber-500 mt-3">
            Payment popup was closed. Click "Open Payment Page" to continue.
          </p>
        )}

        <p className="text-xs text-center text-gray-400 mt-4 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Secured by Paystack
        </p>
      </div>
    </div>
  );
}