// components/runner/ChatComposer.jsx - Full Responsive with proper spacing
import { Button } from "@material-tailwind/react";
import { Camera } from "lucide-react";
import CustomInput from "../common/CustomInput";
import { useState, useRef, useCallback } from "react";

export default function ChatComposer({
  // State
  isCollectingCredentials,
  credentialStep,
  credentialQuestions,
  needsOtpVerification,
  registrationComplete,
  isChatActive,
  kycStep,
  initialMessagesComplete,
  text,
  setText,
  selectedUser,
  selectedFiles,
  replyingTo,
  darkMode,
  isSubmitting,

  // Handlers
  pickUp,
  runErrand,
  send,
  openCamera,
  handleIDTypeSelection,
  handleSelfieResponse,
  handleLocationClick,
  handleAttachClick,
  onRemoveFile,
  fileInputRef,
  isSearching,
  handleConnectToService,
  handleCancelConnect,
  setMessages,
  onCancelReply,
  handleAttachFlowClick,
  setIsAttachFlowOpen,

  handleTextChange,
  handleKeyDown,
  verificationState,
  currentOrder,
  onKycFileUpload,

  // Audio upload
  uploadFileWithProgress,
  chatId,
  runnerId,
  isConnectLocked,

  isNewOrderFlow,
  newOrderStep,
  onServiceChoice,
  onFleetChoice,
  newOrderComplete,
  isUpdatingServer,
  isVerified,
  isTrainingCompleted,
  onTrainingContinueClick,

  isReturningUser,
  onReturningUserChoice,
  onStartNewOrder,
  isInProgress,
  effectiveReturningKycStatus,
  returningUserData,

  isVerifyingOtp,
  kycStatus,
  onKycRedirect
}) {

  const [isConnectDisabled, setIsConnectDisabled] = useState(false);
  const [isLetsGetStarted, setIsLetsGetStarted] = useState(false);
  const kycFileInputRef = useRef(null);
  const [returningChoiceMade, setReturningChoiceMade] = useState(false);
  const CONNECT_DISABLED = false;

  const handleConnect = () => {
    if (isConnectDisabled || isSearching || isConnectLocked) return;
    if (!isVerified) {
      onKycRedirect?.();
      return;
    }

    setIsConnectDisabled(true);
    handleConnectToService();
    setTimeout(() => setIsConnectDisabled(false), 3000);
  };

  const handleGetStarted = () => {
    if (isLetsGetStarted) return;
    const okayMessage = {
      id: Date.now(), from: "me", text: "Okay, let's get started",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    setMessages(prev => [...prev, okayMessage]);
    handleSelfieResponse('okay', setMessages);
    setIsLetsGetStarted(true);
  };

  const handleAudioReady = useCallback(async (audioBlob, audioUrl, mimeType) => {
    if (!chatId || !runnerId || !uploadFileWithProgress) return;

    const ext = mimeType?.includes('ogg') ? 'ogg' : mimeType?.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mimeType || 'audio/webm' });

    if (file.size > 10 * 1024 * 1024) {
      alert('Audio exceeds 10MB limit.');
      return;
    }

    const tempId = `temp-audio-${Date.now()}`;

    if (setMessages) {
      setMessages(prev => [...prev, {
        id: tempId,
        from: 'me',
        type: 'audio',
        fileType: mimeType || 'audio/webm',
        fileName: file.name,
        fileUrl: audioUrl,
        text: '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'uploading',
        senderId: runnerId,
        senderType: 'runner',
        isUploading: true,
        tempId,
        createdAt: new Date().toISOString(),
      }]);
    }

    try {
      await uploadFileWithProgress(file, {
        chatId,
        senderId: runnerId,
        senderType: 'runner',
        type: 'audio',
        tempId,
      });
    } catch (err) {
      console.error('Audio upload error:', err);
      if (setMessages) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
      URL.revokeObjectURL(audioUrl);
    }
  }, [chatId, runnerId, uploadFileWithProgress, setMessages]);

  if (
    registrationComplete && !isChatActive && isVerified === false &&
    !isCollectingCredentials && !needsOtpVerification && kycStep === 6
  ) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex justify-center">
        <p className="text-xs sm:text-sm lg:text-base text-center text-gray-500 dark:text-gray-400">
          Your documents are currently under review, we will get back to you soon.
        </p>
      </div>
    );
  }

  // ── Returning user — Yes / No ─────────────────────────────────────────────
  if (isReturningUser) {
    return (
      <div className="flex gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
        <Button
          onClick={async () => {
            if (returningChoiceMade) return;
            setReturningChoiceMade(true);
            try {
              await onReturningUserChoice('yes');
            } catch {
              setReturningChoiceMade(false);
            }
          }}
          disabled={returningChoiceMade}
          className={`bg-primary rounded-lg w-full h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg ${isSubmitting ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`}
        >
          Yes, It's me
        </Button>
        <Button
          onClick={async () => {
            if (returningChoiceMade) return;
            setReturningChoiceMade(true);
            try {
              await onReturningUserChoice('no');
            } catch {
              setReturningChoiceMade(false);
            }
          }}
          disabled={returningChoiceMade}
          className={`bg-secondary rounded-lg w-full h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg ${isSubmitting ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`}
        >
          No
        </Button>
      </div>
    );
  }

  if (isInProgress) {
    return <div className="py-3 sm:py-4 lg:py-6" />;
  }

  // ── Get Started button - Fixed for all screens ────────────────────────────
  if (!registrationComplete && !isCollectingCredentials && !needsOtpVerification && !isReturningUser) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <Button
          onClick={send}
          className="w-full bg-primary rounded-lg text-sm sm:text-base lg:text-lg flex items-center justify-center h-10 sm:h-12 lg:h-14 hover:scale-[1.02] transition-transform"
        >
          Get Started
        </Button>
      </div>
    );
  }

  // ── OTP verification input ────────────────────────────────────────────────
  if (needsOtpVerification) {
    if (isVerifyingOtp) {
      return <div className="py-3 sm:py-4 lg:py-6" />;
    }

    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <CustomInput
          showMic={false}
          send={send}
          showIcons={false}
          showEmojis={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter OTP e.g. 09726"
          disabled={false}
        />
      </div>
    );
  }

  // ── Credential collection input ───────────────────────────────────────────
  if (isCollectingCredentials && credentialStep !== null) {
    if (isSubmitting) {
      return <div className="py-3 sm:py-4 lg:py-6" />;
    }

    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <CustomInput
          showMic={false}
          send={send}
          showIcons={false}
          showEmojis={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Your ${credentialQuestions[credentialStep]?.field}...`}
        />
      </div>
    );
  }

  // KYC Step 1 - Processing 
  if (registrationComplete && !isChatActive && kycStep === 1) {
    return null;
  }

  // ── KYC Step 2 - ID Photo Camera ──────────────────────────────────────────
  if (registrationComplete && !isChatActive && kycStep === 2) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 lg:gap-3">
        <Button
          onClick={openCamera}
          className="bg-primary rounded-lg text-xs sm:text-sm lg:text-base flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 hover:scale-[1.02] transition-transform"
        >
          <Camera size={16} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          <span>Camera</span>
        </Button>
        <span className="text-xs sm:text-sm text-gray-500">OR</span>
        <Button
          onClick={() => kycFileInputRef.current?.click()}
          className="bg-secondary rounded-lg text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 hover:scale-[1.02] transition-transform"
        >
          Upload File
        </Button>
        <input
          ref={kycFileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => onKycFileUpload?.(ev.target.result, file);
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  // ── KYC Step 3 - Selfie Prompt ───────────────────────────────────────────
  if (registrationComplete && !isChatActive && kycStep === 3) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 flex justify-center w-full">
        <Button
          onClick={handleGetStarted}
          className={`bg-primary rounded-lg text-xs sm:text-sm lg:text-base px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 lg:py-3 flex items-center justify-center hover:scale-[1.02] transition-transform ${isLetsGetStarted ? 'bg-gray-500 opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>Okay, let's get started</span>
        </Button>
      </div>
    );
  }

  // ── KYC Step 5 - Selfie Camera ───────────────────────────────────────────
  if (registrationComplete && !isChatActive && kycStep === 5) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 flex justify-center">
        <Button
          onClick={openCamera}
          className="bg-primary rounded-lg w-16 sm:w-20 lg:w-24 h-10 sm:h-12 lg:h-14 text-xs sm:text-sm lg:text-base flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-transform"
        >
          <Camera size={16} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          <span>Take</span>
        </Button>
      </div>
    );
  }

  if (isNewOrderFlow && newOrderStep === 'service') {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <Button
          onClick={handleConnect}
          disabled={CONNECT_DISABLED || isConnectDisabled || isConnectLocked || isUpdatingServer}
          className={`w-full bg-primary rounded-lg text-xs sm:text-sm lg:text-base flex items-center justify-center h-10 sm:h-12 lg:h-14 ${CONNECT_DISABLED || isConnectDisabled || isConnectLocked || isUpdatingServer ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-transform'}`}
        >
          {CONNECT_DISABLED ? 'Connect to an errand service (Coming soon, stay tuned)'
            : isConnectLocked ? 'Ongoing Order — complete or cancel current order to connect'
              : isUpdatingServer ? 'In Progress'
                : 'Connect to an errand service'}
        </Button>
      </div>
    );
  }

  // ── New Order Complete - Connect to Service ───────────────────────────────
  if (newOrderComplete) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <Button
          onClick={handleConnect}
          disabled={CONNECT_DISABLED || isConnectDisabled || isSearching || isConnectLocked || isUpdatingServer}
          className={`w-full bg-primary rounded-lg text-xs sm:text-sm lg:text-base flex items-center justify-center h-10 sm:h-12 lg:h-14 ${CONNECT_DISABLED || isConnectDisabled || isSearching || isConnectLocked || isUpdatingServer ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-transform'}`}
        >
          <span>
            {CONNECT_DISABLED ? 'Connect to an errand service (Coming soon, stay tuned)'
              : isUpdatingServer ? 'In Progress'
                : isConnectLocked ? 'Ongoing Order — complete or cancel current order to connect again'
                  : isSearching ? 'Connecting...'
                    : 'Connect to an errand service'}
          </span>
        </Button>
      </div>
    );
  }

  if (registrationComplete && !isChatActive && kycStep === 7) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <Button
          onClick={() => {
            setMessages(prev => [...prev, {
              id: Date.now(), from: "me", text: "Start New Order",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              status: "sent",
            }]);
            onStartNewOrder?.();
          }}
          className="w-full bg-primary rounded-lg text-xs sm:text-sm lg:text-base flex items-center justify-center h-10 sm:h-12 lg:h-14 hover:scale-[1.02] transition-transform"
        >
          Start New Order
        </Button>
      </div>
    );
  }

  // ── KYC Step 6 - Connect to Service ──────────────────────────────────────
  if (!newOrderComplete && registrationComplete && !isChatActive && kycStep === 6) {

    if (!isVerified) {
      return (
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex justify-center">
          <p className="text-xs sm:text-sm lg:text-base text-center text-gray-500 dark:text-gray-400">
            Your documents are currently under review, we will get back to you soon.
          </p>
        </div>
      );
    }

    if (!isTrainingCompleted) {
      return (
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex justify-center">
          <p className="text-xs sm:text-sm lg:text-base text-center text-gray-500 dark:text-gray-400">
            Runner training ongoing. Complete the training to proceed.
          </p>
        </div>
      );
    }

    return (
      <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
        <Button
          onClick={handleConnect}
          disabled={CONNECT_DISABLED || isConnectDisabled || isSearching || isConnectLocked || isUpdatingServer}
          className={`w-full bg-primary rounded-lg text-xs sm:text-sm lg:text-base flex items-center justify-center h-10 sm:h-12 lg:h-14 ${CONNECT_DISABLED || isConnectDisabled || isSearching || isConnectLocked || isUpdatingServer
            ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-transform'
            }`}
        >
          <span>
            {CONNECT_DISABLED ? 'Connect to an errand service (Coming soon, stay tuned)'
              : isUpdatingServer ? 'Updating...'
                : isConnectLocked ? 'Ongoing Order — complete or cancel current order to connect again'
                  : isSearching ? 'Connecting...'
                    : 'Connect to an errand service'}
          </span>
        </Button>
      </div>
    );
  }

  // ── KYC Step 0 ───────────────────────────────────────────────────────────
  if (registrationComplete && !isChatActive && kycStep === 0) {
    return <div className="py-3 sm:py-4 lg:py-6" />;
  }

  // ── Active chat input ─────────────────────────────────────────────────────
  if (isChatActive) {
    return (
      <div className="w-full">
        <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3">
          <CustomInput
            showMic={true}
            setLocationIcon={true}
            showIcons={false}
            showPlus={true}
            send={send}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedUser?.firstName || 'user'}...`}
            onLocationClick={handleLocationClick}
            onPlusClick={() => setIsAttachFlowOpen(true)}
            selectedFiles={selectedFiles}
            onRemoveFile={onRemoveFile}
            replyingTo={replyingTo}
            onCancelReply={onCancelReply}
            darkMode={darkMode}
            userName={selectedUser?.firstName}
            onAudioReady={handleAudioReady}
          />
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAttachClick}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          multiple
        />
      </div>
    );
  }

  if (
    registrationComplete && !isChatActive && !isCollectingCredentials &&
    !needsOtpVerification && !isReturningUser && !isTrainingCompleted &&
    (kycStep === null || kycStep === undefined)
  ) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex justify-center">
        <p className="text-xs sm:text-sm lg:text-base text-center text-gray-500 dark:text-gray-400">
          Training in progress..
        </p>
      </div>
    );
  }

  if (
    registrationComplete && !isChatActive && !isCollectingCredentials &&
    !needsOtpVerification && !isReturningUser &&
    (kycStep === null || kycStep === undefined) &&
    isTrainingCompleted
  ) {
    return <div className="py-3 sm:py-4 lg:py-6" />;
  }

  if (registrationComplete && !isChatActive && !isCollectingCredentials && !needsOtpVerification) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex justify-center">
        <p className="text-xs sm:text-sm lg:text-base text-center text-gray-500 dark:text-gray-400">
          Your documents are currently under review, we will get back to you soon.
        </p>
      </div>
    );
  }

  return null;
}