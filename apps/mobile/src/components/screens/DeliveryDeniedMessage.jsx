import React from 'react';
import { XCircle } from 'lucide-react';

const DeliveryDeniedMessage = ({ message, darkMode }) => {
  return (
    <div className="flex justify-center my-4 px-4">
      <div className={`max-w-md w-full rounded-2xl shadow-lg border ${
        darkMode ? 'bg-black-100 border-black-200' : 'bg-white border-gray-100'
      } p-6`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
              Delivery Denied
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {message.text || 'You reported that this delivery was not completed'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDeniedMessage;