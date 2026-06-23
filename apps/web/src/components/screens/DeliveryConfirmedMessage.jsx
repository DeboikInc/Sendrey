import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

const DeliveryConfirmedMessage = ({ message, darkMode, isAutoConfirmed = false }) => {
  if (isAutoConfirmed) {
    return (
      <div className="flex justify-center my-4 px-4">
        <div className={`max-w-md w-full rounded-2xl shadow-lg border ${
          darkMode ? 'bg-black-100 border-black-200' : 'bg-white border-gray-100'
        } p-6`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
                Auto-Confirmed
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This order was automatically completed after no response
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-4 px-4">
      <div className={`max-w-md w-full rounded-2xl shadow-lg border ${
        darkMode ? 'bg-black-100 border-black-200' : 'bg-white border-gray-100'
      } p-6`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
              Delivery Confirmed
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {message.text || 'Delivery has been confirmed'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryConfirmedMessage;