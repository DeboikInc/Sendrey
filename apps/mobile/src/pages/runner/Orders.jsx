import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IconButton } from "@material-tailwind/react";
import {
    ArrowLeft, Search, SlidersHorizontal, X, ChevronDown, ChevronUp,
    Package, Inbox, AlertCircle,
} from "lucide-react";
import { fetchRunnerOrders, resetRunnerOrders } from "../../Redux/orderSlice";

const STATUS_OPTIONS = [
    { value: "pending_payment", label: "Pending Payment" },
    { value: "paid", label: "Paid" },
    { value: "accepted", label: "Accepted" },
    { value: "shopping", label: "Shopping" },
    { value: "items_submitted", label: "Items Submitted" },
    { value: "items_approved", label: "Items Approved" },
    { value: "en_route_to_pickup", label: "En Route" },
    { value: "picked_up", label: "Picked Up" },
    { value: "en_route_to_delivery", label: "Delivering" },
    { value: "delivered", label: "Delivered" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "disputed", label: "Disputed" },
];

const TASK_TYPE_OPTIONS = [
    { value: "run-errand", label: "Run Errand" },
    { value: "pick-up", label: "Pick-up" },
];

const STATUS_STYLES = {
    pending_payment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    payment_failed: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    shopping: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    items_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    items_approved: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    en_route_to_pickup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    arrived_at_pickup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    picked_up: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    en_route_to_delivery: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    arrived_at_delivery: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    disputed: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_LABEL = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s.value]: s.label }), {});

const DEFAULT_FILTERS = { status: "", taskType: "", dateFrom: "", dateTo: "" };

const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
};

const formatNaira = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

const shortOrderId = (orderId) => {
    if (!orderId) return "—";
    return orderId.split("-").slice(-2).join("-");
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
                        className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode ? "bg-black-200 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-black-200"}`}
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
                        className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode ? "bg-black-200 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-black-200"}`}
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
                            <span className={`text-[10px] font-medium mb-1 block ${darkMode ? "text-gray-500" : "text-gray-400"}`}>From</span>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => onChange({ dateFrom: e.target.value })}
                                className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode ? "bg-black-200 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-black-200"}`}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className={`text-[10px] font-medium mb-1 block ${darkMode ? "text-gray-500" : "text-gray-400"}`}>To</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => onChange({ dateTo: e.target.value })}
                                className={`w-full rounded-lg px-3 py-2 text-sm border ${darkMode ? "bg-black-200 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-black-200"}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const OrderCard = ({ order, darkMode }) => {
    const [expanded, setExpanded] = useState(false);

    const statusInfo = {
        label: STATUS_LABEL[order.status] || order.status,
        color: STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
    };

    const isErrand = order.serviceType === "run-errand";

    const rawItems = isErrand ? order.marketItems : order.pickupItems;
    const itemsText = Array.isArray(rawItems) && rawItems.length > 0
        ? rawItems.map((i) => (typeof i === "object" ? i.name : i)).join("\n")
        : null;

    const hasItems = !!itemsText;

    const formatAmount = (order) => {
        if (order.status === "cancelled") return "—";
        return formatNaira(order.runnerPayout);
    };

    return (
        <div className={`rounded-xl border px-4 py-4 ${darkMode ? "border-white/5 bg-black-100" : "border-gray-100 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-black-100/80 dark:text-gray-500">
                            #{shortOrderId(order.orderId)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-black-200 dark:text-gray-200 capitalize">
                        {isErrand ? "Run Errand" : "Pick Up"}
                    </p>
                    <p className="text-xs text-black-100/80 dark:text-gray-500 mt-0.5">
                        {formatDate(order.createdAt)}
                    </p>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <p className={`text-sm font-semibold ${order.status === "cancelled" ? "text-black-100/60 dark:text-red-500" : "text-green-600 dark:text-green-400"}`}>
                        {formatAmount(order)}
                    </p>
                    {hasItems && (
                        <button
                            onClick={() => setExpanded((prev) => !prev)}
                            className="flex items-center gap-1 text-xs text-primary font-medium"
                        >
                            <Package className="w-3 h-3" />
                            Items
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    )}
                </div>
            </div>

            {expanded && hasItems && (
                <div className={`mt-3 rounded-xl p-3 border ${darkMode ? "border-black-200 bg-black-200" : "border-gray-100 bg-gray-50"}`}>
                    <p className="text-xs font-semibold mb-1 text-black-100/80 dark:text-gray-400">
                        {isErrand ? "Market Items" : "Pickup Items"}
                    </p>
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${darkMode ? "text-gray-200" : "text-black-200"}`}>
                        {itemsText}
                    </p>
                </div>
            )}
        </div>
    );
};

