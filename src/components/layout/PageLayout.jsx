// src/components/layout/PageLayout.jsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

const PageLayout = ({ 
  title, 
  icon: Icon, 
  description, 
  children,
  stats = [],
  onRefresh,
  isRefreshing = false,
  headerAction,
  toolbar, // Pass toolbar directly as a prop instead of checking children.props
  className = ''
}) => {
  return (
    <div className={`flex-1 flex flex-col overflow-hidden bg-secondary/30 h-full ${className}`}>
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
              {Icon && <Icon size={20} className="text-primary" />}
              {title}
            </h1>
            <p className="text-white/40 text-xs mt-0.5">
              {description}
            </p>
          </div>
          
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />}
              disabled={isRefreshing}
              className="shrink-0"
            >
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          )}
          
          {headerAction && headerAction}
        </div>

        {/* Stats Pills */}
        {stats.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${stat.bgClass || 'bg-primary/10'} border ${stat.borderClass || 'border-primary/20'}`}
              >
                {stat.icon && <stat.icon size={11} className={stat.iconClass || 'text-primary'} />}
                <span className={`text-[10px] font-bold ${stat.textClass || 'text-primary'}`}>
                  {stat.label}: {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Toolbar - Now passed as a separate prop */}
      {toolbar && (
        <div className="px-4 sm:px-6 py-3 border-b border-white/5 shrink-0">
          {toolbar}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;