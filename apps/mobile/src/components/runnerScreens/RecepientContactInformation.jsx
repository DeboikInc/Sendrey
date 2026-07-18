import { motion, AnimatePresence } from "framer-motion";
import { Phone, X } from "lucide-react";

const normaliseServiceType = (raw) => {
    if (!raw) return null;
    const s = String(raw).toLowerCase().replace(/_/g, "-");
    if (s === "run-errand") return "run-errand";
    if (s === "pick-up" || s === "pickup") return "pick-up";
    return null;
};


export default function RecepientContactInformation({
    isOpen,
    onClose,
    darkMode,
    currentRequest,
    counterpart,
}) {
    const serviceType = normaliseServiceType(
        currentRequest?.serviceType ?? currentRequest?.taskType
    );
    const isPickUp = serviceType === "pick-up";

    const deliveryPhone = currentRequest?.dropoffPhone || currentRequest?.deliveryPhone || null;
    const pickupPhone = isPickUp ? (currentRequest?.pickupPhone || null) : null;

    const counterpartName = counterpart
        ? `${counterpart.firstName || ""} ${counterpart.lastName || ""}`.trim() || counterpart.label || "Contact"
        : null;

    const contacts = [
        counterpart?.phone && {
            id: "counterpart",
            label: counterpartName,
            sublabel: counterpart.label || "Contact",
            phone: counterpart.phone,
        },
        
        isPickUp && pickupPhone && {
            id: "pickup",
            label: "Pickup contact",
            sublabel: "Person to meet at pickup",
            phone: pickupPhone,
        },
        deliveryPhone && {
            id: "delivery",
            label: "Delivery contact",
            sublabel: "Recipient at drop-off",
            phone: deliveryPhone,
        },
    ].filter(Boolean);

    const handleCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-[60] flex items-end"
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
                        <div className={`${darkMode ? "bg-black-100" : "bg-white"} rounded-2xl p-4`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-black-200"}`}>
                                    Contact details
                                </h3>
                                <button onClick={onClose} className="p-1">
                                    <X className={`h-5 w-5 ${darkMode ? "text-white" : "text-black-200"}`} />
                                </button>
                            </div>
                            <p className="border-b border-black-100/20 dark:border-gray-600 mb-4" />

                            <div className="flex flex-col gap-3">
                                {contacts.length === 0 && (
                                    <p className={`text-sm text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                        No contact information available yet.
                                    </p>
                                )}

                                {contacts.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleCall(c.phone)}
                                        className="w-full flex items-center justify-between gap-3 p-4 rounded-xl transition-colors bg-gray-100 dark:bg-black-200 hover:opacity-80"
                                    >
                                        <div className="text-left">
                                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                                {c.label} · {c.sublabel}
                                            </p>
                                            <p className={`text-xl font-bold tracking-wide mt-0.5 ${darkMode ? "text-white" : "text-black-200"}`}>
                                                {c.phone}
                                            </p>
                                        </div>
                                        <span className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                                            <Phone className="h-5 w-5 text-primary" />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}