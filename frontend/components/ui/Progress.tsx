
"use client";

import React from "react";

export function Progress({ value = 0, className }: { value?: number, className?: string }) {
  return (
    <div className={`w-full bg-slate-800 rounded-full h-2 overflow-hidden ${className}`}>
      <div 
        className="bg-blue-600 h-full transition-all duration-300" 
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