export const Orders = ({ darkMode, onBack, runnerId, registrationComplete }) => {
    const dispatch = useDispatch();
    const runnerOrders = useSelector((s) => s.order.runnerOrders);
    const ordersLoading = useSelector((s) => s.order.ordersLoading);
    const ordersError = useSelector((s) => s.order.ordersError);
    const ordersHasMore = useSelector((s) => s.order.ordersHasMore);
    const ordersPage = useSelector((s) => s.order.ordersPage);

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

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
        if (!registrationComplete || !runnerId) return;
        dispatch(resetRunnerOrders());
        dispatch(fetchRunnerOrders({
            runnerId,
            page: 1,
            status: filters.status || undefined,
            taskType: filters.taskType || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            search: debouncedSearch || undefined,
        }));
    }, [runnerId, registrationComplete, filters.status, filters.taskType, filters.dateFrom, filters.dateTo, debouncedSearch, dispatch]);

    const handleLoadMore = useCallback(() => {
        if (ordersLoading || !ordersHasMore) return;
        dispatch(fetchRunnerOrders({
            runnerId,
            page: ordersPage + 1,
            status: filters.status || undefined,
            taskType: filters.taskType || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            search: debouncedSearch || undefined,
        }));
    }, [ordersLoading, ordersHasMore, ordersPage, runnerId, filters, debouncedSearch, dispatch]);

    const isInitialLoading = ordersLoading && runnerOrders.length === 0;

    const renderContent = () => {
        if (!registrationComplete) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
                    <p className="text-black-100/80 dark:text-gray-400 font-medium">Get Started to view orders</p>
                </div>
            );
        }

        if (isInitialLoading) {
            return (
                <div className="flex-1 flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            );
        }

        if (ordersError && runnerOrders.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-2">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-black-100/80 dark:text-gray-400">Something went wrong, come back later</p>
                </div>
            );
        }

        if (runnerOrders.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-2">
                    <Inbox className={`h-10 w-10 ${darkMode ? "text-gray-700" : "text-gray-300"}`} />
                    <p className="text-black-100/80 dark:text-gray-400 font-medium">
                        {activeFilterCount > 0 || debouncedSearch ? "No orders match your filters" : "No orders yet"}
                    </p>
                    {(activeFilterCount > 0 || debouncedSearch) && (
                        <button onClick={clearFilters} className="text-xs font-semibold text-primary">
                            Clear filters
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {runnerOrders.map((order) => (
                    <OrderCard key={order.orderId} order={order} darkMode={darkMode} />
                ))}

                {ordersHasMore && (
                    <div className="flex justify-center py-4">
                        <button
                            onClick={handleLoadMore}
                            disabled={ordersLoading}
                            className="text-sm text-primary font-medium disabled:opacity-50"
                        >
                            {ordersLoading ? "Loading..." : "Load more"}
                        </button>
                    </div>
                )}

                {!ordersHasMore && runnerOrders.length > 0 && (
                    <p className="text-center text-xs text-black-100/80 dark:text-gray-600 py-4">
                        All orders loaded
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className={`h-full flex flex-col bg-white dark:bg-black-100 ${darkMode ? "dark" : ""}`}>
            <div className="flex items-center border-b border-gray-100 dark:border-white/10 p-3">
                <div onClick={onBack} className="cursor-pointer text-black-200 dark:text-gray-300">
                    <ArrowLeft />
                </div>
                <h1 className="text-lg font-bold mx-auto text-black-200 dark:text-gray-300">Orders</h1>
            </div>

            <div className="p-4 space-y-3 flex-shrink-0">
                <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
                    <input
                        type="text"
                        placeholder="Search by order ID"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${darkMode ? "bg-black-100 border-white/10 text-white placeholder:text-gray-500" : "bg-gray-50 border-gray-200 text-black-200 placeholder:text-gray-400"}`}
                    />
                </div>

                <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium border ${darkMode ? "bg-black-100 border-white/10 text-gray-200" : "bg-gray-50 border-gray-200 text-black-200"}`}
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

            {renderContent()}
        </div>
    );
};