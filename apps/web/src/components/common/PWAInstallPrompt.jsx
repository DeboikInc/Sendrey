// src/components/PWAInstallPrompt.jsx
import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-black-100 shadow-lg z-50">
      <div className="max-w-md mx-auto">
        <p className="text-sm mb-2">Install Sendrey for a better experience</p>
        <button
          onClick={handleInstall}
          className="w-full bg-primary text-white py-2 rounded-lg"
        >
          Install App
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="w-full text-secondary text-sm mt-2"
        >
          Not now
        </button>
      </div>
    </div>
  );
}