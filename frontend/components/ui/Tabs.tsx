
"use client";

import React, { createContext, useContext, useState } from "react";
import { motion } from "framer-motion";

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (val: string) => void;
} | null>(null);

export function Tabs({ defaultValue, value, onValueChange, children, className }: any) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value || internalTab;
  const setActiveTab = onValueChange || setInternalTab;

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: any) {
  return (
    <div className={`flex p-1 rounded-xl bg-[--surface-1] border border-[--border-default] ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: any) {
  const context = useContext(TabsContext);
  const isActive = context?.activeTab === value;

  return (
    <button
      onClick={() => context?.setActiveTab(value)}
      className={`
        px-4 py-2 text-sm font-semibold rounded-lg transition-all relative
        ${isActive ? "text-white" : "text-[--text-muted] hover:text-[--text-secondary]"}
        ${className}
      `}
    >
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-[--primary]/80 rounded-lg -z-10 shadow-[--shadow-sm]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: any) {
  const context = useContext(TabsContext);
  if (context?.activeTab !== value) return null;
  return <div className={className}>{children}</div>;
}
