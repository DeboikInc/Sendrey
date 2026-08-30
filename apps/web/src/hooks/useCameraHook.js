import { useState, useRef } from 'react';

export const useCameraHook = (requestMediaAccess) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const openCamera = async () => {
    try {
      setCapturedImage(null);
      setIsPreviewOpen(false);
      setCameraOpen(true);

      // wait ...
      await new Promise(resolve => requestAnimationFrame(resolve));

      if (!videoRef.current) {
        console.error('❌ Video element not found after waiting!');
        setCameraOpen(false);
        return;
      }

      const stream = await requestMediaAccess('camera', {
        constraints: { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } }
      });

      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        setCameraOpen(false);
        return;
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        if (!videoRef.current) { resolve(); return; }
        videoRef.current.onloadedmetadata = async () => {
          if (videoRef.current) {
            try { await videoRef.current.play(); } catch (playError) {
              console.error('❌ Play error:', playError);
            }
          }
          resolve();
        };
      });

    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      setCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCapturedImage(null);
    setIsPreviewOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) { console.error('❌ No video ref'); return; }

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      console.error('❌ Video dimensions are 0');
      return; // caller can show its own "camera not ready, wait a moment" message if desired
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsPreviewOpen(true);
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    setIsPreviewOpen(false);
    await openCamera();
  };

  const openPreview = () => setIsPreviewOpen(true);
  const closePreview = () => setIsPreviewOpen(false);

  const confirmPhoto = () => {
    if (capturedImage) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCameraOpen(false);
      setIsPreviewOpen(false);
      const photo = capturedImage;
      setCapturedImage(null);
      return photo;
    }
    return null;
  };

  const switchCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await requestMediaAccess('camera', {
        constraints: { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } }
      });

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = async () => {
          try { await videoRef.current.play(); } catch (_) { }
          resolve();
        };
      });
    } catch (err) {
      console.error('Switch camera error:', err);
    }
  };

  return {
    cameraOpen, capturedImage, videoRef, isPreviewOpen, facingMode,
    switchCamera, openCamera, closeCamera, capturePhoto, retakePhoto,
    confirmPhoto, setIsPreviewOpen, openPreview, closePreview,
  };
};