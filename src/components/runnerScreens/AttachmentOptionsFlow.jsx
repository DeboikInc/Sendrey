import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck } from 'lucide-react';
import useOrderStore from '../../store/orderStore';

export default function AttachmentOptionsFlow({
    isOpen,
    onClose,
    darkMode,
    onSelectCamera,
    onSelectGallery,
    onSubmitItems,
    showSubmitItems,
    onMarkDelivery,
    showSubmitPickupItem,
    onSubmitPickupItem,
    forceReset,
    chatId,
}) {
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => { }, [forceReset]);

    // Direct store subscriptions — never stale between orders
    const currentOrder = useOrderStore(s => s.getChat(chatId).currentOrder);
    const deliveryMarked = useOrderStore(s => s.getChat(chatId).deliveryMarked);

    const isPaid =
        currentOrder?.paymentStatus === 'paid' ||
        currentOrder?.status === 'active';

    const messages = useOrderStore(s => s.getChat(chatId).messages ?? []);

    const itemSubmissionApproved = messages.some(
        m => (m.type === 'item_submission' || m.messageType === 'item_submission') &&
            m.status === 'approved'
    );


    const pickupItemApproved = messages.some(
        m => (m.type === 'pickup_item_submission' || m.messageType === 'pickup_item_submission') &&
            m.status === 'approved'
    );

    const itemApprovedLatch = useRef(false);
    const pickupApprovedLatch = useRef(false);

    useEffect(() => {
        if (itemSubmissionApproved) itemApprovedLatch.current = true;
    }, [itemSubmissionApproved]);

    useEffect(() => {
        if (pickupItemApproved) pickupApprovedLatch.current = true;
    }, [pickupItemApproved]);

    const deliveryConfirmedMsg = messages.find(
        m => m.type === 'system' && m.id?.startsWith('delivery-confirmed-runner-')
    );
    const approvedByName = deliveryConfirmedMsg?.text?.split(' confirmed')[0] || null;

    const completedOrderStatuses = useOrderStore(s => s.getChat(chatId).completedStatuses ?? []);

    const canMarkDelivery =
        completedOrderStatuses.includes('arrived_at_delivery_location') &&
        (showSubmitItems ? itemApprovedLatch.current : showSubmitPickupItem ? pickupApprovedLatch.current : true);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-50 flex items-end"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-t-3xl p-6"
                    >
                        <div className={`${darkMode ? 'bg-black-100' : 'bg-white'} rounded-2xl p-4`}>
                            <div className="text-center mb-6">
                                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black-200'}`}>
                                    Options
                                </h3>
                                <p className='border-b border-gray-600 p-2'></p>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* run errand */}
                                {showSubmitItems && (
                                    <button
                                        onClick={() => { if (!isPaid || itemSubmissionApproved) return; onSubmitItems(); }}
                                        disabled={!isPaid || itemSubmissionApproved}
                                        className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl transition-colors
                                            ${!isPaid || itemSubmissionApproved
                                                ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-black-200'
                                                : 'bg-gray-100 dark:bg-black-200 hover:opacity-80'
                                            }`}
                                    >
                                        <Package className="h-6 w-6 text-primary" />
                                        <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black-200'}`}>
                                            {itemSubmissionApproved
                                                ? `Item(s) approved${approvedByName ? ` by ${approvedByName}` : ''}`
                                                : !isPaid
                                                    ? 'Submit Item(s) (awaiting payment)'
                                                    : 'Submit Item(s)'}
                                        </p>
                                    </button>
                                )}

                                {showSubmitPickupItem && (
                                    <button
                                        onClick={() => { if (!isPaid || pickupItemApproved) return; onSubmitPickupItem(); }}
                                        disabled={!isPaid || pickupItemApproved}
                                        className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl transition-colors
                                            ${!isPaid || pickupItemApproved
                                                ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-black-200'
                                                : 'bg-gray-100 dark:bg-black-200 hover:opacity-80'
                                            }`}
                                    >
                                        <Package className="h-6 w-6 text-primary" />
                                        <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black-200'}`}>
                                            {pickupItemApproved
                                                ? `Item(s) approved${approvedByName ? ` by ${approvedByName}` : ''}`
                                                : !isPaid
                                                    ? 'Submit Item(s) (awaiting payment)'
                                                    : 'Submit Pickup(s) Item'}
                                        </p>
                                    </button>
                                )}

                                <button
                                    onClick={async () => {
                                        if (!isPaid || deliveryMarked || !canMarkDelivery) return;
                                        try { await onMarkDelivery(); } catch { }
                                    }}
                                    disabled={!isPaid || deliveryMarked || !canMarkDelivery}
                                    className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl transition-colors
                                        ${!isPaid || deliveryMarked || !canMarkDelivery
                                            ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-black-200'
                                            : 'bg-gray-100 dark:bg-black-200 hover:opacity-80'
                                        }`}
                                >
                                    <Truck className="h-6 w-6 text-green-500" />
                                    {deliveryMarked
                                        ? 'Marked as Delivered'
                                        : !isPaid
                                            ? 'Mark as Delivered (awaiting payment)'
                                            : !completedOrderStatuses?.includes('arrived_at_delivery_location')
                                                ? 'Mark as Delivered (get to delivery location first)'
                                                : !canMarkDelivery
                                                    ? 'Mark as Delivered (waiting for item approval)'
                                                    : 'Mark as Delivered'}
                                </button>
                            </div>
                        </div>

                        <div className="h-4" />

                        <button
                            onClick={onClose}
                            className={`w-full text-center p-4 rounded-xl border border-red-600 ${darkMode ? 'bg-black-100' : 'bg-white'}`}
                        >
                            <p className="font-medium text-red-600">Cancel</p>
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}