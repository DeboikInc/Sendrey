import { motion, AnimatePresence } from "framer-motion";
import { Phone, X } from "lucide-react";

export default function RunnerContactInformation({
    isOpen,
    onClose,
    runnerPhone,
    darkMode,
}) {
    const handleCall = () => {
        window.location.href = `tel:${runnerPhone}`;
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

                            {runnerPhone ? (
                                <button
                                    onClick={handleCall}
                                    className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl transition-colors ${darkMode ? 'bg-black-200 hover:bg-black-200/80' : 'bg-gray-1001 hover:bg-gray-100'}`}
                                >
                                    <div className="min-w-0 text-left">
                                        <p className={`text-sm ${darkMode ? 'text-gray-1002' : 'text-gray-600'}`}>
                                            Assigned runner
                                        </p>
                                        <p className={`text-xl font-bold tracking-wide mt-0.5 ${darkMode ? 'text-white' : 'text-black-200'}`}>
                                            {runnerPhone}
                                        </p>
                                    </div>
                                    <span className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                                        <Phone className="h-5 w-5 text-primary" />
                                    </span>
                                </button>
                            ) : (
                                <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Runner's contact information isn't available yet.
                                </p>
                            )}
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