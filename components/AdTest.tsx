"use client";

import { useState } from 'react';
import GoogleAd from './GoogleAd';

export default function AdTest() {
  const [showAd, setShowAd] = useState(false);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Test Quảng Cáo</h3>
      
      <button
        onClick={() => setShowAd(!showAd)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        {showAd ? 'Ẩn Quảng Cáo' : 'Hiển Thị Quảng Cáo'}
      </button>

      {showAd && (
        <div className="mt-4">
          <GoogleAd adSlot="1234567890" />
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>• Click button để test quảng cáo</p>
        <p>• Kiểm tra Console để xem log</p>
        <p>• Kiểm tra Network tab để xem có lỗi không</p>
      </div>
    </div>
  );
}
