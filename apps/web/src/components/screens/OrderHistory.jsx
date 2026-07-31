import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IconButton } from "@material-tailwind/react";
import {
  ArrowLeft, Search, SlidersHorizontal, X, ChevronRight,
  Package, Truck, ChevronDown, Inbox, AlertCircle,
} from "lucide-react";
import { fetchUserOrderHistory } from "../../Redux/orderSlice";

console.log("order history rendering")

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "awaiting_runner", label: "Awaiting Runner" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "disputed", label: "Disputed" },
];


const TASK_TYPE_OPTIONS = [
  { value: "run-errand", label: "Run Errand" },
  { value: "pick-up", label: "Pick-up" },
];

const STATUS_STYLES = {
  draft: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  payment_pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  awaiting_runner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  disputed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABEL = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s.value]: s.label }), {});

const formatNaira = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;
const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
};
const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const DEFAULT_FILTERS = {
  status: "",
  taskType: "",
  dateFrom: "",
  dateTo: "",
};

function FilterPanel({ filters, onChange, onClear, darkMode, onClose }) {
  return (
    <div className={`rounded-2xl p-4 border ${darkMode ? "bg-black-100 border-white/10" : "bg-white border-gray-200"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-black-200"}`}>Filters</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClear} className="text-xs font-medium text-primary">Clear all</button>
          {onClose && (
            <IconButton variant="text" size="sm" className="rounded-full lg:hidden" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={`text-xs font-semibold mb-1.5 block ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode
              ? "bg-black-200 border-white/10 text-white"
              : "bg-gray-50 border-gray-200 text-black-200"
              }`}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`text-xs font-semibold mb-1.5 block ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Task type
          </label>
          <select
            value={filters.taskType}
            onChange={(e) => onChange({ taskType: e.target.value })}
            className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode
              ? "bg-black-200 border-white/10 text-white"
              : "bg-gray-50 border-gray-200 text-black-200"
              }`}
          >
            <option value="">All task types</option>
            {TASK_TYPE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`text-xs font-semibold mb-1.5 block ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Date range
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-medium mb-1 block ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                From
              </span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ dateFrom: e.target.value })}
                className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode
                  ? "bg-black-200 border-white/10 text-white"
                  : "bg-gray-50 border-gray-200 text-black-200"
                  }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-medium mb-1 block ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                To
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ dateTo: e.target.value })}
                className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode
                  ? "bg-black-200 border-white/10 text-white"
                  : "bg-gray-50 border-gray-200 text-black-200"
                  }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, isActive, onClick, darkMode }) {
  const runnerLabel = order.runner
    ? `${order.runner.name}${order.runner.fleetType ? ` · ${order.runner.fleetType}` : ""}`
    : "—";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors flex items-center gap-3 ${isActive
        ? "border-primary bg-primary/5"
        : darkMode
          ? "border-white/5 hover:border-white/15 bg-black-100"
          : "border-gray-100 hover:border-gray-300 bg-white"
        }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-mono text-xs font-semibold truncate ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            {order.orderId}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${STATUS_STYLES[order.status] || STATUS_STYLES.draft}`}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={darkMode ? "text-gray-500" : "text-gray-400"}>{formatDate(order.createdAt)}</span>
          <span className={darkMode ? "text-gray-500" : "text-gray-400"}>•</span>
          <span className={`capitalize ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            {order.serviceType?.replace("-", " ")}
          </span>
          <span className={darkMode ? "text-gray-500" : "text-gray-400"}>•</span>
          <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{runnerLabel}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-black-200"}`}>
          {formatNaira(order.totalAmount)}
        </p>
      </div>
      <ChevronRight className={`h-4 w-4 flex-shrink-0 ${darkMode ? "text-gray-600" : "text-gray-300"}`} />
    </button>
  );
}

function OrderDetail({ order, onBack, darkMode }) {
  if (!order) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="lg:hidden flex items-center gap-2 p-4 border-b dark:border-white/10 border-gray-100">
        <IconButton variant="text" size="sm" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <span className={`font-bold text-sm ${darkMode ? "text-white" : "text-black-200"}`}>Order details</span>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        <div className={`rounded-2xl p-4 ${darkMode ? "bg-black-100" : "bg-gray-50"}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className={`font-mono text-sm font-bold ${darkMode ? "text-white" : "text-black-200"}`}>
                {order.orderId}
              </p>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Placed {formatDateTime(order.createdAt)}
              </p>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${STATUS_STYLES[order.status] || STATUS_STYLES.draft}`}>
              {STATUS_LABEL[order.status] || order.status}
            </span>
          </div>
        </div>

        <DetailRow icon={<Package className="h-4 w-4" />} label="Service Type" darkMode={darkMode}>
          <span className="capitalize font-semibold">{order.serviceType?.replace("-", " ")}</span>
        </DetailRow>

        <DetailRow icon={<Truck className="h-4 w-4 text-indigo-500" />} label="Assigned Runner" darkMode={darkMode}>
          {order.runner ? (
            <span>
              {order.runner.name}
              {order.runner.fleetType && (
                <span className={darkMode ? "text-gray-500" : "text-gray-400"}> · {order.runner.fleetType}</span>
              )}
            </span>
          ) : (
            <span className={darkMode ? "text-gray-500" : "text-gray-400"}>—</span>
          )}
        </DetailRow>

        <div className={`rounded-2xl p-4 ${darkMode ? "bg-black-100" : "bg-gray-50"}`}>
          <div className="flex justify-between text-sm font-bold">
            <span className={darkMode ? "text-white" : "text-black-200"}>Total</span>
            <span className="text-primary">{formatNaira(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children, darkMode }) {
  return (
    <div className={`rounded-2xl p-4 ${darkMode ? "bg-black-100" : "bg-gray-50"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold mb-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
          <div className={`text-sm ${darkMode ? "text-gray-200" : "text-black-200"}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// Main
export default function UserOrderHistory({ darkMode, onBack, userId }) {
  const dispatch = useDispatch();
  const { userOrders, userOrdersLoading, userOrdersError, userOrdersNextCursor } = useSelector((s) => s.order);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!userId) {
      console.log('[UserOrderHistory effect] bailing, no userId');
      return;
    }

    dispatch(fetchUserOrderHistory({
      userId,
      status: filters.status || undefined,
      taskType: filters.taskType || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      search: debouncedSearch || undefined,
      limit: 20,
    }));
  }, [dispatch, userId, filters.status, filters.taskType, filters.dateFrom, filters.dateTo, debouncedSearch]);

  const handleSelectOrder = useCallback((order) => {
    setSelectedOrder(order);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!userId || !userOrdersNextCursor || userOrdersLoading) return;
    dispatch(fetchUserOrderHistory({
      userId,
      status: filters.status || undefined,
      taskType: filters.taskType || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      search: debouncedSearch || undefined,
      cursor: userOrdersNextCursor,
      limit: 20,
    }));
  }, [dispatch, userId, filters, debouncedSearch, userOrdersNextCursor, userOrdersLoading]);

  const isInitialLoading = userOrdersLoading && userOrders.length === 0;

  return (
    <div className={`h-screen flex flex-col ${darkMode ? "bg-black-200" : "bg-white"}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 ${darkMode ? "border-white/10" : "border-gray-100"}`}>
        <IconButton variant="text" size="sm" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <h1 className={`font-bold text-lg flex-1 ${darkMode ? "text-white" : "text-black-200"}`}>
          Order History
        </h1>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[380px_1fr]">
        <div className={`flex flex-col min-h-0 border-r ${darkMode ? "border-white/10" : "border-gray-100"} ${selectedOrder ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search by order ID"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${darkMode
                  ? "bg-black-100 border-white/10 text-white placeholder:text-gray-500"
                  : "bg-gray-50 border-gray-200 text-black-200 placeholder:text-gray-400"
                  }`}
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium border ${darkMode
                ? "bg-black-100 border-white/10 text-gray-200"
                : "bg-gray-50 border-gray-200 text-black-200"
                }`}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {showFilters && (
              <FilterPanel filters={filters} onChange={updateFilters} onClear={clearFilters} darkMode={darkMode} />
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {isInitialLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {!isInitialLoading && userOrdersError && (
              <div className="flex flex-col items-center text-center py-12 gap-2">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Couldn't load your orders. {userOrdersError}
                </p>
              </div>
            )}

            {!isInitialLoading && !userOrdersError && userOrders.length === 0 && (
              <div className="flex flex-col items-center text-center py-16 gap-2">
                <Inbox className={`h-10 w-10 ${darkMode ? "text-gray-700" : "text-gray-300"}`} />
                <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {activeFilterCount > 0 || debouncedSearch
                    ? "No orders match your filters"
                    : "No orders yet"}
                </p>
                {(activeFilterCount > 0 || debouncedSearch) && (
                  <button onClick={clearFilters} className="text-xs font-semibold text-primary">
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!isInitialLoading && !userOrdersError && userOrders.map((order) => (
              <OrderRow
                key={order.orderId}
                order={order}
                isActive={selectedOrder?.orderId === order.orderId}
                onClick={() => handleSelectOrder(order)}
                darkMode={darkMode}
              />
            ))}

            {userOrdersNextCursor && !isInitialLoading && (
              <button
                onClick={handleLoadMore}
                disabled={userOrdersLoading}
                className={`w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 ${darkMode ? "text-gray-300 hover:bg-black-100" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {userOrdersLoading ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        </div>

        <div className={`min-h-0 ${selectedOrder ? "block" : "hidden lg:block"}`}>
          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} darkMode={darkMode} />
          ) : (
            <div className="h-full hidden lg:flex flex-col items-center justify-center gap-2">
              <Package className={`h-10 w-10 ${darkMode ? "text-gray-700" : "text-gray-300"}`} />
              <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                Select an order to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}