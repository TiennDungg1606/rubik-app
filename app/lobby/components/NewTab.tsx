import React from "react";
import { useState, useEffect } from "react";

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
    title: "Battle Pairs Online 2v2",
    detail: "🥇 Trần Chấn Cơ & Võ Thế Châu | 🥈 Trần Trúc Vỹ & Phạm Thành Đạt | 🥉 Hoàng Đức Chính & Đào Ánh Dương",
    date: "Kết thúc: 23/11/2025",
    link: "https://www.facebook.com/groups/779814041253620/permalink/856337240267966/?rdid=cDHqNRQKf1lUHHnR#"
  }
];

const featureUpdates = [
  "Cập nhật hồ sơ và avatar để mở khóa huy hiệu mới",
  "Đang hoàn thiện công thức cho tab Practice",
  "Đang phát triển kết bạn + nhắn tin + thông báo trên server Rubik App",
  "Tối ưu hóa UI/UX cho desktop, tablet, mobile"
];

const nextUpdates = [
  "T1/2026: làm mới hoàn toàn Tab Timer với chế độ Split + Graph",
  "Cập nhật bảo mật tài khoản người dùng",
];

const infoChips = [
  { label: "Máy chủ", value: "Online 24/7" },
  { label: "Người chơi", value: "437" },
  { label: "Bản build", value: "v0.8.5" }
];



export default function NewTab() {

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
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
  const chipGridCols = mobileShrink ? "grid-cols-3" : "sm:grid-cols-3";
  const dualPanelGridCols = mobileShrink ? "grid-cols-2" : "lg:grid-cols-2";

  return (
    <section className="relative w-full space-y-8">
      <div className={`${mobileShrink ? "px-2" : "px-1"} `}>
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
          <div className="absolute inset-y-0 w-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,.35),_transparent_60%)] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,.3),_transparent_55%)] blur-3xl" />
        </div>

        <div className="relative z-[1] flex flex-col gap-3">
          <header className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Command Center</p>
              <h2 className={`mt-1 flex items-center gap-3 ${mobileShrink ? "text-2xl" : "text-3xl"} font-black text-white`}>
                <span className={`rounded-full bg-cyan-500/10 ${mobileShrink ? 'p-1' : 'p-2'} text-cyan-300`}>⚡</span>
                Tin tức & Cập nhật
              </h2>
            </div>
          </header>

          <div className={`grid gap-3 text-sm ${chipGridCols}`}>
            {infoChips.map(chip => (
              <div
                key={chip.label}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent text-white ${mobileShrink ? "px-3 py-2" : "px-4 py-3"}`}
              >
                <p className={`${mobileShrink ? "text-[11px]" : "text-xs"} uppercase tracking-widest text-white/60`}>{chip.label}</p>
                <p className={`${mobileShrink ? "text-base" : "text-lg"} font-semibold text-cyan-200`}>{chip.value}</p>
              </div>
            ))}
          </div>

          <div className={`grid gap-6 ${dualPanelGridCols}`}>
            <div className={`rounded-2xl border border-cyan-500/30 bg-slate-900/60 ${mobileShrink ? "p-3" : "p-5"}`}>
              <div className="flex items-center gap-3">
                <span className={`${mobileShrink ? "h-8 w-8 text-xl leading-[32px]" : "h-10 w-10 text-2xl leading-[40px]"} rounded-full bg-cyan-500/20 text-center`}>🛠️</span>
                <div>
                  <p className="text-sm uppercase tracking-wider text-cyan-200">Nhật ký triển khai</p>
                  <h3 className={`${mobileShrink ? "text-lg" : "text-xl"} font-semibold text-white`}>Cập nhật website</h3>
                </div>
              </div>
              <ul className={`${mobileShrink ? "mt-3 space-y-2" : "mt-4 space-y-3"} text-sm text-white/90`}>
                {featureUpdates.map((item, idx) => (
                  <li key={`feature-${idx}`} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl border border-violet-500/30 bg-slate-900/60 ${mobileShrink ? "p-3" : "p-5"}`}>
              <div className="flex items-center gap-3">
                <span className={`${mobileShrink ? "h-8 w-8 text-xl leading-[32px]" : "h-10 w-10 text-2xl leading-[40px]"} rounded-full bg-violet-500/20 text-center`}>🚀</span>
                <div>
                  <p className="text-sm uppercase tracking-wider text-violet-200">Roadmap</p>
                  <h3 className={`${mobileShrink ? "text-lg" : "text-xl"} font-semibold text-white`}>Dự kiến bản cập nhật</h3>
                </div>
              </div>
              <ul className={`${mobileShrink ? "mt-3 space-y-2" : "mt-4 space-y-3"} text-sm text-white/90`}>
                {nextUpdates.map((item, idx) => (
                  <li key={`roadmap-${idx}`} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-violet-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`grid gap-6 ${dualPanelGridCols}`}>
            <div className={`rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 to-slate-900/60 ${mobileShrink ? "p-3" : "p-5"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center rounded-xl bg-emerald-500/20 text-2xl ${mobileShrink ? "h-8 w-8 text-xl" : "h-10 w-10"}`}>🎯</div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Đấu trường</p>
                  <h3 className={`${mobileShrink ? "text-lg" : "text-xl"} font-semibold text-white`}>Giải đấu sắp diễn ra</h3>
                </div>
              </div>
              <ul className={`${mobileShrink ? "mt-4 space-y-3" : "mt-5 space-y-4"}`}>
                {upcomingNews.map((item, idx) => (
                  <li key={`upcoming-${idx}`} className={`rounded-2xl border border-white/10 bg-white/5 ${mobileShrink ? "p-3" : "p-4"}`}>
                    <p className={`${mobileShrink ? "text-base" : "text-lg"} font-bold text-emerald-200`}>{item.title}</p>
                    <p className="text-sm text-white/80">{item.detail}</p>
                    {item.date && <p className="text-xs text-white/50">{item.date}</p>}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-900/40 to-slate-900/60 ${mobileShrink ? "p-3" : "p-5"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center rounded-xl bg-rose-500/20 text-2xl ${mobileShrink ? "h-8 w-8 text-xl" : "h-10 w-10"}`}>🏁</div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-rose-200">Replay Center</p>
                  <h3 className={`${mobileShrink ? "text-lg" : "text-xl"} font-semibold text-white`}>Các giải đấu vừa kết thúc</h3>
                </div>
              </div>
              <ul className={`${mobileShrink ? "mt-4 space-y-3" : "mt-5 space-y-4"}`}>
                {finishedNews.map((item, idx) => (
                  <li key={`finished-${idx}`} className={`rounded-2xl border border-white/10 bg-white/5 ${mobileShrink ? "p-3" : "p-4"}`}>
                    <p className={`${mobileShrink ? "text-base" : "text-lg"} font-bold text-rose-200`}>{item.title}</p>
                    <p className="text-sm text-white/80">{item.detail}</p>
                    {item.date && <p className="text-xs text-white/50">{item.date}</p>}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-xs font-semibold text-rose-200 hover:text-rose-100"
                      >
                        Xem tổng kết chi tiết →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
