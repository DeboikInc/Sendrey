import React, { useState, useEffect } from 'react';
import { Package, Clock } from 'lucide-react';

const DeliveryConfirmationMessage = ({ message, darkMode, onConfirm, onDeny, socket }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const { orderId, deliveryProof, runnerName } = message;

  const displayName = runnerName || 'Runner';

  // Only listen for auto-confirm — confirmed/denied are handled by separate message types
  useEffect(() => {
    if (!socket || !orderId) return;

    const onAutoConfirmed = ({ orderId: incoming }) => {
      if (incoming !== orderId) return;
      setIsConfirming(false);
      setIsDenying(false);
    };

    socket.on('deliveryAutoConfirmed', onAutoConfirmed);
    return () => socket.off('deliveryAutoConfirmed', onAutoConfirmed);
  }, [socket, orderId]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(orderId);
    } catch (error) {
      console.error('Error confirming delivery:', error);
      setIsConfirming(false);
    }
  };

  const handleDeny = async () => {
    setIsDenying(true);
    try {
      await onDeny(orderId);
    } catch (error) {
      console.error('Error denying delivery:', error);
      setIsDenying(false);
    }
  };

  return (
    <div className="flex justify-center my-4 px-4">
      <div className={`max-w-md w-full rounded-2xl shadow-lg border ${
        darkMode ? 'bg-black-100 border-black-200' : 'bg-white border-gray-100'
      } p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
              Confirm Delivery
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {displayName} has marked your order as delivered
            </p>
          </div>
        </div>

        {deliveryProof && (
          <div className="mb-4">
            <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Delivery Photo
            </p>
            <img
              src={deliveryProof}
              alt="Delivery proof"
              className="w-full rounded-xl object-cover max-h-48 cursor-pointer hover:opacity-90"
              onClick={() => window.open(deliveryProof, '_blank')}
            />
          </div>
        )}

        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${
          darkMode ? 'bg-black-200' : 'bg-gray-50'
        }`}>
          <Clock className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Order will be auto-confirmed in 4 hours if no action is taken
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            disabled={isDenying || isConfirming}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 ${
              isDenying || isConfirming ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDenying ? 'Denying...' : 'Deny'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || isDenying}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all bg-primary text-white hover:opacity-90 ${
              isConfirming || isDenying ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isConfirming ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryConfirmationMessage;