"use client";

import { useState } from "react";

/**
 * @param {{ tabs: { name: string, label: string, content: React.ReactNode }[] }} props
 */
export const TabsComponent = ({ tabs }) => {
  const [active, setActive] = useState(tabs[0]?.name);

  const activeTab = tabs.find((tab) => tab.name === active);

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-2 border-b border-gray-1002 mb-4"
      >
        {tabs.map((tab) => {
          const isActive = tab.name === active;
          return (
            <button
              key={tab.name}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActive(tab.name)}
              className={`relative px-4 py-2 text-sm sm:text-base font-medium transition-colors duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-gray-800 hover:text-secondary"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute left-0 -bottom-[1px] w-full h-[2px] bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
};