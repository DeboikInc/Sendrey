import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, IconButton, Tooltip } from "@material-tailwind/react";
import { Bike, Car, Truck, Mic, Square, Paperclip, Camera, Music } from "lucide-react";
import Message from "../common/Message";
import Onboarding from "../common/Onboarding";
import { useDispatch, } from "react-redux";
import { updateOrder } from '../../Redux/orderSlice';
import { FaWalking, FaMotorcycle } from "react-icons/fa";
import { useCameraHook } from "../../hooks/useCameraHook";
import { getPedestrianConfig } from '../../utils/pedestrianConfig';
import { calculateRouteDistance, haversineDistance } from '../../utils/pricing';
import RequestLocation from "../common/RequestLocation";

const usePersistedState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If initialValue is an array and parsed is not an array, return initialValue
        if (Array.isArray(initialValue) && !Array.isArray(parsed)) {
          return initialValue;
        }
        return parsed;
      }
      return initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {

    }
  }, [key, state]);

  return [state, setState];
};


const getCurrentTime = () => {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getInitialMessages = () => {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return [
    {
      id: 1,
      from: "them",
      text: "What kind of fleet can handle this errand? Select from the options below:",
      time: now,
      status: "delivered",
      isSystemPrompt: true,
    },
    {
      id: 2,
      from: "them",
      text: "⚠️ Note: Bikes, bicycles and pedestrians are only suitable for items weighing 5kg or less.",
      time: now,
      status: "delivered",
      isSystemPrompt: true,
    }
  ];
};

const HeaderIcon = ({ children, tooltip, onClick }) => (
  <Tooltip content={tooltip} placement="bottom" className="text-xs">
    <IconButton variant="text" size="sm" className="rounded-full" onClick={onClick}>
      {children}
    </IconButton>
  </Tooltip>
);

export default function VehicleSelectionScreen({
  darkMode, toggleDarkMode,
  service,
  selectedService,
  socket,
  onShowConfirmOrder,
  isEditing,
  editingField,
  currentOrder,
  onEditComplete,
  serverUpdated,
  onFetchRunners,
  onMore,
  showBack,
  onBack,
}) {
  const dispatch = useDispatch();
  const persistenceKey = useRef(
    (() => {
      const STORAGE_ID_KEY = "vehicle_persistence_active_id";
      const stored = localStorage.getItem(STORAGE_ID_KEY);
      if (stored) return stored;
      const newId = `vehicle_${Date.now()}`;
      localStorage.setItem(STORAGE_ID_KEY, newId);
      return newId;
    })()
  ).current;

  const [messages, setMessages] = usePersistedState(`vehicle_messages_${persistenceKey}`, getInitialMessages);
  const [showConnectButton, setShowConnectButton] = usePersistedState(`vehicle_showConnectButton_${persistenceKey}`, false);
  const [selectedVehicle, setSelectedVehicle] = usePersistedState(`vehicle_selectedVehicle_${persistenceKey}`, null);
  const [text, setText] = usePersistedState(`vehicle_text_${persistenceKey}`, "");
  const [specialInstructions, setSpecialInstructions] = usePersistedState(`vehicle_specialInstructions_${persistenceKey}`, "");
  const [, setUserLocation] = useState(null);
  const [isConnectingToRunner, setIsConnectingToRunner] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [orderSent, setOrderSent] = usePersistedState(`vehicle_orderSent_${persistenceKey}`, false);

  // Media states
  const [selectedFiles, setSelectedFiles] = usePersistedState(`vehicle_selectedFiles_${persistenceKey}`, []);
  const [specialInstructionsMedia, setSpecialInstructionsMedia] = usePersistedState(`vehicle_specialInstructionsMedia_${persistenceKey}`, []);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const camera = useCameraHook();
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const pendingConnectDataRef = useRef(null);

  useEffect(() => {
    // Ensure messages is always an array
    if (!Array.isArray(messages)) {
      console.warn('messages is not an array, resetting to initial messages');
      setMessages(getInitialMessages());
      // Clear the corrupted localStorage entry
      localStorage.removeItem(`vehicle_messages_${persistenceKey}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load existing data when editing
  useEffect(() => {
    if (!isEditing || !editingField) return;
    const baseId = Date.now();

    if (editingField === "fleet-type") {
      setMessages([
        {
          id: baseId,
          from: "them",
          text: "What kind of fleet can handle this errand? Select from the options below:",
          time: getCurrentTime(),
          status: "delivered",
          isSystemPrompt: true,
        },
        {
          id: baseId + 1,
          from: "them",
          text: "⚠️ Note: Bikes and bicycles are only suitable for items weighing 5kg or less.",
          time: getCurrentTime(),
          status: "delivered",
          isSystemPrompt: true,
        }
      ]);
      setShowConnectButton(false);
      setSelectedVehicle(null);
      setSpecialInstructions("");
      setSpecialInstructionsMedia([]);
      setSelectedFiles([]);
    }

    if (editingField === "special-instructions") {
      setMessages([
        {
          id: baseId + 2,
          from: "them",
          text: "Make your request detailed enough for your runner to understand (Type a message, snap a picture or record a voice note). Press the Connect To Runner button when you are done. Connect To Runner",
          time: getCurrentTime(),
          status: "delivered",
          hasConnectRunnerButton: true,
          isConnectToRunner: true,
        }
      ]);
      setShowConnectButton(true);
      localStorage.setItem(`vehicle_showConnectButton_${persistenceKey}`, JSON.stringify(true));

      if (currentOrder?.specialInstructions) {
        const existing = currentOrder.specialInstructions;
        if (typeof existing === "string") {
          setSpecialInstructions(existing);
        } else if (typeof existing === "object") {
          setSpecialInstructions(existing.text || "");
          setSpecialInstructionsMedia(existing.media || []);
          setSelectedFiles(existing.media || []);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingField, currentOrder]);

  useEffect(() => {
    // If there's a selected vehicle and messages contain the connect button message
    if (selectedVehicle && Array.isArray(messages)) {
      const hasConnectMessage = messages.some(msg => msg.hasConnectRunnerButton);
      if (hasConnectMessage) {
        setShowConnectButton(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle, messages]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (showConnectButton) {
      localStorage.setItem(`vehicle_showConnectButton_${persistenceKey}`, JSON.stringify(true));
    }
  }, [showConnectButton, persistenceKey]);

  useEffect(() => {
    // Restore the connect button state on mount
    try {
      const stored = localStorage.getItem(`vehicle_showConnectButton_${persistenceKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed === true) {
          setShowConnectButton(true);
        }
      }
    } catch {
      // ignore
    }
  }, [persistenceKey, setShowConnectButton]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (Array.isArray(selectedFiles)) {
        selectedFiles.forEach(file => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      }

      if (Array.isArray(messages)) {
        messages.forEach(msg => {
          if (msg.fileUrl && msg.fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(msg.fileUrl);
          }
        });
      }
    };
  }, [selectedFiles, messages]);


  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);

    const filesWithPreview = files.map(file => ({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles(prev => [...prev, ...filesWithPreview]);
    setSpecialInstructionsMedia(prev => [...prev, ...filesWithPreview]);

    event.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const fileToRemove = newFiles[index];

      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }

      newFiles.splice(index, 1);
      return newFiles;
    });

    setSpecialInstructionsMedia(prev => {
      const newMedia = [...prev];
      newMedia.splice(index, 1);
      return newMedia;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const preview = URL.createObjectURL(audioBlob);

        const fileData = {
          file: audioFile,
          type: "audio/webm",
          name: "Voice message",
          preview,
          size: audioBlob.size,
          isAudio: true
        };

        setSelectedFiles(prev => [...prev, fileData]);
        setSpecialInstructionsMedia(prev => [...prev, fileData]);

        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAfterVehicleSelect = (type) => {
    console.log('[VehicleSelection] handleAfterVehicleSelect called with type:', type);
    setMessages(prev => {
      const prevArray = Array.isArray(prev) ? prev : [];
      const filtered = prevArray.filter(msg => msg.text !== "In progress...");
      return filtered;
    });

    const hasConnectMessage = Array.isArray(messages) && messages.some(msg => msg.hasConnectRunnerButton);

    if (!hasConnectMessage) {
      setMessages(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return [...prevArray, {
          id: Date.now(),
          from: "them",
          text: `Make your request detailed enough for your runner to understand (Type a message, snap a picture or record a voice note). Press the Connect To Runner button when you are done. Connect To Runner`,
          time: getCurrentTime(),
          status: "delivered",
          hasConnectRunnerButton: true,
          isConnectToRunner: true
        }];
      });
    }

    setShowConnectButton(true);
    console.log('[VehicleSelection] showConnectButton set to true');
  };


  const handleSelect = async (type, label) => {
    setOrderSent(false);
    const now = Date.now();

    const newMsg = {
      id: now,
      from: "me",
      text: label,
      time: getCurrentTime(),
      status: "sent",
      isFleetSelection: true,
    };
    setMessages(prev => {
      const prevArray = Array.isArray(prev) ? prev : [];
      return [...prevArray, newMsg];
    });


    if (type === 'pedestrian') {
      const origin = selectedService === 'run-errand'
        ? service?.marketCoordinates
        : service?.pickupCoordinates;
      const dest = service?.deliveryCoordinates;

      if (origin && dest) {
        try {
          const pedestrianConfig = await getPedestrianConfig();
          console.log('[pedestrian check]', { origin, dest, leg2: haversineDistance(origin, dest) });
          const { error } = calculateRouteDistance(
            selectedService, origin, dest, 'pedestrian',
            pedestrianConfig.pedestrianMaxDeliveryLeg
          );

          if (error === 'PEDESTRIAN_TOO_FAR') {
            setTimeout(() => {
              setMessages(prev => {
                const filtered = prev.filter(msg => msg.text !== "In progress...");
                return [...filtered, {
                  id: Date.now(),
                  from: "them",
                  text: `⚠️ Pedestrian fleet cannot be used when the delivery distance exceeds ${pedestrianConfig.pedestrianMaxDeliveryLeg} meters. Please select a different fleet type.`,
                  time: getCurrentTime(),
                  status: "delivered",
                  isSystemPrompt: true,
                }];
              });
              setSelectedVehicle(null);
              setShowConnectButton(false);
            }, 800);
            return;
          }
        } catch (err) {
          console.error('[VehicleSelection] Failed to fetch pedestrian config:', err);
        }
      }
    }

    setSelectedVehicle(type);
    localStorage.setItem(`vehicle_selectedVehicle_${persistenceKey}`, JSON.stringify(type));

    const botResponse = {
      id: now + 1,
      from: "them",
      text: "In progress...",
      status: "delivered",
      isSystemPrompt: true,
    };
    setMessages(prev => {
      const prevArray = Array.isArray(prev) ? prev : [];
      return [...prevArray, botResponse];
    });


    setTimeout(() => {
      handleAfterVehicleSelect(type);
    }, 800);
  };

  const handleSendMessage = () => {
    if (!text.trim() && selectedFiles.length === 0) return;

    if (text.trim()) {
      const userMessage = {
        id: Date.now(),
        from: "me",
        text: text.trim(),
        time: getCurrentTime(),
        status: "sent",
      };

      setMessages(prev => [...prev, userMessage]);
      setSpecialInstructions(prev =>
        prev ? `${prev}\n${text.trim()}` : text.trim()
      );
    }

    if (selectedFiles.length > 0) {
      selectedFiles.forEach((fileData, index) => {
        const messageFileUrl = URL.createObjectURL(fileData.file);

        const mediaMessage = {
          id: Date.now() + index + 1,
          from: "me",
          type: fileData.type?.startsWith('image/') ? 'image' :
            fileData.type?.startsWith('audio/') ? 'audio' : 'file',
          fileName: fileData.name,
          fileUrl: messageFileUrl,
          fileSize: `${(fileData.size / 1024).toFixed(1)} KB`,
          time: getCurrentTime(),
          status: "sent",
          isUploading: false,
        };

        setMessages(prev => [...prev, mediaMessage]);
      });

      // Clear only the preview files, keep specialInstructionsMedia
      setSelectedFiles([]);
    }

    setText("");
  };

  useEffect(() => {
    if (serverUpdated) {
      setOrderSent(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUpdated, orderSent]);

  const clearVehiclePersistence = useCallback(() => {
    const keys = [
      `vehicle_messages_${persistenceKey}`,
      `vehicle_showConnectButton_${persistenceKey}`,
      `vehicle_selectedVehicle_${persistenceKey}`,
      `vehicle_text_${persistenceKey}`,
      `vehicle_specialInstructions_${persistenceKey}`,
      `vehicle_selectedFiles_${persistenceKey}`,
      `vehicle_specialInstructionsMedia_${persistenceKey}`,
      `vehicle_orderSent_${persistenceKey}`,
    ];
    keys.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem("vehicle_persistence_active_id");
  }, [persistenceKey]);

  useEffect(() => {
    return () => {
      if (orderSent) {
        clearVehiclePersistence();
      }
    };
  }, [orderSent, clearVehiclePersistence]);

  const getFreshLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let message;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access was denied. Please enable location permissions for this site and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Your current location could not be determined. Please check your device settings and try again.';
              break;
            case error.TIMEOUT:
              message = 'Getting your location took too long. Please try again, ideally with a clear view of the sky or a stronger signal.';
              break;
            default:
              message = 'Unable to get your current location. Please try again.';
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const reverseGeocode = (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.google) {
        resolve(`Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        return;
      }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        }
      });
    });
  };

  const finishConnectToRunner = async (currentLocation) => {
    // Prepare media with valid previews
    const mediaWithValidPreviews = specialInstructionsMedia.map(media => ({
      ...media,
      preview: media.preview || (media.file ? URL.createObjectURL(media.file) : null),
      file: media.file
    }));

    const orderData = {
      ...service,
      fleetType: selectedVehicle,
      specialInstructions: (specialInstructionsMedia.length > 0 || specialInstructions) ? {
        text: specialInstructions || null,
        media: specialInstructionsMedia.map(m => ({
          fileName: m.name,
          fileType: m.type,
          fileSize: m.size,
          type: m.type,
          preview: m.preview,
          file: m.file,
        })),
      } : null,
      serviceType: selectedService,
      currentUserLocation: currentLocation?.address || null,
      currentUserCoordinates: currentLocation
        ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
        : null,
    };

    const serializableOrderData = {
      ...orderData,
      specialInstructions: orderData.specialInstructions ? {
        ...orderData.specialInstructions,
        media: mediaWithValidPreviews.map(m => ({
          fileName: m.name,
          fileType: m.type,
          fileSize: m.size,
          preview: m.preview,
          type: m.type,
        })),
      } : null,
    };

    dispatch(updateOrder(serializableOrderData));

    if (isEditing && onEditComplete) {
      onEditComplete(orderData);
      setIsConnectingToRunner(false);
      return;
    }

    if (serverUpdated) {
      onFetchRunners(orderData);
    } else {
      onShowConfirmOrder(orderData);
    }

    setIsConnectingToRunner(false);
    setOrderSent(true);
  };

  const handleConnectToRunner = async () => {
    if (isConnectingToRunner) return;
    if (!selectedVehicle) {
      return;
    }

    setIsConnectingToRunner(true);

    let currentLocation;

    if (!serverUpdated) {
      try {
        const coords = await getFreshLocation();
        const address = await reverseGeocode(coords.latitude, coords.longitude);
        currentLocation = { ...coords, address };
        setUserLocation(currentLocation);
      } catch (error) {
        console.error('Location error:', error);

        pendingConnectDataRef.current = true;
        setIsConnectingToRunner(false);
        setShowLocationModal(true);
      }
    }

    await finishConnectToRunner(null);
  };

  const handleLocationModalComplete = async (locationData) => {
    setShowLocationModal(false);
    if (!pendingConnectDataRef.current) return;
    pendingConnectDataRef.current = null;

    setIsConnectingToRunner(true);
    try {
      const address = await reverseGeocode(locationData.latitude, locationData.longitude);
      const currentLocation = { ...locationData, address };
      setUserLocation(currentLocation);
      await finishConnectToRunner(currentLocation);
    } catch (error) {
      console.error('Location error after modal retry:', error);
      setIsConnectingToRunner(false);
      setShowLocationModal(true);
    }
  };

  const handleLocationModalCancel = () => {
    setShowLocationModal(false);
    pendingConnectDataRef.current = null;
  };


  const renderCameraUI = () => {
    if (!camera.cameraOpen) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={camera.videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
          <Button
            onClick={camera.capturePhoto}
            className="w-16 h-16 rounded-full bg-white border-4 border-primary"
          />
          <Button
            onClick={camera.closeCamera}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const renderPreviewUI = () => {
    if (!camera.isPreviewOpen || !camera.capturedImage) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <img src={camera.capturedImage} alt="Preview" className="max-h-full" />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
          <Button
            onClick={camera.retakePhoto}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
          >
            Retake
          </Button>
          <Button
            onClick={() => {
              const photo = camera.confirmPhoto();
              if (photo) {
                fetch(photo)
                  .then(res => res.blob())
                  .then(blob => {
                    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const preview = URL.createObjectURL(file);

                    const fileData = {
                      file,
                      type: 'image/jpeg',
                      name: file.name,
                      preview,
                      size: file.size
                    };

                    setSelectedFiles(prev => [...prev, fileData]);
                    setSpecialInstructionsMedia(prev => [...prev, fileData]);

                    // DON'T add to chat immediately - wait for send button
                  });
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Use Photo
          </Button>
        </div>
      </div>
    );
  };

  const handleEditMessage = (messageId, newText) => {
    // console.log('Editing message:', messageId, newText);

    setSpecialInstructions(newText);

    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          text: newText,
          edited: true,
          timestamp: new Date().toISOString(),
          hasConnectRunnerButton: msg.hasConnectRunnerButton,
        };
      }
      return msg;
    }));
  };

  const handleDeleteMessage = (messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleSend = () => {
    handleSendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Onboarding darkMode={darkMode} toggleDarkMode={toggleDarkMode} onMore={onMore} showBack={showBack} onBack={onBack}>
      <div className="h-full flex flex-col ">
        <div className="flex-1 overflow-hidden relative">
          <div ref={messagesEndRef} className="absolute inset-0 overflow-y-auto scrollbar-hide scroll-smooth">
            <div className="min-h-full p-4 pb-[280px] marketSelection">
              {(Array.isArray(messages) ? messages : []).map(m => (
                <Message
                  key={m.id}
                  m={m}
                  showCursor={false}
                  showStatusIcons={false}
                  onConnectButtonClick={m.hasConnectRunnerButton ? handleConnectToRunner : undefined}
                  connectButtonDisabled={m.hasConnectRunnerButton ? isConnectingToRunner : undefined}
                  disableContextMenu={m.isFleetSelection || m.isConnectToRunner || m.isSystemPrompt ? true : false}
                  alwaysAllowEdit={
                    m.from === "me" &&
                    !m.hasConnectRunnerButton &&
                    !m.isFleetSelection &&
                    !m.isConnectToRunner &&
                    m.type !== "audio" &&
                    !m.isAudio
                  }
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  showReply={false}
                  showDelete={true}
                  isChatActive={true}
                  className="placholder:dark:text-gray-300 placholder:text-gray-800"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0">
          {!showConnectButton && (
            <div className="flex text-3xl gap-2 justify-center mb-7">
              {[
                { type: "cycling", icon: Bike, label: "Cycling" },
                { type: "car", icon: Car, label: "Car" },
                { type: "van", icon: Truck, label: "Van" },
                { type: "pedestrian", icon: FaWalking, label: "Pedestrian" },
                { type: "bike", icon: FaMotorcycle, label: "Bike" }
              ].map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  variant="outlined"
                  className="flex flex-col p-3 justify-center items-center"
                  onClick={() => handleSelect(type, label)}
                >
                  <Icon className="text-2xl" />
                  <span className="text-[10px] capitalize">{label}</span>
                </Button>
              ))}
            </div>
          )}

          {showConnectButton && (
            console.log('RENDERING CONNECT BUTTON SECTION:', { orderSent, showConnectButton }) ||
            <div className="pt-3 pb-4 px-4 sm:px-8 lg:px-64">
              {/* File Previews - Directly above input, no gap */}
              {selectedFiles.length > 0 && !orderSent && (
                <div className="flex gap-2 overflow-x-auto pb-2 ml-[60px]">
                  {selectedFiles.map((fileData, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      {fileData.type?.startsWith('image/') ? (
                        <img
                          src={fileData.preview}
                          alt={fileData.name}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                        />
                      ) : fileData.type?.startsWith('audio/') ? (
                        <div className="flex items-center gap-2 h-14 bg-primary p-2 rounded-lg">
                          <div className="w-10 h-10 rounded bg-gray-700 dark:bg-gray-300 flex items-center justify-center">
                            <Music className="w-5 h-5 opacity-70" />
                          </div>
                          <div className="flex flex-col mt-2 min-w-0 text-black-100 dark:text-gray-200">
                            <p className="text-xs font-medium opacity-90">Audio message</p>
                            <span className="text-xs">{Math.floor(fileData.size / 1024)}KB</span>
                          </div>
                        </div>
                      ) : null}
                      <Button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-0 -right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Input Area - Fixed positioning */}
              {!orderSent && (
                console.log('RENDERING CUSTOM INPUT - orderSent is false') ||
                <div className="flex items-center gap-3 w-full">
                  {/* Camera Button */}
                  <Button
                    onClick={camera.openCamera}
                    className="p-0 m-0 min-w-0 h-auto bg-transparent shadow-none hover:shadow-none"
                  >
                    <Camera className="h-10 w-10 text-white bg-primary rounded-full p-2" />
                  </Button>

                  {/* Input Container */}
                  <div className="flex-1 flex items-center px-3 bg-white dark:bg-black-100 rounded-full h-14 shadow-lg">
                    <input
                      ref={inputRef}
                      placeholder={isRecording ? `Recording... ${recordingTime}s` : "Type a message"}
                      className="w-full bg-transparent focus:outline-none font-normal text-lg text-black-100 dark:text-gray-100 px-2"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />

                    <HeaderIcon tooltip="Attach" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-6 w-6" />
                    </HeaderIcon>
                  </div>

                  {/* Mic/Send Button */}
                  <div className="flex items-center">
                    {!text && selectedFiles.length === 0 ? (
                      <IconButton
                        variant="text"
                        className="rounded-full bg-primary text-white"
                        onClick={toggleRecording}
                      >
                        {isRecording ? (
                          <Square className="h-6 w-6 text-red-700" />
                        ) : (
                          <Mic className="h-6 w-6" />
                        )}
                      </IconButton>
                    ) : (
                      <Button
                        onClick={handleSend}
                        className="rounded-lg bg-primary h-12 px-6 text-md"
                      >
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {!orderSent && (
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*"
                  multiple
                />
              )}
            </div>
          )}
        </div>

        {renderCameraUI()}
        {renderPreviewUI()}
      </div>

      {showLocationModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden relative ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
            <RequestLocation
              darkMode={darkMode}
              onLocationComplete={handleLocationModalComplete}
              onCancel={handleLocationModalCancel}
            />
          </div>
        </div>
      )}
    </Onboarding>
  );
}