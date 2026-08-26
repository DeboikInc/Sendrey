// contexts/MediaContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import MediaPermissionModal from '../components/common/MediaPermissionModal';

const MediaContext = createContext(null);

const MEDIA_CONSTRAINTS = {
    camera: { video: { facingMode: 'environment' }, audio: false },
    audio: { audio: true, video: false },
    video: { video: true, audio: true }, // video calls
};

// Not every browser throws the same error name for the same problem —
// this normalizes them into a small set of reasons the modal understands.
const ERROR_REASON_MAP = {
    NotAllowedError: 'denied',
    PermissionDeniedError: 'denied',
    NotFoundError: 'no_device',
    DevicesNotFoundError: 'no_device',
    NotReadableError: 'in_use',
    TrackStartError: 'in_use',
    OverconstrainedError: 'no_device',
    SecurityError: 'insecure_context',
};

function classifyError(err) {
    if (window.isSecureContext === false) return 'insecure_context';
    if (!err?.name) return 'unknown';
    return ERROR_REASON_MAP[err.name] || 'unknown';
}

export const classifyMediaError = classifyError;

export function MediaProvider({ children }) {
    const [modalState, setModalState] = useState(null); // { mediaType, reason, resolve, reject } | null
    const activeStreamsRef = useRef({});

    const requestMediaAccess = useCallback((mediaType, opts = {}) => {
        const { constraints: constraintOverrides = {}, silent = false } = opts;
        return new Promise((resolve, reject) => {
            const constraints = {
                ...(MEDIA_CONSTRAINTS[mediaType] || MEDIA_CONSTRAINTS.camera),
                ...constraintOverrides,
            };
            navigator.mediaDevices.getUserMedia(constraints)
                .then((stream) => { activeStreamsRef.current[mediaType] = stream; resolve(stream); })
                .catch((err) => {
                    const reason = classifyError(err);
                    console.error(`[MediaContext] getUserMedia failed for ${mediaType}:`, err?.name, err?.message);
                    if (silent) {
                        reject({ reason, mediaType, original: err });
                        return;
                    }
                    setModalState({ mediaType, reason, resolve, reject });
                });
        });
    }, []);

    const stopMediaStream = useCallback((mediaType) => {
        const stream = activeStreamsRef.current[mediaType];
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            delete activeStreamsRef.current[mediaType];
        }
    }, []);

    const handleRetry = useCallback(() => {
        if (!modalState) return;
        const { mediaType, resolve, reject } = modalState;
        setModalState(null);
        navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS[mediaType] || MEDIA_CONSTRAINTS.camera)
            .then((stream) => {
                activeStreamsRef.current[mediaType] = stream;
                resolve(stream);
            })
            .catch((err) => {
                setModalState({ mediaType, reason: classifyError(err), resolve, reject });
            });
    }, [modalState]);

    const handleDismiss = useCallback(() => {
        if (!modalState) return;
        const { reject } = modalState;
        setModalState(null);
        reject(new Error('Media permission modal dismissed'));
    }, [modalState]);

    return (
        <MediaContext.Provider value={{ requestMediaAccess, stopMediaStream }}>
            {children}
            {modalState && (
                <MediaPermissionModal
                    mediaType={modalState.mediaType}
                    reason={modalState.reason}
                    onRetry={handleRetry}
                    onDismiss={handleDismiss}
                />
            )}
        </MediaContext.Provider>
    );
}

export const useMediaContext = () => {
    const ctx = useContext(MediaContext);
    if (!ctx) throw new Error('useMediaContext must be used within a MediaProvider');
    return ctx;
};