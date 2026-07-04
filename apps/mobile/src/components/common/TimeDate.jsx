import { useState, useEffect, useCallback } from 'react';

const TimeDate = ({
  timestamp,
  format = 'absolute',
  className = '',
  updateInterval = 60000,
}) => {
  const [displayText, setDisplayText] = useState('');

  const formatTime = useCallback((date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatDate = useCallback((date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
  }, []);

  const getRelativeTime = useCallback((date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
    }
    if (diffHour > 0) {
      return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffMin > 0) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffSec > 10) {
      return `${diffSec} seconds ago`;
    }
    return 'Just now';
  }, []);

  const updateDisplay = useCallback(() => {
    if (!timestamp) return;

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return;

    let text = '';

    if (format === 'absolute') {
      text = formatTime(date);
    } else if (format === 'full') {
      text = `${formatDate(date)} at ${formatTime(date)}`;
    } else {
      const now = new Date();
      const diffHours = (now - date) / (1000 * 60 * 60);

      if (diffHours > 12) {
        text = `${formatDate(date)}, ${formatTime(date)}`;
      } else if (diffHours > 1) {
        text = getRelativeTime(date);
      } else {
        text = formatTime(date);
      }
    }

    setDisplayText(text);
  }, [timestamp, format, formatTime, formatDate, getRelativeTime]);

  useEffect(() => {
    updateDisplay();
    const interval = setInterval(updateDisplay, updateInterval);
    return () => clearInterval(interval);
  }, [updateDisplay, updateInterval]);

  if (!timestamp) return null;

  return <span className={className}>{displayText}</span>;
};

export default TimeDate;