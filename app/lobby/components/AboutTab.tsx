import { useEffect, useState } from "react";

const metrics = [
  { label: "Ra mắt", value: "07/2025" },
  { label: "Phiên bản", value: "v0.8.5" },
  { label: "Người dùng", value: "436" },
  { label: "Số lượt giải", value: "2K+" }
];

const featureCards = [
  {
    icon: "⏱️",
    title: "Timer chuẩn WCA",
    detail: "Chế độ inspection, keyboard shortcut và đồng bộ biểu đồ best/ao5/ao12.",
    border: "border-cyan-500/30",
    accent: "from-cyan-500/10 via-slate-900/60 to-slate-950"
  },
  {
    icon: "🤝",
    title: "Phòng solo 1vs1",
    detail: "Tạo phòng, gửi link mời, camera + mic ,chat và cập nhật kết quả realtime.",
    border: "border-violet-500/30",
    accent: "from-violet-500/10 via-slate-900/60 to-slate-950"
  },
  {
    icon: "📡",
    title: "Tin tức Rubik",
    detail: "Crawler tổng hợp giải đấu do Rubik App tổ chức, phát hành recap ngay trong tab News.",
    border: "border-emerald-400/30",
    accent: "from-emerald-500/10 via-slate-900/60 to-slate-950"
  },
  {
    icon: "🧊",
    title: "Hồ sơ cá nhân",
    detail: "Profile, huy hiệu và lộ trình luyện tập giúp bạn theo dõi tiến độ từng tuần.",
    border: "border-rose-400/30",
    accent: "from-rose-500/10 via-slate-900/60 to-slate-950"
  }
];

const pillars = [
  {
    label: "Đo thời gian đa nền tảng",
    detail: "Hoạt động mượt mà trên desktop, tablet, mobile với layout chuyên dụng."
  },
  {
    label: "Lưu trữ thống kê sâu",
    detail: "Hệ thống lưu cloud tự động tính PB, ao5, ao12, ao50 và biểu đồ phân bố."
  },
  {
    label: "Kết nối cộng đồng",
    detail: "Mini game và thông báo sự kiện mới giúp người chơi gắn kết hơn."
  },
  {
    label: "Tối ưu trải nghiệm",
    detail: "Giao diện command-center, dark mode chuẩn và thao tác một tay cho mobile."
  }
];

const contactLinks = [
  {
    label: "Facebook",
    href: "https://facebook.com/tienndungg258",
    color: "text-blue-400",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="www.w3.org">
        <circle cx="12" cy="12" r="12" fill="#ffffffff"/>
        <path fill="#0866FF" d="M22.675 0h-21.35C.592 0 0 .592 0 1.326v21.348C0 23.407.592 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.412c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.326V1.326C24 .592 23.407 0 22.675 0Z"/>
      </svg>
    )
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@tienndungg2006",
    color: "text-pink-400",
    icon: (
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="www.w3.org">
        <circle cx="24" cy="24" r="24" fill="#000000"/>
        <path fill="#FFFFFF" d="M41.5 15.5c-3.6 0-6.5-2.9-6.5-6.5h-5v25.1c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.7 0 1.4.2 2 .5v-5.3c-.7-.1-1.3-.2-2-.2-5.1 0-9.2 4.1-9.2 9.2s4.1 9.2 9.2 9.2 9.2-4.1 9.2-9.2v-13.7c2.1 1.3 4.5 2.1 7.1 2.1v-5Z" />
    </svg>

    )
  }
];

