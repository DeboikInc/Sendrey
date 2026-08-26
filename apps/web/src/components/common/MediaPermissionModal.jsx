// components/common/MediaPermissionModal.jsx
import React from 'react';
import { Button } from '@material-tailwind/react';

function detectBrowser() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);

  if (isIOS && isSafari) return 'ios-safari';
  if (isIOS) return 'ios-other';
  if (isAndroid && isChrome) return 'android-chrome';
  if (isAndroid) return 'android-other';
  return 'desktop';
}

const MEDIA_LABELS = { camera: 'camera', audio: 'microphone', video: 'camera and microphone' };

const DENIED_INSTRUCTIONS = {
  'ios-safari': {
    camera: 'Go to Settings → Safari → Camera, and set it to Allow. Then come back and try again.',
    audio: 'Go to Settings → Safari → Microphone, and set it to Allow. Then come back and try again.',
    video: 'Go to Settings → Safari → Camera and Microphone, and set both to Allow. Then come back and try again.',
  },
  'android-chrome': {
    camera: 'Tap the lock icon in the address bar → Permissions → Camera, and set it to Allow.',
    audio: 'Tap the lock icon in the address bar → Permissions → Microphone, and set it to Allow.',
    video: 'Tap the lock icon in the address bar → Permissions, and allow both Camera and Microphone.',
  },
  desktop: {
    camera: "Click the camera icon in your browser's address bar and allow access, then try again.",
    audio: "Click the lock/info icon in your browser's address bar, allow microphone access, then try again.",
    video: 'Click the lock/info icon in your address bar and allow both camera and microphone access.',
  },
  'ios-other': { default: 'Please check your browser or app settings and allow access for this site, then try again.' },
  'android-other': { default: 'Please check your browser settings and allow access for this site, then try again.' },
};

const REASON_COPY = {
  denied: {
    title: 'Permission needed',
    body: (mediaType, browser) => {
      const label = MEDIA_LABELS[mediaType] || 'camera';
      const instr = DENIED_INSTRUCTIONS[browser]?.[mediaType] || DENIED_INSTRUCTIONS[browser]?.default || DENIED_INSTRUCTIONS.desktop[mediaType];
      return `We need access to your ${label} to continue. ${instr}`;
    },
  },
  no_device: {
    title: 'No device found',
    body: (mediaType) => `We couldn't find a working ${MEDIA_LABELS[mediaType] || 'camera'} on this device.`,
  },
  in_use: {
    title: 'Device busy',
    body: (mediaType) => `Your ${MEDIA_LABELS[mediaType] || 'camera'} seems to be in use by another app or tab. Close it and try again.`,
  },
  insecure_context: {
    title: 'Connection not secure',
    body: () => `This feature needs a secure (https) connection.`,
  },
  unknown: {
    title: 'Something went wrong',
    body: (mediaType) => `We couldn't access your ${MEDIA_LABELS[mediaType] || 'camera'}. Check your device settings and try again.`,
  },
};

export default function MediaPermissionModal({ mediaType, reason, onRetry, onDismiss }) {
  const browser = detectBrowser();
  const copy = REASON_COPY[reason] || REASON_COPY.unknown;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-white dark:bg-black-100 p-6">
        <h3 className="text-lg font-bold mb-2 dark:text-white">{copy.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{copy.body(mediaType, browser)}</p>

        {mediaType === 'camera' && reason === 'denied' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You can also tap "Upload a File" to pick a photo from your gallery instead.
          </p>
        )}

        <div className="flex gap-3">
          <Button onClick={onDismiss} className="flex-1 bg-gray-200 text-black-100 rounded-lg">Close</Button>
          <Button onClick={onRetry} className="flex-1 bg-primary rounded-lg">Try Again</Button>
        </div>
      </div>
    </div>
  );
}