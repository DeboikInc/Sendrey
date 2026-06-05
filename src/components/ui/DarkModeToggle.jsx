// src/components/ui/DarkModeToggle.jsx
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import Button from './Button';

const DarkModeToggle = ({ className = '', variant = 'ghost', size = 'sm' }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <Button
      onClick={toggleDarkMode}
      variant={variant}
      size={size}
      className={className}
      leftIcon={isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
    >
      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
    </Button>
  );
};

export default DarkModeToggle;