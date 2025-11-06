// PracticeTab.tsx
"use client";
import React, { useEffect, useState } from "react";
import { ollAlgs, type AlgItem } from "./data/ollAlgs";
import { pllAlgs } from "./data/pllAlgs";
import { f2lAlgs } from "./data/f2lAlgs";

const dataByCategory: Record<string, Record<string, AlgItem[]>> = {
  "3x3": {
    F2L: f2lAlgs,
    OLL: ollAlgs,
    PLL: pllAlgs
  },
  "2x2": {
    Ortega: [],
    CLL: []
  },
  "4x4": {
    Parity: [],
    PLL: []
  }
};

export default function PracticeTab() {
  // Danh mục và subcategory
  const categories = [
    { name: "3x3", sub: ["F2L", "OLL", "PLL"] },
    { name: "2x2", sub: ["Ortega", "CLL"] },
    { name: "4x4", sub: ["Parity", "PLL"] },
  ];

  // State chọn danh mục và sub
  const [selectedCat, setSelectedCat] = useState("3x3");
  const [selectedSub, setSelectedSub] = useState("OLL");
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [isCompactWidth, setIsCompactWidth] = useState(false);

  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;
      const viewportWidth = window.innerWidth;
      setIsMobileLandscape(mobile && !portrait && viewportWidth < 1200);
      setIsCompactWidth(viewportWidth <= 768);
    }

    if (typeof window !== "undefined") {
      checkDevice();
      window.addEventListener("resize", checkDevice);
      window.addEventListener("orientationchange", checkDevice);
      return () => {
        window.removeEventListener("resize", checkDevice);
        window.removeEventListener("orientationchange", checkDevice);
      };
    }
  }, []);

  const mobileShrink = isMobileLandscape || isCompactWidth;
  const gridClassName = mobileShrink ? "grid grid-cols-2 gap-3 sm:gap-4" : "grid grid-cols-2 md:grid-cols-2 gap-6";
  const cardClassName = mobileShrink
    ? "bg-gray-900 rounded-lg p-3 flex flex-col md:flex-row items-start md:items-start md:justify-between text-left shadow-lg gap-2"
    : "bg-gray-900 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between shadow-lg";
  const titleClassName = mobileShrink ? "text-sm font-bold mb-1 text-white text-left" : "text-lg font-bold mb-1 text-white";
  const algTextClassName = mobileShrink
    ? "text-sm font-mono mb-2 text-gray-200 text-left space-y-1"
    : "text-lg font-mono mb-2 text-gray-200 text-left space-y-1";
  const imageClassName = mobileShrink ? "w-16 h-16 object-contain md:ml-4 self-start" : "w-24 h-24 object-contain ml-4";

  // Hiển thị công thức theo danh mục và sub
  const algs = dataByCategory[selectedCat]?.[selectedSub] ?? [];
  // Các trường hợp khác sẽ cập nhật sau

  return (
    <div className="w-full max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <select
          className="bg-gray-800 text-white rounded px-3 py-1"
          value={selectedCat}
          onChange={e => {
            setSelectedCat(e.target.value);
            // Reset sub khi đổi danh mục
            setSelectedSub(categories.find(c => c.name === e.target.value)?.sub[0] || "");
          }}
        >
          {categories.map((cat) => (
            <option key={cat.name}>{cat.name}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 text-white rounded px-3 py-1"
          value={selectedSub}
          onChange={e => setSelectedSub(e.target.value)}
        >
          {(categories.find(c => c.name === selectedCat)?.sub || []).map((sub) => (
            <option key={sub}>{sub}</option>
          ))}
        </select>
      </div>
      {/* Alg List */}
      <div className={gridClassName}>
        {algs.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-8 text-lg">Sẽ cập nhật sau...</div>
        ) : (
          algs.map((alg) => (
            <div key={alg.id} className={cardClassName}>
              <div className="flex-1">
                <div className={titleClassName}>{alg.name}</div>
                <div className={algTextClassName}>
                  {[alg.alg, ...(alg.altAlgs ?? [])].map((formula, idx) => (
                    <div key={idx}>{formula}</div>
                  ))}
                </div>
              </div>
              <img src={alg.img} alt="alg" className={imageClassName} />
             </div>
           ))
         )}
       </div>
     </div>
   );
 }
