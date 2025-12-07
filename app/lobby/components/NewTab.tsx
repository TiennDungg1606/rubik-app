import React from "react";

type StaticNewsItem = {
  title: string;
  detail: string;
  date?: string;
  link?: string;
};

const upcomingNews: StaticNewsItem[] = [
  {
    title: "Relay 2x2-4x4 tháng 1/2026",
    detail: "Đang cập nhật lịch thi đấu.",
    date: "Cập nhật lần cuối: 07/12/2025"
  }
];

const finishedNews: StaticNewsItem[] = [
  {
    title: "🏁 Battle Pairs Online 2v2",
    detail: "🥇 Trần Chấn Cơ & Võ Thế Châu | 🥈 Trần Trúc Vỹ & Phạm Thành Đạt | 🥉 Hoàng Đức Chính & Đào Ánh Dương",
    date: "Kết thúc:23/11/2025",
    link: "https://www.facebook.com/groups/779814041253620/permalink/856337240267966/?rdid=cDHqNRQKf1lUHHnR#"
  }
];

export default function NewTab() {
  return (
    <section className="w-full max-w-7xl p-5 mt-1 mb-1 rounded-xl bg-neutral-900/30 bg-neutral-900/50 shadow-xl border border-neutral-700 mx-auto">
      <h2 className="text-3xl font-extrabold text-yellow-400 mb-6 flex items-center gap-2">
       🔔 Tin tức & Cập nhật
      </h2>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-blue-300 drop-shadow mb-2">Cập nhật website</h3>
        <ul className="list-disc list-inside text-white text-base ml-4"> 
          <li>Hãy cập nhật profile của mình ở mục hồ sơ.</li> 
          <li>Hoàn thiện các công thức cho tab Paractice (đang thực hiện).</li>
          <li>Thêm tính năng kết bạn trên server của Rubik App, thêm tin nhắn, thông báo (đang thực hiện).</li>   
          <li>Giao diện tối ưu cho cả desktop và mobile, trải nghiệm tốt hơn.</li>
        </ul>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-blue-400 drop-shadow mb-2">Dự kiến cập nhật tiếp theo (T1/2026)</h3>
        <ul className="list-disc list-inside text-white text-base ml-4"> 
          <li>Cập nhật Tab Timer</li>      
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-bold text-green-300 drop-shadow mb-2">Tin tức giải đấu trên Rubik App</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-base font-semibold text-emerald-300 mb-2">1. Các giải đấu sắp tới</h4>
            <ul className="space-y-3 text-white text-base">
              {upcomingNews.map((item, idx) => (
                <li key={`upcoming-${idx}`} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-200/90 flex-shrink-0" />
                  <div>
                    <div className="text-blue-300 font-bold drop-shadow">{item.title}</div>
                    <div className="text-sm text-gray-300 font-normal">{item.detail}</div>
                    {item.date && <div className="text-xs text-gray-500 font-normal">{item.date}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-base font-semibold text-rose-300 mb-2">2. Các giải đấu đã qua</h4>
            <ul className="space-y-3 text-white text-base">
              {finishedNews.map((item, idx) => (
                <li key={`finished-${idx}`} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-rose-200/90 flex-shrink-0" />
                  <div>
                    <div className="text-blue-200 font-bold drop-shadow">{item.title}</div>
                    <div className="text-sm text-gray-400 font-normal">{item.detail}</div>
                    {item.date && <div className="text-xs text-gray-500 font-normal">{item.date}</div>}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-rose-200 decoration-dashed hover:text-rose-100"
                      >
                        Xem tổng kết chi tiết
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
