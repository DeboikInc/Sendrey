// src/components/kyc/StatusIndicator.jsx
export default function StatusIndicator({ status }) {
  const statusConfig = {
    pending_verification: { 
      label: 'Pending', 
      className: 'text-primary bg-primary/10 border-primary/20' 
    },
    approved_full: { 
      label: 'Approved', 
      className: 'text-green-600 bg-green-50 border-green-200' 
    },
    approved_limited: { 
      label: 'Ltd. Approved', 
      className: 'text-blue-600 bg-blue-50 border-blue-200' 
    },
    rejected: { 
      label: 'Rejected', 
      className: 'text-red-600 bg-red-50 border-red-200' 
    },
    banned: { 
      label: 'Banned', 
      className: 'text-red-600 bg-red-50 border-red-200' 
    },
  };
  
  const config = statusConfig[status] || { 
    label: status ?? 'Unknown', 
    className: 'text-gray-500 bg-gray-100 border-gray-300' 
  };
  
  return (
    <span className={`inline-flex items-center text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border ${config.className}`}>
      {config.label}
    </span>
  );
}