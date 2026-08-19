import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@material-tailwind/react";
import useUserOrderStore from "../../store/userOrderStore";
import { getUserCancellationReasons } from "../../Redux/orderSlice";

const formatReason = (reason) =>
    reason.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function CancelOrderModal({ darkMode, onBack, onConfirm }) {
    const dispatch = useDispatch();
    const [cancelReason, setCancelReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);

    const currentOrder = useUserOrderStore((s) => s.currentOrder);
    const orderCancelled = useUserOrderStore((s) => s.orderCancelled);

    const { cancellationReasons, reasonsLoading, reasonsError } = useSelector((s) => s.order);

    const canCancel = currentOrder != null
        && currentOrder.paymentStatus !== 'paid'
        && !orderCancelled;

    useEffect(() => {
        if (!canCancel) return;
        if (cancellationReasons.length || reasonsLoading) return;
        dispatch(getUserCancellationReasons());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canCancel]);

    const finalReason = cancelReason === "other" ? customReason : cancelReason;
    const canConfirmCancel = finalReason.trim().length > 0;

    const handleConfirm = async () => {
        setIsCancelling(true);
        try {
            await onConfirm?.(finalReason);
        } catch (err) {
            setIsCancelling(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className={`rounded-2xl shadow-xl max-w-sm w-full p-6 ${darkMode ? 'bg-black-100 text-white' : 'bg-white text-gray-900'}`}>
                {canCancel ? (
                    <>
                        <h1 className="text-xl font-bold text-red-900 mb-2">Cancel Order</h1>
                        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Please select a reason for cancelling this order:</p>

                        {reasonsLoading && (
                            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading reasons…</p>
                        )}

                        {reasonsError && !reasonsLoading && (
                            <p className="text-sm mb-4 text-red-500">Couldn't load reasons. Try again.</p>
                        )}

                        {!reasonsLoading && !reasonsError && (
                            <div className="flex flex-col gap-2 mb-4">
                                {cancellationReasons.map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => { setCancelReason(reason); setCustomReason(""); }}
                                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${cancelReason === reason
                                            ? 'border-red-400 bg-red-50 text-red-700'
                                            : darkMode
                                                ? 'border-black-200 text-gray-300 hover:border-gray-500'
                                                : 'border-gray-200 text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        {formatReason(reason)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {cancelReason === "other" && (
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Describe your reason..."
                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-300 resize-none mb-4 ${darkMode
                                    ? 'bg-black-200 border-black-200 text-gray-300 placeholder-gray-500'
                                    : 'border-gray-200 text-gray-700'
                                    }`}
                                rows={3}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <h1 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cancel Order</h1>
                        <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-black'}`}>
                            {currentOrder?.paymentStatus === 'paid'
                                ? 'This order has already been funded and cannot be cancelled. Please raise a dispute instead.'
                                : 'There is no active order to cancel.'
                            }
                        </p>
                    </>
                )}

                <div className="flex justify-end gap-3 font-medium">
                    <Button onClick={onBack} disabled={isCancelling} className="w-full bg-secondary rounded-lg sm:text-sm flex items-center justify-center py-4">
                        {canCancel ? 'No' : 'Close'}
                    </Button>
                    {canCancel && (
                        <Button
                            onClick={handleConfirm}
                            disabled={!canConfirmCancel || isCancelling}
                            className={`w-full bg-primary rounded-lg sm:text-sm flex items-center justify-center py-4 ${(!canConfirmCancel || isCancelling) ? 'opacity-40 pointer-events-none' : ''}`}
                        >
                            {isCancelling ? 'Cancelling...' : 'Yes'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}