export default function AboutTab() {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [isCompactWidth, setIsCompactWidth] = useState(false);

  useEffect(() => {
    function checkDevice() {
      if (typeof window === "undefined") return;
      const portrait = window.innerHeight > window.innerWidth;
      const viewportWidth = window.innerWidth;
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobileLandscape(mobile && !portrait && viewportWidth < 1200);
      setIsCompactWidth(viewportWidth <= 768);
    }

    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);
    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  const mobileShrink = isMobileLandscape || isCompactWidth;
  const containerPadding = mobileShrink ? "p-4" : "p-6";
  const metricsGrid = mobileShrink ? "grid-cols-2" : "sm:grid-cols-4";
  const featureGrid = mobileShrink ? "grid-cols-1" : "md:grid-cols-2";
  const headlineSize = mobileShrink ? "text-2xl" : "text-3xl";
  const subtextSize = mobileShrink ? "text-sm" : "text-base";

  return (
    <section className="relative w-full">
      <div className={`relative rounded-3xl`}>
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
          <div className="absolute -top-20 right-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.35),_transparent_60%)] blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.25),_transparent_60%)] blur-3xl" />
        </div>

        <div className="relative z-[1] flex flex-col gap-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">About Control Room</p>
            <h2 className={`flex items-center gap-3 ${headlineSize} font-black text-white`}>
              <span className={`rounded-full bg-cyan-500/10 ${mobileShrink ? "p-2 text-xl" : "p-3 text-2xl"} text-cyan-300`}>
                📚
              </span>
              Giới thiệu RubikApp
            </h2>
          </header>

          <div className={`grid gap-3 ${metricsGrid}`}>
            {metrics.map(metric => (
              <div
                key={metric.label}
                className={`rounded-2xl border-2 border-white/10 ${mobileShrink ? "px-3 py-2" : "px-4 py-3"} text-white`}
              >
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">{metric.label}</p>
                <p className={`${mobileShrink ? "text-lg" : "text-2xl"} font-semibold text-cyan-100`}>{metric.value}</p>
              </div>
            ))}
          </div>

          <div className={`grid gap-4 ${featureGrid}`}>
            {featureCards.map(card => (
              <article
                key={card.title}
                className={`flex flex-col gap-3 rounded-3xl border ${card.border} bg-gradient-to-b ${card.accent} ${mobileShrink ? "p-4" : "p-5"} text-white`}
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded-2xl bg-white/10 ${mobileShrink ? "p-2 text-xl" : "p-3 text-2xl"}`}>{card.icon}</span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/60">Nổi bật</p>
                    <h3 className={`${mobileShrink ? "text-lg" : "text-xl"} font-semibold`}>{card.title}</h3>
                  </div>
                </div>
                <p className={`${subtextSize} text-white/80`}>{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border-2 border-white/10 p-5 text-white">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-emerald-500/20 p-2 text-xl">🌱</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Triết lý sản phẩm</p>
                  <h3 className={`${mobileShrink ? "text-lg" : "text-xl"} font-semibold`}>4 trụ cột phát triển</h3>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pillars.map(pillar => (
                  <div key={pillar.label} className="rounded-2xl border-2 border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-semibold text-white">{pillar.label}</p>
                    <p className="text-xs text-white/70">{pillar.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid gap-4 ${mobileShrink ? "grid-cols-1" : "md:grid-cols-2"}`}>
            <div className="rounded-3xl border-2 border-white/10 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Liên hệ</p>
              <h4 className="text-lg font-semibold">Chu Tiến Dũng</h4>
              <div className="mt-4 flex flex-wrap gap-3">
                {contactLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-2xl border-2 border-white/10 px-4 py-2 text-sm transition hover:border-cyan-300/60"
                  >
                    <span className={`font-semibold ${link.color}`}>{link.label}</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white">
                      {link.icon}
                    </span>
                    <span className="text-white/60 transition group-hover:text-white">↗</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border-2 border-emerald-400/20 p-5 text-center text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Ủng hộ tác giả</p>
              <h4 className="text-lg font-semibold text-white">Quét QR chuyển khoản</h4>
              <p className="text-sm text-white/70">Mỗi ly cà phê giúp RubikApp có thêm động lực phát triển tính năng mới.</p>
              <div className="mt-4 flex flex-col items-center justify-center gap-3">
                <img
                  src="/qr-chuyen-tien.png"
                  alt="QR chuyển khoản ủng hộ"
                  className="h-44 w-44 rounded-2xl border-4 border-emerald-400 bg-white object-contain shadow-lg"
                />
                <span className="text-xs text-white/60">Cảm ơn bạn đã ủng hộ! 💚</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
