"use client";

import { useState } from "react";
import { PoolsTab } from "./PoolsTab";
import { PositionsTab } from "./PositionsTab";

interface HyperionYieldSheetProps {
  close: () => void;
}

export function HyperionYieldSheet({ close }: HyperionYieldSheetProps) {
  const [activeTab, setActiveTab] = useState<"pools" | "positions">("pools");

  return (
    <div className="w-full h-full flex flex-col">
      <div className="pb-6 flex-shrink-0 px-6 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-white text-xl font-semibold">
            Hyperion Yield
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </h2>
          <button 
            onClick={close}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Esc
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-6">
        <button
          onClick={() => setActiveTab("pools")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "pools"
              ? "text-primary border-primary"
              : "text-gray-400 border-transparent hover:text-white"
          }`}
        >
          Pools
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "positions"
              ? "text-primary border-primary"
              : "text-gray-400 border-transparent hover:text-white"
          }`}
        >
          Positions
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {activeTab === "pools" && <PoolsTab />}
        {activeTab === "positions" && <PositionsTab />}
      </div>
    </div>
  );
}