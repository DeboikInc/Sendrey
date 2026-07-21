import useDarkMode from "../../hooks/useDarkMode";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingScreen from "../../components/screens/OnboardingScreen";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import PhoneVerificationPrompt from "../../components/common/PhoneVerificationPrompt";
import {
  register,
  verifyPhone, resendPhoneVerification, // eslint-disable-line no-unused-vars
  verifyEmailOTP,
  resendEmailVerification,
  sendReturningUserEmailOTP,
  // verifyReturningUserPhone,
  checkExistingUser
} from "../../Redux/authSlice";
import { authStorage } from '../../utils/authStorage';
import { useRedirectIfAuthenticated } from '../../hooks/useRedirectIfAuthenticated';

// Geolocation config
const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 60000,
};

const MAX_WATCH_DURATION = 20000;

export const Auth = () => {
  useRedirectIfAuthenticated();
  const [dark, setDark] = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const userType = location.state?.userType;
  const isFromEmail = location.state?.isFromEmail;
  const emailUser = location.state?.user;

  const [allErrors, setAllErrors] = useState([]);
  const [needsOtpVerification, setNeedsOtpVerification] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [pendingServiceType, setPendingServiceType] = useState(null); // eslint-disable-line no-unused-vars
  const [returningUser, setReturningUser] = useState(null);
  const [returningUserHasTerms, setReturningUserHasTerms] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isReturningUserSuccess, setIsReturningUserSuccess] = useState(false);

  const bestPositionRef = useRef(null);
  const watchIdRef = useRef(null);
  const watchTimerRef = useRef(null);
  const attemptCountRef = useRef(0);
  const resolvedRef = useRef(false);

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
            'Sendrey needs your location to connect you with nearby runners. ' +
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
      setUserLocation({
        latitude: bestPositionRef.current.latitude,
        longitude: bestPositionRef.current.longitude,
      });
      setLocationError(null);
      console.log(
        `[geo] Settled — accuracy: ${bestPositionRef.current.accuracy?.toFixed(1)}m`
      );
    } else if (errorCode === null) {
      setLocationError(
        'Could not determine your location. ' +
        'Please check your device settings and try again.'
      );
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser. Please use a different browser.');
      setLocationPermissionDenied(true);
      return;
    }

    resolvedRef.current = false;
    bestPositionRef.current = null;
    attemptCountRef.current = 0;

    setIsGettingLocation(true);
    setLocationError(null);
    setLocationPermissionDenied(false);
    setUserLocation(null);

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

    // Hard time cap — always resolve eventually
    watchTimerRef.current = setTimeout(() => {
      console.log('[geo] Watch duration exceeded — settling');
      finaliseLocation();
    }, MAX_WATCH_DURATION);
  }, [finaliseLocation]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetryLocation = () => {
    requestLocation();
  };

  // Error helpers
  const extractAllErrors = (error) => {
    const errors = [];

    if (Array.isArray(error)) {
      error.forEach(err => {
        const msg = err?.message || err || '';
        if (msg) errors.push(msg);
      });
    } else if (error && typeof error === 'object') {
      if (error.errors) {
        Object.values(error.errors).forEach(err => {
          const msg = err?.message || err || '';
          if (msg) errors.push(msg);
        });
      } else if (error.message) {
        errors.push(error.message);
      } else if (error.data?.message) {
        errors.push(error.data.message);
      }
    } else if (typeof error === 'string' && error) {
      errors.push(error);
    }

    // Replace raw network/technical errors with a friendly message
    const networkPatterns = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network|fetch|socket|SSL|certificate|ERR_|failed to fetch|load failed/i;

    return errors.map(msg =>
      networkPatterns.test(msg)
        ? 'Something went wrong. Please check your internet connection and try again.'
        : msg
    );
  };

  // Registration / OTP handlers
  const handleOnboardingComplete = async (data) => {
    if (data.otp && tempUserData) {
      try {
        const result = await dispatch(verifyEmailOTP({
          email: tempUserData.email,
          otp: data.otp,
          userType: 'user'
        })).unwrap();
        console.log('verifyEmailOTP result:', result);

        const user = result.user || result.data?.user;
        const hasAcceptedTerms = user?.termsAccepted?.version;

        if (returningUser) {
          setIsReturningUserSuccess(true);
          setReturningUserHasTerms(!!hasAcceptedTerms);
          if (hasAcceptedTerms) {
            setTimeout(() => navigate("/welcome", { replace: true }), 2500);
          }
        } else {
          if (hasAcceptedTerms) {
            navigate("/welcome", { replace: true });
          } else {
            setRegistrationSuccess(true);
          }
        }

        setNeedsOtpVerification(false);
        setAllErrors([]);
        setPendingServiceType(data.serviceType);
      } catch (error) {
        console.error("OTP verification failed:", error);
        setAllErrors(extractAllErrors(error));
      }
      return;
    }

    if (data.returningUserConfirmed && returningUser) {
      try {
        await dispatch(sendReturningUserEmailOTP({
          email: returningUser.email,
          userType: returningUser.userType || 'user'
        })).unwrap();
        setTempUserData({
          email: returningUser.email,
          phone: returningUser.phone,
          name: returningUser.name
        });
        setNeedsOtpVerification(true);
        setAllErrors([]);
      } catch (error) {
        setAllErrors(extractAllErrors(error));
      }
      return;
    }

    // New user registration
    const { name, phone, email } = data;
    const nameParts = name ? name.trim().split(" ") : [];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ");

    const payload = {
      role: userType || 'user',
      phone,
      email,
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(data.password && { password: data.password }),
    };

    console.log("Registration payload:", payload);

    try {
      const checkResult = await dispatch(checkExistingUser({
        email: payload.email,
        userType: userType || 'user'
      })).unwrap();

      if (checkResult.exists) {
        setReturningUser({
          name: checkResult.firstName,
          email: payload.email,
          phone: payload.phone,
          userType: userType || 'user',
          kycStatus: checkResult.kycStatus
        });
        setAllErrors([]);
        return;
      }
    } catch (error) {
      console.warn('User check failed, proceeding with registration:', error);
    }

    // proceed with reg
    try {
      const result = await dispatch(register(payload)).unwrap();

      const token = result.token;
      const refreshToken = result.refreshToken;
      if (token) await authStorage.setTokens(token, refreshToken);

      console.log('register result:', result);

      setTempUserData({ phone, name, email });
      setNeedsOtpVerification(true);
      setAllErrors([]);
    } catch (error) {
      console.error("Registration failed:", error);
      const raw = error?.errors
        ? Object.values(error.errors).map(e => e?.message || e).join(" ")
        : error?.message || error?.data?.message || String(error);

      const isAlreadyExists = error?.status === 409 || error?.statusCode === 409 ||
        /already exist|already registered/i.test(raw);

      if (isAlreadyExists) {
        // Race condition — user was created between check and register
        const existingName = error?.data?.userName || error?.userName || "";
        setReturningUser({
          name: existingName,
          email: payload.email,
          phone: payload.phone,
          userType: userType || 'user',
        });
        setAllErrors([]);
      } else {
        setAllErrors(extractAllErrors(error));
      }
    }
  };

  const handleResendOtp = async () => {
    // if (!tempUserData?.phone) return;
    if (!tempUserData?.email) return;
    try {
      // await dispatch(resendPhoneVerification({ phone: tempUserData.phone })).unwrap();
      if (returningUser) {
        await dispatch(sendReturningUserEmailOTP({
          email: tempUserData.email,
          userType: 'user'
        })).unwrap();
      } else {
        await dispatch(resendEmailVerification({
          email: tempUserData.email,
          userType: 'user'
        })).unwrap();
      }
    } catch (error) {
      setAllErrors(extractAllErrors(error));
    }
  };

  // Email link flow — user is logged in but not phone verified
  if (isFromEmail && emailUser) {
    return (
      <div className={`fixed inset-0 overflow-hidden ${dark ? "dark" : ""}`}>
        <div className="h-full w-full text-white">
          <PhoneVerificationPrompt
            user={emailUser}
            darkMode={dark}
            toggleDarkMode={() => setDark(!dark)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 overflow-hidden ${dark ? "dark" : ""}`}>
      <div className="h-full w-full text-white">
        <OnboardingScreen
          userType={userType}
          registrationSuccess={registrationSuccess}
          onComplete={handleOnboardingComplete}
          darkMode={dark}
          toggleDarkMode={() => setDark(!dark)}
          errors={allErrors}
          onErrorClose={() => setAllErrors([])}
          locationError={locationError}
          locationPermissionDenied={locationPermissionDenied}
          onRetryLocation={handleRetryLocation}
          isGettingLocation={isGettingLocation}

          userPhone={tempUserData?.phone}
          userEmail={tempUserData?.email}

          onResendOtp={handleResendOtp}
          needsOtpVerification={needsOtpVerification}
          returningUser={returningUser}
          onReturningUserConfirm={() => handleOnboardingComplete({ returningUserConfirmed: true })}
          onReturningUserDecline={() => setReturningUser(null)}
          isReturningUserSuccess={isReturningUserSuccess}
          returningUserName={returningUser?.name}
          setReturningUserHasTerms={returningUserHasTerms}
          showBack={false}
          onBack={() => navigate("/")}
          onTermsAccepted={(serviceType) => {
            navigate("/welcome", {
              state: { serviceType },
              replace: true
            });
          }}
        />
      </div>
    </div>
  );
};