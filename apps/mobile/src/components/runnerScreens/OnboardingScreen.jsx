/* eslint-disable react-hooks/exhaustive-deps */
// components/runnerScreens/OnboardingScreen.jsx - Clean Mobile-First
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, Button } from "@material-tailwind/react";
import Message from "../common/Message";
import ChatComposer from "./chatComposer";
import sendreyBot from "../../assets/sendrey_bot.jpg";
import { FaWalking, FaMotorcycle } from "react-icons/fa";
import { Bike, Car, Truck, RefreshCw, Sun, Moon } from "lucide-react";
import { useCameraHook } from "../../hooks/useCameraHook";
import { returningUserNeedsKycPoll } from '../../utils/returningUserKycUtils';
import RunnerNotifications from "./RunnerNotifications";
import OnboardingProgress, { getOnboardingStageIndex } from "./OnboardingProgress";
import "../../OnboardingScreen.css";

const FLEET_OPTIONS = [
  { type: "cycling", icon: Bike, label: "Cycling" },
  { type: "car", icon: Car, label: "Car" },
  { type: "van", icon: Truck, label: "Van" },
  { type: "pedestrian", icon: FaWalking, label: "Pedestrian" },
  { type: "bike", icon: FaMotorcycle, label: "Bike" },
];

const getCurrentTime = () => {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function OnboardingScreen({
  initialMessages,
  onMessagesChange,
  onRegisterSetMessages,
  active,
  text, setText,
  dark, setDark,
  isCollectingCredentials,
  credentialStep,
  credentialQuestions,
  needsOtpVerification,
  registrationComplete,
  canResendOtp,
  send,
  handleMessageClick,
  pickUp,
  runErrand,
  setDrawerOpen,
  setInfoOpen,
  initialMessagesComplete,
  runnerId,
  kycStep, kycStatus,
  onIdVerified, handleIDTypeSelection, onSelfieVerified,
  handleSelfieResponse, checkVerificationStatus,
  onConnectToService,
  nearbyUsers, onPickService,
  socket, isConnected, reconnect,
  runnerData,
  canShowNotifications,
  hasSearched,
  replyingTo, setReplyingTo,
  currentOrder,
  verificationState,
  isConnectLocked,
  handleCredentialAnswer,
  runnerLocation,
  onFindMore,
  onStartNewOrder,
  onNewOrderFleetAndServiceSelected,
  newOrderTrigger,
  newOrderComplete,
  onSetNewOrderComplete,
  botRefreshTrigger,
  onBannedDetected,
  isVerified,
  isReturningUser,
  onReturningUserChoice,
  returningUserData,
  isVerifyingOtp,
  effectiveReturningKycStatus,
  onTrainingContinueClick,
  isTrainingCompleted,
  onKycRedirect,
  forceShowNotifications,
  onNotificationsShown
}) {
  const listRef = useRef(null);
  const connectMessageSentRef = useRef(false);
  const onMessagesChangeRef = useRef(onMessagesChange);
  const kycPollStartedRef = useRef(false);
  const isSyncingFromParent = useRef(false);
  const mountedRef = useRef(true);
  const isMountedSyncRef = useRef(false);

  const [messages, setMessages] = useState(initialMessages || []);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSubmitting] = useState(false);
  const [isUpdatingServer] = useState(false);

  const syncedNewOrderComplete = newOrderComplete;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!botRefreshTrigger) return;
    setMessages(prev => [...prev]);
  }, [botRefreshTrigger]);

  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  useEffect(() => {
    if (!onRegisterSetMessages) return;

    const pushFromParent = (updater) => {
      isSyncingFromParent.current = true;
      setMessages(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      });
      queueMicrotask(() => { isSyncingFromParent.current = false; });
    };

    onRegisterSetMessages(pushFromParent, 'sendrey-bot');
  }, [onRegisterSetMessages]);

  const setMessagesAndSync = useCallback((updater) => {
    setMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (!isMountedSyncRef.current) return next;

      if (!isSyncingFromParent.current && onMessagesChangeRef.current && mountedRef.current) {
        queueMicrotask(() => {
          if (mountedRef.current) onMessagesChangeRef.current(next);
        });
      }

      return next;
    });
  }, []);

  useEffect(() => {
    isMountedSyncRef.current = true;
  }, []);

  const { cameraOpen, capturedImage, videoRef, openCamera, closeCamera,
    capturePhoto, retakePhoto, confirmPhoto, switchCamera } = useCameraHook();

  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      const t = setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [messages, replyingTo]);

  useEffect(() => {
    if (!registrationComplete) return;
    if (!runnerId) return;
    if (kycStatus.overallVerified) return;
    if (kycStep === 6) return;
    if (kycPollStartedRef.current) return;
    if (typeof checkVerificationStatus !== 'function') return;

    if (!returningUserNeedsKycPoll(returningUserData, kycStatus)) {
      return;
    }

    const handleBanned = () => onBannedDetected?.();
    const isReturning = !!returningUserData?.kycStatus;

    kycPollStartedRef.current = true;
    checkVerificationStatus(setMessagesAndSync, handleBanned, isReturning);

    const interval = setInterval(() => {
      if (!registrationComplete) { clearInterval(interval); return; }
      checkVerificationStatus(setMessagesAndSync, handleBanned, isReturning);
    }, 30000);

    return () => {
      clearInterval(interval);
      kycPollStartedRef.current = false;
    };
  }, [registrationComplete, kycStatus.overallVerified, kycStep, runnerId, returningUserData]);

  useEffect(() => {
    if (kycStep === null) {
      kycPollStartedRef.current = false;
    }
  }, [kycStep]);

  const lastNewOrderTriggerRef = useRef(newOrderTrigger);
  useEffect(() => {
    if (newOrderTrigger === 0) return;
    if (newOrderTrigger === lastNewOrderTriggerRef.current) return;
    lastNewOrderTriggerRef.current = newOrderTrigger;
    connectMessageSentRef.current = false;
    onSetNewOrderComplete(true);
  }, [newOrderTrigger]);

  useEffect(() => {
    if (forceShowNotifications && nearbyUsers?.length > 0) {
      setShowNotifications(true);
    }
  }, [forceShowNotifications, nearbyUsers]);

  const handleConnectToService = () => {
    if (!connectMessageSentRef.current) {
      connectMessageSentRef.current = true;
    }
    setShowNotifications(true);
    onConnectToService?.();
  };

  const handleCancelConnect = () => {
    connectMessageSentRef.current = false;
    setMessagesAndSync(prev => [...prev, {
      id: Date.now(), from: "me", text: "Cancel",
      time: getCurrentTime(),
      status: "sent",
    }]);
    setTimeout(() => {
      setMessagesAndSync(prev => [...prev, {
        id: Date.now() + 100, from: "them",
        text: "Okay, let me know when you're ready to connect!",
        time: getCurrentTime(), status: "delivered",
      }]);
    }, 500);
  };

  const handlePickServiceFromNotification = (user, specialInstructions, order) => {
    setShowNotifications(false);
    onNotificationsShown?.();
    onPickService?.(user, specialInstructions, order);
  };

  const stageIndex = getOnboardingStageIndex({
    registrationComplete,
    isTrainingCompleted,
    isVerified,
    kycStep,
  });

  const showFleet = isCollectingCredentials &&
    credentialStep !== null &&
    credentialQuestions[credentialStep]?.isFleetSelection &&
    !isSubmitting;

  return (
    <div className="onboarding-container bg-gray-100 dark:bg-black-200">
      {/* Header */}
      <div className="onboarding-header px-3 py-2 sm:px-5 sm:py-3 lg:px-8 lg:py-4 border-b dark:border-white/10 border-gray-200 flex items-center justify-between bg-white/5/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
          <Avatar
            src={sendreyBot}
            alt="Sendrey Bot"
            size="sm"
            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex-shrink-0"
          />
          <div className="truncate min-w-0">
            <div className="font-bold text-sm sm:text-[16px] lg:text-lg truncate dark:text-white text-black-200">
              Sendrey Assistant
            </div>
            <div className="text-xs sm:text-sm lg:text-base font-medium text-black-100/70 dark:text-gray-400">
              Online
            </div>
          </div>
        </div>
        <div className="hidden sm:flex">
          <div
            onClick={() => setDark(!dark)}
            className="cursor-pointer bg-gray-900 dark:bg-gray-100/60 rounded-full w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center hover:scale-105 transition-transform"
          >
            {dark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" strokeWidth={3.0} />}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="onboarding-progress">
        <OnboardingProgress stageIndex={stageIndex} darkMode={dark} />
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="onboarding-messages px-2 sm:px-3 md:px-6 lg:px-8 py-2 sm:py-4 lg:py-6 bg-chat-pattern bg-gray-100 dark:bg-black-200 scrollbar-hide scroll-smooth"
      >
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {messages.map((m) => (
            <Message
              key={m.id}
              m={m}
              canResendOtp={registrationComplete ? false : canResendOtp}
              isActiveResend={registrationComplete ? false : canResendOtp}
              onMessageClick={() => handleMessageClick(m)}
              onTrainingContinueClick={onTrainingContinueClick}
              isTrainingCompleted={isTrainingCompleted}
              showCursor={false}
              showStatusIcons={false}
              userType="runner"
              disableContextMenu={true}
            />
          ))}
        </div>
      </div>

      {/* Fleet Selection */}
      {showFleet && (
        <div className="onboarding-fleet bg-gray-100 dark:bg-black-200">
          {FLEET_OPTIONS.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant="outlined"
              className="flex flex-col p-1.5 sm:p-3 lg:p-4 justify-center items-center text-black-100/60 dark:text-gray-400 min-w-[50px] sm:min-w-[70px] lg:min-w-[90px] hover:scale-105 transition-transform"
              onClick={() => handleCredentialAnswer(type, setText, setMessagesAndSync)}
            >
              <Icon className="text-xl sm:text-2xl lg:text-3xl" />
              <span className="text-[8px] sm:text-[10px] lg:text-xs capitalize mt-1">{label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Composer - NO background, NO extra space */}
      {!(isCollectingCredentials && !isSubmitting && credentialStep !== null && credentialQuestions[credentialStep]?.isFleetSelection) && (
        <div className="onboarding-composer-wrapper bg-gray-100 dark:bg-black-200">
          <ChatComposer
            isCollectingCredentials={isCollectingCredentials}
            credentialStep={credentialStep}
            credentialQuestions={credentialQuestions}
            needsOtpVerification={needsOtpVerification}
            registrationComplete={registrationComplete}
            effectiveReturningKycStatus={effectiveReturningKycStatus}
            isSubmitting={isSubmitting}
            isVerifyingOtp={isVerifyingOtp}
            kycStatus={kycStatus}
            isReturningUser={isReturningUser}
            returningUserData={returningUserData}
            onReturningUserChoice={onReturningUserChoice}
            isVerified={isVerified}
            isChatActive={false}
            kycStep={kycStep}
            initialMessagesComplete={initialMessagesComplete}
            text={text}
            setText={setText}
            pickUp={pickUp}
            runErrand={runErrand}
            send={() => send(replyingTo)}
            openCamera={openCamera}
            handleIDTypeSelection={handleIDTypeSelection}
            handleSelfieResponse={handleSelfieResponse}
            handleConnectToService={handleConnectToService}
            handleCancelConnect={handleCancelConnect}
            setMessages={setMessagesAndSync}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            darkMode={dark}
            verificationState={verificationState}
            isConnectLocked={isConnectLocked}
            onKycFileUpload={(imageData) => onIdVerified(imageData, setMessagesAndSync)}
            newOrderComplete={syncedNewOrderComplete}
            isUpdatingServer={isUpdatingServer}
            isTrainingCompleted={isTrainingCompleted}
            onTrainingContinueClick={onTrainingContinueClick}
            onKycRedirect={onKycRedirect}
          />
        </div>
      )}

      {/* Notifications Overlay */}
      {showNotifications && nearbyUsers?.length > 0 && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 lg:p-8" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm lg:max-w-md max-h-[80vh] overflow-y-auto">
            <RunnerNotifications
              requests={nearbyUsers}
              runnerId={runnerId}
              darkMode={dark}
              onPickService={handlePickServiceFromNotification}
              socket={socket}
              isConnected={isConnected}
              onClose={() => {
                setShowNotifications(false);
                onNotificationsShown?.();
              }}
              currentOrder={currentOrder}
              runnerLocation={runnerLocation}
              reconnect={reconnect}
              onFindMore={onFindMore}
              isOpen={showNotifications}
            />
          </div>
        </div>
      )}

      {/* Camera Overlay */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-2 sm:p-4 lg:p-6 bg-black/80 flex-shrink-0">
            <Button onClick={closeCamera} className="text-white bg-primary px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 text-xs sm:text-sm lg:text-base">
              Cancel
            </Button>
            <h3 className="text-white text-sm sm:text-base lg:text-lg">Take ID Photo</h3>
            <div className="w-16 sm:w-20 lg:w-24" />
          </div>
          <div className="flex-1 relative bg-black min-h-0 flex flex-col">
            {!capturedImage ? (
              <div className="flex-1 relative bg-black min-h-0">
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex-1 relative bg-black min-h-0">
                <img src={capturedImage} alt="Captured ID" className="absolute inset-0 w-full h-full object-contain bg-black" />
                <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-0 right-0 flex justify-center gap-3 sm:gap-4 lg:gap-6 z-10">
                  <Button onClick={retakePhoto} className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-600 text-white rounded-lg shadow-lg text-xs sm:text-sm lg:text-base">
                    Retake
                  </Button>
                  <Button
                    onClick={() => {
                      const photo = confirmPhoto();
                      if (photo) {
                        if (kycStep === 2) onIdVerified(photo, setMessagesAndSync);
                        else if (kycStep === 5) onSelfieVerified(photo, setMessagesAndSync);
                      }
                    }}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-primary text-white rounded-lg shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    Use Photo
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="gap-3 sm:gap-4 lg:gap-6 flex-shrink-0 bg-black flex justify-center items-center p-3 sm:p-4 lg:p-6">
            <Button onClick={capturePhoto} className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 shadow-2xl active:scale-95 transition-transform" />
            <Button onClick={switchCamera} className="text-white px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(OnboardingScreen);