import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, PhoneOff } from "lucide-react";

const isMobileWebBrowser = () => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
};

export default function RunnerContactInformation({
    isOpen,
    onClose,
    runnerPhone,
    darkMode,
}) {
    const [desktopNotice, setDesktopNotice] = useState(false);
    const isMobile = useMemo(() => isMobileWebBrowser(), []);

    const handleCallTap = () => {
        if (isMobile) return; // tel: link on the number itself handles this natively
        setDesktopNotice(true);
        setTimeout(() => setDesktopNotice(false), 3000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-end"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-t-3xl p-6"
                    >
                        <div className={`${darkMode ? 'bg-black-100' : 'bg-white'} rounded-2xl p-4`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
                                    Runner Contact
                                </h3>
                                <button onClick={onClose} className="p-1">
                                    <X className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-black-200'}`} />
                                </button>
                            </div>
                            <div className={`border-b mb-4 ${darkMode ? 'border-black-200' : 'border-gray-1001'}`} />

                            {!isMobile && (
                                <div className={`mb-4 rounded-xl p-3 flex items-start gap-3 ${darkMode ? 'bg-black-200' : 'bg-gray-1001'}`}>
                                    <PhoneOff className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Open Sendrey on your mobile browser to call directly. The number below is still visible for you to note down.
                                    </p>
                                </div>
                            )}

                            {runnerPhone ? (
                                <div className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl ${darkMode ? 'bg-black-200' : 'bg-gray-1001'}`}>
                                    <div className="min-w-0">
                                        <p className={`text-sm ${darkMode ? 'text-gray-1002' : 'text-gray-600'}`}>
                                            Assigned runner
                                        </p>
                                        <a
                                            href={`tel:${runnerPhone}`}
                                            onClick={handleCallTap}
                                            className={`block text-xl font-bold tracking-wide mt-0.5 ${darkMode ? 'text-white' : 'text-black-200'} ${isMobile ? "" : "pointer-events-none"
                                                }`}
                                            style={{ userSelect: "text" }}
                                        >
                                            {runnerPhone}
                                        </a>
                                    </div>
                                    <a
                                        href={`tel:${runnerPhone}`}
                                        onClick={handleCallTap}
                                        className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 ${isMobile ? "bg-primary/10" : `${darkMode ? 'bg-black-100' : 'bg-gray-200'} pointer-events-none`
                                            }`}
                                    >
                                        <Phone className={`h-5 w-5 ${isMobile ? "text-primary" : "text-gray-400"}`} />
                                    </a>
                                </div>
                            ) : (
                                <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Runner's contact information isn't available yet.
                                </p>
                            )}

                            <AnimatePresence>
                                {desktopNotice && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-3 text-center text-sm font-medium text-primary"
                                    >
                                        Open Sendrey on your mobile browser to use this feature
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-4" />

                        <button
                            onClick={onClose}
                            className={`w-full text-center p-4 rounded-xl border border-red-600 ${darkMode ? 'bg-black-100' : 'bg-white'}`}
                        >
                            <p className="font-medium text-red-600">Close</p>
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}