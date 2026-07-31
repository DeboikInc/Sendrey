import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@material-tailwind/react";
import BarLoader from "./BarLoader";

const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 60000,
};

const MAX_WATCH_DURATION = 15000;

export default function RequestLocation({
  darkMode,
  onLocationComplete,
  onCancel,
  locationError: externalError,
  isGettingLocation: externalLoading,
  onRetry: externalRetry,
}) {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const bestPositionRef = useRef(null);
  const watchIdRef = useRef(null);
  const watchTimerRef = useRef(null);
  const resolvedRef = useRef(false);

  const showError = externalError || locationError;
  const isLoading = externalLoading !== undefined ? externalLoading : isGettingLocation;

  const finaliseLocation = useCallback((errorCode = null) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimerRef.current !== null) {
      clearTimeout(watchTimerRef.current);
      watchTimerRef.current = null;
    }

    setIsGettingLocation(false);

    if (errorCode !== null) {
      switch (errorCode) {
        case 1:
          setLocationError(
            'Sendrey needs your location to connect you with nearby services. ' +
            'Please enable location access in your browser settings and try again.'
          );
          setLocationPermissionDenied(true);
          break;
        case 2:
          setLocationError(
            'Location information is unavailable. ' +
            'Please check your device settings and try again.'
          );
          break;
        case 3:
          if (!bestPositionRef.current) {
            setLocationError(
              'Location request timed out. ' +
              'Please check your connection and try again.'
            );
          }
          break;
        default:
          if (!bestPositionRef.current) {
            setLocationError(
              'An unknown error occurred while getting your location. ' +
              'Please try again.'
            );
          }
      }
    }

    if (bestPositionRef.current) {
      const coords = {
        latitude: bestPositionRef.current.latitude,
        longitude: bestPositionRef.current.longitude,
      };
      setLocation(coords);
      setLocationError(null);
      console.log(
        `[geo] Settled — accuracy: ${bestPositionRef.current.accuracy?.toFixed(1)}m`
      );
      if (onLocationComplete) {
        onLocationComplete(coords);
      }
    } else if (errorCode === null) {
      setLocationError(
        'Could not determine your location. ' +
        'Please check your device settings and try again.'
      );
    }
  }, [onLocationComplete]);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser. Please use a different browser.');
      setLocationPermissionDenied(true);
      return;
    }

    resolvedRef.current = false;
    bestPositionRef.current = null;
    setIsGettingLocation(true);
    setLocationError(null);
    setLocationPermissionDenied(false);
    setLocation(null);
    setIsRetrying(false);

    const onSuccess = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      bestPositionRef.current = { latitude, longitude, accuracy };
      finaliseLocation();
    };

    const onError = (err) => {
      console.warn(`[geo] Error (code ${err.code}): ${err.message}`);
      finaliseLocation(err.code);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      GEO_OPTIONS
    );

    watchTimerRef.current = setTimeout(() => {
      console.log('[geo] Watch duration exceeded — settling');
      finaliseLocation();
    }, MAX_WATCH_DURATION);
  }, [finaliseLocation]);

  const handleRetry = () => {
    if (externalRetry) {
      externalRetry();
    } else {
      setIsRetrying(true);
      requestLocation();
    }
  };

  const handleManualLocation = () => {
    if (!location) return;
    if (onLocationComplete) {
      onLocationComplete(location);
    }
  };

  useEffect(() => {
    requestLocation();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (watchTimerRef.current !== null) {
        clearTimeout(watchTimerRef.current);
        watchTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location && !isLoading && !showError) {
      const timer = setTimeout(() => {
        if (onLocationComplete) {
          onLocationComplete(location);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isLoading, showError]);

  return (
    <div className={`w-full h-full flex flex-col ${darkMode ? 'dark' : ''}`}>
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 flex items-center justify-center mb-6">
          {isLoading ? (
            <BarLoader size="small" />
          ) : showError ? (
            <AlertCircle className="w-10 h-10 text-red-500" />
          ) : (
            <MapPin className="w-10 h-10 text-primary" />
          )}
        </div>

        <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {isLoading ? 'Getting your location...' : showError ? 'Location Access Required' : 'Location Found!'}
        </h2>

        <p className={`text-sm mb-6 max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {isLoading ? (
            'Please allow location access to proceed.'
          ) : showError ? (
            showError
          ) : (
            `We found your location (${location?.latitude?.toFixed(6)}, ${location?.longitude?.toFixed(6)})`
          )}
        </p>

        {showError && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              onClick={handleRetry}
              disabled={isLoading || isRetrying}
              className="bg-primary rounded-lg text-white flex items-center justify-center gap-2"
            >
              {isLoading || isRetrying ? (
                <BarLoader size="small" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoading || isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>

            {locationPermissionDenied && (
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                If you've denied location access, please enable it in your browser settings.
              </p>
            )}
          </div>
        )}

        {location && !showError && !isLoading && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              onClick={handleManualLocation}
              className="bg-primary rounded-lg text-white"
            >
              Continue with this location
            </Button>
          </div>
        )}

        {onCancel && !isLoading && !(location && !showError) && (
          <button
            onClick={onCancel}
            className={`mt-4 text-sm ${darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}