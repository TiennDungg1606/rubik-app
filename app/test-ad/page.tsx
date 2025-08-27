"use client";

import AdTest from "@/components/AdTest";

export default function TestAdPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Test Quảng Cáo Google AdSense</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Hướng dẫn test:</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Mở DevTools (F12)</li>
                <li>Chuyển sang tab Console</li>
                <li>Chuyển sang tab Network</li>
                <li>Click "Hiển Thị Quảng Cáo" bên cạnh</li>
                <li>Quan sát Console và Network tab</li>
                <li>Kiểm tra có lỗi đỏ nào không</li>
              </ol>
            </div>
          </div>
          
          <div>
            <AdTest />
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Thông tin debug:</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Nếu thấy lỗi đỏ trong Network tab, hãy kiểm tra Console để xem chi tiết</p>
            <p>• Các lỗi thường gặp: CORS, timeout, script không load được</p>
            <p>• Đảm bảo không có ad blocker đang hoạt động</p>
            <p>• Kiểm tra Publisher ID và Ad Slot ID có đúng không</p>
          </div>
        </div>
      </div>
    </div>
  );
}
