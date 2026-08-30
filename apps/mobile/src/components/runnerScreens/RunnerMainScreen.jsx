// components/runnerScreens/RunnerMainScreen.jsx - Mobile-First Refactor
import React, { useRef } from "react";
import OnboardingScreen from "./OnboardingScreen";
import RunnerChatScreen from "./RunnerChatScreen";
import useOrderStore from "../../store/orderStore";
import { useSocketContext } from "../../contexts/SocketContext";
import { useCameraContext } from "../../contexts/CameraContext";
import { useCallContext } from "../../contexts/CallContext";

const BOT_CHAT_ID = 'sendrey-bot';

export default function RunnerMainScreen({
  isBotMode,
  awaitingChatReady,
  isLoadingArchive,
  activeChatId,
  selectedUser,
  chatSessionKey,
  chatManager,
  botStoreMessages,
  botMessagesUpdater,
  registerSetMessages,
  botRefreshTrigger,
  handleNewOrderFleetSelected,
  handleStartNewOrder,
  newOrderTrigger,
  isVerifyingOtp,
  handleReturningUserChoice,
  isSubmitting,
  isVerified,
  active,
  text,
  setText,
  dark,
  setDark,
  isCollectingCredentials,
  credentialStep,
  credentialQuestions,
  needsOtpVerification,
  registrationComplete,   canResendOtp,
  sendMessage_fn,
  handleMessageClick,
  pickUp,
  runErrand,
  setDrawerOpen,
  setInfoOpen,
  initialMessagesComplete,
  runnerId,
  kycStep,
  kycStatus,
  onIdVerified,
  handleIDTypeSelection,
  onSelfieVerified,
  handleSelfieResponse,
  handleBannedDetected,
  checkVerificationStatus,
  handleConnectToService,
  handleFindMore,
  nearbyUsers,
  handlePickService,
  runnerData,
  canShowNotifications,
  hasSearched,
  setBotReplyingTo,
  verificationState,
  showBannedModal,
  setShowBannedModal,
  isConnectLocked,
  handleCredentialAnswer,
  runnerLocation,
  isReturningUser,
  returningUserData,
  effectiveReturningKycStatus,
  showNotifications,
  onNotificationsShown,
  isTrainingCompleted,
  openTrainingContinueClick,
  onKycRedirect,
  chatMessagesUpdater,
  handleBackToHome,
  showOrderFlow,
  setShowOrderFlow,
  handleOrderStatusClick,
  isAttachFlowOpen,
  setIsAttachFlowOpen,
  handleLocationClick,
  handleAttachClick,
  handleSetCompletedStatuses,
  taskCompletedFromStore,
  completedStatusesFromStore,
}) {
  const {
    socket, isConnected, reconnect, uploadFileWithProgress,
    onSpecialInstructions, onOrderCreated, onPaymentSuccess,
    onDeliveryConfirmed, onMessageDeleted,
  } = useSocketContext();

  const {
    cameraOpen, capturedImage, videoRef, openCamera, closeCamera,
    capturePhoto, retakePhoto, setIsPreviewOpen, isPreviewOpen,
    closePreview, openPreview, switchCamera, facingMode,
  } = useCameraContext();

  const {
    callState, callType, isMuted, isCameraOff, formattedDuration,
    remoteUsers, localVideoTrack, initiateCall, acceptCall, declineCall,
    endCall, toggleMute, toggleCamera, isSpeakerOn, networkQuality,
    toggleSpeaker, switchCamera: switchCallCamera, isConnecting, callError,
  } = useCallContext();

  const containerRef = useRef(null);

  if (isBotMode || awaitingChatReady) {
    const botState = chatManager.get(BOT_CHAT_ID);
    const botMessages = botState.messages.length > 0 ? botState.messages : botStoreMessages;

    return (
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-white dark:bg-black-100 flex flex-col"
      >
        <div className="flex-1 flex flex-col min-h-0 relative">
          <OnboardingScreen
            key="sendrey-bot"
            initialMessages={botMessages}
            botRefreshTrigger={botRefreshTrigger}
            onMessagesChange={botMessagesUpdater}
            onRegisterSetMessages={registerSetMessages}
            onNewOrderFleetAndServiceSelected={handleNewOrderFleetSelected}
            onStartNewOrder={handleStartNewOrder}
            newOrderTrigger={newOrderTrigger}
            isVerifyingOtp={isVerifyingOtp}
            onReturningUserChoice={(choice) => handleReturningUserChoice(choice, botMessagesUpdater)}
            isSubmitting={isSubmitting}
            newOrderComplete={botState.newOrderComplete}
            onSetNewOrderComplete={(val) => chatManager.set(BOT_CHAT_ID, { newOrderComplete: val })}
            isVerified={isVerified}
            active={active}
            text={text}
            setText={setText}
            dark={dark}
            setDark={setDark}
            isCollectingCredentials={isCollectingCredentials}
            credentialStep={credentialStep}
            credentialQuestions={credentialQuestions}
            needsOtpVerification={needsOtpVerification}
            registrationComplete={registrationComplete}
            canResendOtp={canResendOtp}
            send={sendMessage_fn}
            handleMessageClick={handleMessageClick}
            pickUp={pickUp}
            runErrand={runErrand}
            setDrawerOpen={setDrawerOpen}
            setInfoOpen={setInfoOpen}
            initialMessagesComplete={initialMessagesComplete}
            runnerId={runnerId}
            kycStep={kycStep}
            kycStatus={kycStatus}
            onIdVerified={onIdVerified}
            handleIDTypeSelection={handleIDTypeSelection}
            onSelfieVerified={onSelfieVerified}
            handleSelfieResponse={handleSelfieResponse}
            onBannedDetected={handleBannedDetected}
            checkVerificationStatus={(setMessages) => checkVerificationStatus(setMessages, handleBannedDetected, isReturningUser)}
            onConnectToService={handleConnectToService}
            onFindMore={handleFindMore}
            nearbyUsers={nearbyUsers}
            onPickService={handlePickService}
            socket={socket}
            isConnected={isConnected}
            reconnect={reconnect}
            runnerData={runnerData}
            canShowNotifications={canShowNotifications}
            hasSearched={hasSearched}
            replyingTo={botState.replyingTo}
            setReplyingTo={setBotReplyingTo}
            currentOrder={botState.currentOrder}
            verificationState={verificationState}
            showBannedModal={showBannedModal}
            setShowBannedModal={setShowBannedModal}
            isConnectLocked={isConnectLocked}
            handleCredentialAnswer={handleCredentialAnswer}
            runnerLocation={runnerLocation}
            isReturningUser={isReturningUser}
            returningUserData={returningUserData}
            effectiveReturningKycStatus={effectiveReturningKycStatus}
            forceShowNotifications={showNotifications}
            onNotificationsShown={onNotificationsShown}
            isTrainingCompleted={isTrainingCompleted}
            onTrainingContinueClick={openTrainingContinueClick}
            onKycRedirect={onKycRedirect}
          />

          {awaitingChatReady && (
            <div
              className="absolute inset-0 z-[9999] flex flex-col items-center justify-center gap-4"
              style={{ 
                background: 'rgba(0,0,0,0.85)',
                pointerEvents: 'all',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
            >
              <div className="relative w-10 h-10">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} 
                    className="absolute w-2 h-2 bg-primary rounded-full animate-fade-dot"
                    style={{ 
                      left: "50%", 
                      top: "50%", 
                      transform: `rotate(${i * 30}deg) translate(0, -16px)`, 
                      animationDelay: `${i * 0.1}s` 
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-gray-300">Preparing chat…</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoadingArchive) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  const chatId = activeChatId;
  const activeChatIdForScreen = activeChatId !== BOT_CHAT_ID ? activeChatId : null;
  const chatState = chatManager.get(chatId);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white dark:bg-black-100 flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <RunnerChatScreen
          key={`chat-${selectedUser?._id}`}
          sessionKey={chatSessionKey}
          chatId={activeChatIdForScreen}
          initialMessages={chatState.messages}
          onMessagesChange={chatMessagesUpdater}
          onRegisterSetMessages={registerSetMessages}
          onStartNewOrder={handleStartNewOrder}
          onBackToHome={handleBackToHome}
          active={active}
          selectedUser={selectedUser}
          isChatActive={true}
          text={text}
          setText={setText}
          dark={dark}
          setDark={setDark}
          send={sendMessage_fn}
          setDrawerOpen={setDrawerOpen}
          setInfoOpen={setInfoOpen}
          runnerId={runnerId}
          socket={socket}
          showOrderFlow={showOrderFlow}
          setShowOrderFlow={setShowOrderFlow}
          handleOrderStatusClick={handleOrderStatusClick}
          isAttachFlowOpen={isAttachFlowOpen}
          setIsAttachFlowOpen={setIsAttachFlowOpen}
          handleLocationClick={handleLocationClick}
          handleAttachClick={handleAttachClick}
          setCompletedOrderStatuses={handleSetCompletedStatuses}
          uploadFileWithProgress={uploadFileWithProgress}
          replyingTo={chatState.replyingTo}
          setReplyingTo={(r) => chatManager.set(chatId, { replyingTo: r })}
          cameraOpen={cameraOpen}
          capturedImage={capturedImage}
          isPreviewOpen={isPreviewOpen}
          switchCamera={switchCamera}
          facingMode={facingMode}
          openCamera={openCamera}
          closeCamera={closeCamera}
          capturePhoto={capturePhoto}
          retakePhoto={retakePhoto}
          openPreview={openPreview}
          closePreview={closePreview}
          setIsPreviewOpen={setIsPreviewOpen}
          videoRef={videoRef}
          callState={callState}
          callType={callType}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          switchCallCamera={switchCallCamera}
          formattedDuration={formattedDuration}
          remoteUsers={remoteUsers}
          localVideoTrack={localVideoTrack}
          initiateCall={initiateCall}
          acceptCall={acceptCall}
          declineCall={declineCall}
          endCall={endCall}
          isConnecting={isConnecting}
          callError={callError}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          isSpeakerOn={isSpeakerOn}
          networkQuality={networkQuality}
          toggleSpeaker={toggleSpeaker}
          runnerFleetType={runnerData?.fleetType}
          completedOrderStatuses={completedStatusesFromStore}
          taskCompleted={taskCompletedFromStore}
          setTaskCompleted={(val) => {
            chatManager.set(chatId, { taskCompleted: val });
            useOrderStore.getState().setTaskCompleted(chatId, val);
          }}
          orderCancelled={chatState.orderCancelled}
          cancellationReason={chatState.cancellationReason}
          onSpecialInstructions={onSpecialInstructions}
          onOrderCreated={onOrderCreated}
          onPaymentSuccess={onPaymentSuccess}
          onDeliveryConfirmed={onDeliveryConfirmed}
          onMessageDeleted={onMessageDeleted}
          initialDeliveryMarked={chatState.deliveryMarked}
          initialUserConfirmedDelivery={chatState.userConfirmedDelivery}
          initialSpecialInstructions={chatState.specialInstructions}
        />
      </div>
    </div>
  );
}