/* eslint-disable react-hooks/exhaustive-deps */
// components/runnerScreens/OnboardingScreen.jsx - Mobile-First CSS
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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-black-100">
      {/* Header - Mobile First */}
      <div className="flex-shrink-0 px-3 py-2 sm:px-5 sm:py-3 border-b dark:border-white/10 border-gray-200 flex items-center justify-between bg-white/5/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Avatar 
            src={sendreyBot} 
            alt="Sendrey Bot" 
            size="sm" 
            className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" 
          />
          <div className="truncate min-w-0">
            <div className="font-bold text-sm sm:text-[16px] truncate dark:text-white text-black-200">
              Sendrey Assistant
            </div>
            <div className="text-xs sm:text-sm font-medium text-black-100/70 dark:text-gray-400">
              Online
            </div>
          </div>
        </div>
        <div className="hidden sm:flex">
          <div 
            onClick={() => setDark(!dark)} 
            className="cursor-pointer bg-gray-900 dark:bg-gray-200 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
          >
            {dark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text:flash-white" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text:flash-white" strokeWidth={3.0} />}
          </div>
        </div>
      </div>

      {/* Progress Bar - Compact on mobile */}
      <div className="flex-shrink-0">
        <OnboardingProgress stageIndex={stageIndex} darkMode={dark} />
      </div>
      
      {/* Messages - Takes remaining space */}
      <div 
        ref={listRef} 
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 md:px-6 py-2 sm:py-4 bg-chat-pattern bg-gray-100 dark:bg-black-200 scrollbar-hide scroll-smooth"
      >
        <div className="mx-auto max-w-3xl">
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

      {/* Fleet Selection - Compact on mobile */}
      {isCollectingCredentials &&
        credentialStep !== null &&
        credentialQuestions[credentialStep]?.isFleetSelection &&
        !isSubmitting && (
          <div className="flex-shrink-0 flex gap-1 sm:gap-2 justify-center p-2 sm:p-3 bg-gray-100 dark:bg-black-200 overflow-x-auto">
            {FLEET_OPTIONS.map(({ type, icon: Icon, label }) => (
              <Button 
                key={type} 
                variant="outlined"
                className="flex flex-col p-1.5 sm:p-3 justify-center items-center text-black-100/60 dark:text-gray-400 min-w-[50px] sm:min-w-[70px]"
                onClick={() => handleCredentialAnswer(type, setText, setMessagesAndSync)}
              >
                <Icon className="text-xl sm:text-2xl" />
                <span className="text-[8px] sm:text-[10px] capitalize">{label}</span>
              </Button>
            ))}
          </div>
        )}

      {/* Composer - Fixed at bottom */}
      {!(isCollectingCredentials && !isSubmitting && credentialStep !== null && credentialQuestions[credentialStep]?.isFleetSelection) && (
        <div className="flex-shrink-0 bg-gray-100 dark:bg-black-200">
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
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm max-h-[80vh] overflow-y-auto">
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
          <div className="flex justify-between items-center p-2 sm:p-4 bg-black/80 flex-shrink-0">
            <Button onClick={closeCamera} className="text-white bg-primary px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
              Cancel
            </Button>
            <h3 className="text-white text-sm sm:text-base">Take ID Photo</h3>
            <div className="w-16 sm:w-20" />
          </div>
          <div className="flex-1 relative bg-black min-h-0 flex flex-col">
            {!capturedImage ? (
              <div className="flex-1 relative bg-black min-h-0">
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex-1 relative bg-black min-h-0">
                <img src={capturedImage} alt="Captured ID" className="absolute inset-0 w-full h-full object-contain bg-black" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-10">
                  <Button onClick={retakePhoto} className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-lg text-xs sm:text-sm">
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
                    className="px-4 py-2 bg-primary text-white rounded-lg shadow-lg text-xs sm:text-sm"
                  >
                    Use Photo
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="gap-3 flex-shrink-0 bg-black flex justify-center items-center p-3 sm:p-4">
            <Button onClick={capturePhoto} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 shadow-2xl active:scale-95 transition-transform" />
            <Button onClick={switchCamera} className="text-white px-2 py-1.5 sm:px-3 sm:py-2"><RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(OnboardingScreen);