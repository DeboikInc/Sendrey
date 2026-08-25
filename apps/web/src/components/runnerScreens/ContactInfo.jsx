import React, { useMemo } from "react";
import { IconButton } from "@material-tailwind/react";
import { X } from "lucide-react";
import useOrderStore from "../../store/orderStore";

const makeCurrentOrder = (id) => (s) => id ? (s._chats[id]?.currentOrder ?? null) : null;
const makeOrderCancelled = (id) => (s) => id ? (s._chats[id]?.orderCancelled ?? false) : false;
const EMPTY_STATUSES = [];
const makeCompletedStats = (id) => (s) => id ? (s._chats[id]?.completedStatuses ?? EMPTY_STATUSES) : EMPTY_STATUSES;

export default function ContactInfo({
  contact, onClose, setActiveModal, onNavigate, onBack, chatId,
  kycStep, isChatActive,
  messages = [], isBotMode, onStartNewOrder, registrationComplete, isConnectLocked, isVerified,
  disputeActive
}) {
  const currentOrderSel = useMemo(() => makeCurrentOrder(chatId), [chatId]);
  const orderCancelledSel = useMemo(() => makeOrderCancelled(chatId), [chatId]);
  const completedStatsSel = useMemo(() => makeCompletedStats(chatId), [chatId]);

  const currentOrder = useOrderStore(currentOrderSel);
  const orderCancelled = useOrderStore(orderCancelledSel);

  const handleModalClick = (modalType) => { onClose?.(); setActiveModal?.(modalType); };
  const handleNavigation = (view) => { onClose?.(); onNavigate?.(view); };

  const isRunErrand =
    currentOrder?.serviceType === "run-errand" || currentOrder?.serviceType === "run_errand" ||
    currentOrder?.taskType === "run_errand" || currentOrder?.taskType === "run-errand";

  const canCancel = isChatActive
    && currentOrder != null
    && !['completed', 'cancelled', 'task_completed'].includes(currentOrder.status)
    && !orderCancelled;

  const completedStatuses = useOrderStore(completedStatsSel);

  const itemApproved =
    currentOrder?.approvalStatus === 'approved' ||
    currentOrder?.status === 'items_approved' ||
    completedStatuses?.includes('items_approved') ||
    completedStatuses?.includes('purchase_completed') ||
    completedStatuses?.includes('arrived_at_delivery_location');

  const showPayout = isRunErrand &&
    isChatActive &&
    currentOrder != null &&
    !['completed', 'cancelled', 'task_completed'].includes(currentOrder.status);

  return (
    <div className="h-screen flex flex-col overflow-y-auto gap-6 marketSelection pb-28">
      <div className="py-3 px-2">
        {onClose && (
          <IconButton variant="text" size="sm" className="rounded-full lg:hidden flex" onClick={onClose}>
            <X className="h-7 w-7" />
          </IconButton>
        )}
      </div>

      <div className="cursor-pointer hover:bg-gray-200 dark:hover:bg-black-100/80 transition-colors" onClick={() => handleNavigation('profile')}>
        <h3 className="px-4 py-5 font-bold text-md text-black-200 dark:text-gray-300">Profile</h3>
      </div>
      <div className="cursor-pointer hover:bg-gray-200 dark:hover:bg-black-100/80 transition-colors" onClick={() => handleNavigation('wallet')}>
        <h3 className="px-4 py-5 font-bold text-md text-black-200 dark:text-gray-300">Wallet</h3>
      </div>
      <div className="cursor-pointer hover:bg-gray-200 dark:hover:bg-black-100/80 transition-colors" onClick={() => handleNavigation('orders')}>
        <h3 className="px-4 py-5 font-bold text-md text-black-200 dark:text-gray-300">Orders</h3>
      </div>

      {showPayout && (
        disputeActive ? (
          <div className="opacity-50 pointer-events-none">
            <h3 className="px-4 py-5 font-bold text-md text-red-400">
              Payout locked — dispute in review
            </h3>
          </div>
        ) : !itemApproved ? (
          <div className="opacity-40 pointer-events-none">
            <h3 className="px-4 py-5 font-bold text-md text-black-100/80 dark:text-gray-300">
              Payout
              {currentOrder?.status === 'purchase_completed'
                ? null
                : currentOrder && [
                  'en_route_to_delivery',
                  'arrived_at_delivery_location',
                  'item_delivered',
                ].includes(currentOrder.status)
                  ? (
                    <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                      (already completed)
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                    </span>
                  )
              }
            </h3>
          </div>
        ) : (
          <div
            className={
              orderCancelled
                ? ''
                : 'cursor-pointer hover:bg-gray-200 dark:hover:bg-black-200 transition-colors'
            }
            onClick={!orderCancelled ? () => handleNavigation('payout') : undefined}
          >
            <h3 className="px-4 py-5 font-bold text-md text-black-200 dark:text-gray-300">Payout</h3>
          </div>
        )
      )}

      <div
        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-black-100/80 transition-colors"
        onClick={() => handleNavigation('disputes')}
      >
        <h3 className="px-4 py-5 font-bold text-md text-black-200 dark:text-gray-300">
          {isChatActive && currentOrder && !['completed', 'cancelled', 'task_completed'].includes(currentOrder?.status)
            ? 'Raise dispute'
            : 'Disputes'}
        </h3>
      </div>

      {canCancel && (
        <div
          className={orderCancelled ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-gray-200 dark:hover:bg-black-200 transition-colors'}
          onClick={!orderCancelled ? () => handleModalClick('cancelOrder') : undefined}
        >
          <p className="px-4 py-5 text-md font-medium text-red-400">Cancel order</p>
        </div>
      )}
    </div>
  );
}