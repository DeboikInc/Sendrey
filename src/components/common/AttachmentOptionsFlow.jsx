import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image } from 'lucide-react';

/**
 * Renders a bottom sheet flow for attachment options (Camera/Gallery).
 * Mimics the animation and backdrop behavior of the OrderStatusFlow component.
 *
 * @param {boolean} isOpen - Controls visibility.
 * @param {function} onClose - Function to close the sheet.
 * @param {boolean} darkMode - Controls styling.
 * @param {function} onSelectCamera - Callback for selecting the Camera.
 * @param {function} onSelectGallery - Callback for selecting the Gallery.
 */

export default function AttachmentOptionsFlow({
    isOpen,
    onClose,
    darkMode,
    onSelectCamera,
    onSelectGallery,
}) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                // Backdrop Container (fades in/out)
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    // Absolute positioning to cover the screen
                    className="absolute inset-0 bg-black/50 z-50 flex items-end"
                    // Clicking the backdrop closes the sheet
                    onClick={onClose}
                >
                    {/* Bottom Sheet Modal (slides up/down) */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        // Prevent click propagation from closing the sheet when clicking inside
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-t-3xl p-6"
                    >
                        {/* Options Container */}
                        <div className={`${darkMode ? 'bg-black-100' : 'bg-white'} rounded-2xl p-4`}>
                            <div className="text-center mb-6">
                                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
                                    Options
                                </h3>
                                <p className='border-b border-gray-600 p-2'></p>
                            </div>

                            {/* --- Option 1: Camera --- */}
                            <button
                                onClick={onSelectCamera}
                                className={`w-full flex items-center justify-center gap-3 text-center p-4 mb-3 rounded-xl ${darkMode ? 'bg-black-200 text-white' : 'bg-gray-100 text-black'
                                    } transition-colors`}
                            >
                                <Camera className="h-6 w-6 text-blue-500" />
                                <p className="text-lg font-medium">
                                    Take Photo
                                </p>
                            </button>

                            {/* --- Option 2: Gallery/Files --- */}
                            <button
                                onClick={onSelectGallery}
                                className={`w-full flex items-center justify-center gap-3 text-center p-4 rounded-xl ${darkMode ? 'bg-black-200 text-white' : 'bg-gray-100 text-black'
                                    } transition-colors`}
                            >
                                <Image className="h-6 w-6 text-green-500" />
                                <p className="text-lg font-medium">
                                    Choose from Gallery
                                </p>
                            </button>

                        </div>

                        {/* Transparent blurred spacer */}
                        <div className="h-8 backdrop-blur-sm"></div>

                        {/* Cancel Button */}
                        <button
                            onClick={onClose}
                            className={`w-full text-center p-4 rounded-xl border border-red-600 ${darkMode ? 'bg-black-100' : 'bg-white'}`}
                        >
                            <p className="font-medium text-red-600">
                                Cancel
                            </p>
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}