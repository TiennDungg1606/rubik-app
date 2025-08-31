import React from "react";

export default function AboutTab() {
  return (
  <section className="w-full max-w-7xl p-15 mt-2 mb-4 rounded-xl bg-neutral-900/30 shadow-xl border border-neutral-700 mx-auto">
      <h2 className="text-3xl font-extrabold text-white-400 mb-6 flex items-center gap-2">
       📚 Giới thiệu
      </h2>
      <div className="text-white text-base font-bold mb-4">RubikApp là ứng dụng web hỗ trợ đo thời gian giải Rubik, lưu trữ kết quả, tham gia solo phòng 1vs1 và cập nhật tin tức Rubik quốc tế.</div>
      <ul className="list-disc list-inside text-white text-base ml-4 mb-6">
        <li>Hỗ trợ đo thời gian chuẩn WCA cho desktop và mobile.</li>
        <li>Lưu trữ kết quả, tính toán best, ao5, ao12.</li>
        <li>Cập nhật tin tức Rubik quốc tế tự động.</li>
        <li>Giao diện hiện đại, responsive, dễ sử dụng.</li>
      </ul>
      <div className="text-white text-sm mt-2 font-bold flex flex-wrap items-center gap-2">
        Tác giả: Chu Tiến Dũng | Mọi thắc mắc và góp ý xin liên hệ:
        <a href="https://facebook.com/tienndungg258" className="text-blue-400 hover:underline flex items-center gap-1 mr-2" target="_blank" rel="noopener noreferrer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="inline text-blue-500"><path d="M22.675 0h-21.35c-.733 0-1.325.592-1.325 1.326v21.348c0 .733.592 1.326 1.325 1.326h11.495v-9.294h-3.128v-3.622h3.128v-2.672c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.326v-21.349c0-.734-.593-1.326-1.324-1.326z"/></svg>
          Facebook
        </a>
        <a href="https://www.tiktok.com/@tienndungg2006" className="text-pink-400 hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="currentColor" className="inline text-pink-400"><path d="M41.5 15.5c-3.6 0-6.5-2.9-6.5-6.5h-5v25.1c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.7 0 1.4.2 2 .5v-5.3c-.7-.1-1.3-.2-2-.2-5.1 0-9.2 4.1-9.2 9.2s4.1 9.2 9.2 9.2 9.2-4.1 9.2-9.2v-13.7c2.1 1.3 4.5 2.1 7.1 2.1v-5z"/></svg>
          Tiktok
        </a>
      </div>
      {/* QR chuyển tiền */}
      <div className="mt-8 flex flex-col items-center justify-center">
        <span className="text-green-400 font-bold mb-2">Ủng hộ tác giả - Quét mã QR chuyển khoản</span>
        <img src="/qr-chuyen-tien.png" alt="QR chuyển khoản ủng hộ" className="w-48 h-48 rounded-lg border-4 border-green-400 shadow-lg bg-white object-contain" style={{maxWidth:192, maxHeight:192}} />
        <span className="text-xs text-gray-300 mt-2">Cảm ơn bạn đã ủng hộ!</span>
      </div>
    </section>
  );
}
