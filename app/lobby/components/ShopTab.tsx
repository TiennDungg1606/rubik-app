import { useEffect, useState } from "react";

type ShopLink = {
  label: string;
  href: string;
  tag?: string;
};

type ShopSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  border: string;
  dot: string;
  gradient: string;
  items: ShopLink[];
};



const shopSections: ShopSection[] = [
  {
    id: "rubik",
    title: "Rubik Flagship",
    subtitle: "Cube thế hệ mới tối ưu cảm giác và tốc độ",
    icon: "🧊",
    border: "border-cyan-500/40",
    dot: "bg-cyan-400",
    gradient: "from-cyan-500/10 via-slate-900/60 to-slate-950",
    items: [
      {
        label:
          "QiYi X-Man Tornado V3M Pioneer UV 3x3x3 Maglev Magnetic Magic Speed Cube Qiyi XMD Tornado V3 M Pioneer UV Puzzle Toys tornado v3",
        href: "https://vt.tiktok.com/ZSSqEYYb8/",
        tag: "Flagship"
      },
      {
        label: "QZCUBE Tianma X3 3x3 Core Magnetic Cube Professional 3x3x3 Puzzle Toys Speed Cube",
        href: "https://vt.tiktok.com/ZSSpDtyWv/",
        tag: "Core Mag"
      },
      {
        label: "[XT3] Rubik 3x3 QiYi XT3 V1 M XMD X-Man 2024 Flagship Rubic Nam Châm",
        href: "https://vt.tiktok.com/ZSSpUytcr/",
        tag: "2024"
      },
      {
        label:
          "Khối Từ Tính, GAN Swift Block, 3x3, 355mm, Khối Tốc Độ 3x3 Từ Tính, Đồ Chơi Rubik, Rubik 3x3, Rubik Cube",
        href: "https://vt.tiktok.com/ZSSpUYNmq/",
        tag: "Gan"
      },
      {
        label: "Rubik 3x3 Gan 356 ME 3x3 Magnetic Rubic 3 Tầng Có Nam Châm Gan 356M E Stickerless Đồ Chơi Trí Tuệ 3x3x3",
        href: "https://vt.tiktok.com/ZSSpUqSJy/",
        tag: "Entry"
      },
      {
        label: "Rubik 3x3 Moyu Meilong 3M V2 Nam Châm Từ Tính - Rubic Mod nam châm chính hãng Toy",
        href: "https://vt.tiktok.com/ZSSsGAjAd/",
        tag: "Budget"
      },
      {
        label: "Rubik 3x3 MoYu RS3M V5 RS3 M 3x3 Magnetic Ball Core UV Rubic 3 Tầng Cao Cấp Có Nam Châm Đồ Chơi Trí Tuệ Phát Triển Tư Duy Toy",
        href: "https://vt.tiktok.com/ZSSsGcQev/",
        tag: "Ball Core"
      },
      {
        label: "Rubik 3x3 Gan Swift Block 2023 Stickerless Có Nam Châm - Rubik 3x3x3 - Đồ Chơi Giáo duc- ZyO Rubik",
        href: "https://vt.tiktok.com/ZSSsGED2b/",
        tag: "Swift"
      },
      {
        label: "Rubik 3x3 MoYu Weilong WRM V10 Magnetics 3x3 Stickerless có nam châm cao cấp 2024",
        href: "https://vt.tiktok.com/ZSSsGG8kB/",
        tag: "WRM V10"
      }
    ]
  },
  {
    id: "timer",
    title: "Timer & Thảm",
    subtitle: "Đồng hồ chuẩn WCA, thảm chống rung và bề mặt luyện tập",
    icon: "⏱️",
    border: "border-blue-500/40",
    dot: "bg-sky-400",
    gradient: "from-sky-500/10 via-slate-900/60 to-slate-950",
    items: [
      {
        label: "Thảm Rubik Mat Size Nhỏ Và Size Lớn Rubik Đồ Chơi Trí Tuệ",
        href: "https://vt.tiktok.com/ZSSbJMWfC/"
      },
      {
        label: "Đồng Hồ QiYi Timer Máy Đếm Thời Gian Giải Rubik Đồ Chơi Rubic Trí Tuệ Trẻ Em",
        href: "https://vt.tiktok.com/ZSSsnRpCv/",
        tag: "QiYi"
      },
      {
        label: "Cube Mat Training Competition mat",
        href: "https://vt.tiktok.com/ZSSsnga8j/",
        tag: "Competition"
      },
      {
        label: "Thảm Rubik MoYu Mat 505 x 370 x 2 (mm) Toy",
        href: "https://vt.tiktok.com/ZSSsnWChU/",
        tag: "MoYu"
      }
    ]
  },
  {
    id: "accessories",
    title: "Phụ kiện & Lube",
    subtitle: "Tinh chỉnh cảm giác cube với dầu bôi trơn chuyên dụng",
    icon: "🛠️",
    border: "border-emerald-400/40",
    dot: "bg-emerald-400",
    gradient: "from-emerald-500/10 via-slate-900/60 to-slate-950",
    items: [
      {
        label: "Silicon Dầu Bôi Trơn Rubik Lube V1/V2 5ml Rubic",
        href: "https://vt.tiktok.com/ZSSbJgJua/",
        tag: "Smooth"
      },
      {
        label: "Dầu Bôi Trơn Rubik - Gan Lube V1, V2, V3 (Thế Hệ Mới Chai 10ml ) - ZyO Rubik",
        href: "https://vt.tiktok.com/ZSSst7Bwu/",
        tag: "GAN"
      },
      {
        label: "Dầu Bôi Trơn Rubik M Lube Silicone QiYi Lube Rubic 3ml",
        href: "https://vt.tiktok.com/ZSSst3FEQ/",
        tag: "QiYi"
      },
      {
        label: "Dầu Bôi Trơn Rubik QiYi XMD Lube X-Man Lube 10k Diff Fluid Silicone Rubic 5 ml",
        href: "https://vt.tiktok.com/ZSSsnRknE/",
        tag: "Diff Fluid"
      }
    ]
  }
];

const proTips = [
  {
    title: "Combo đề xuất",
    detail: "Tornado V3M + thảm QiYi + Gan Lube V2 → gọn nhẹ cho giải online",
    accent: "from-cyan-500/10 to-slate-900/40 border-cyan-400/30"
  },
  {
    title: "Bảo quản cube",
    detail: "Sau khi lube, để cube nghỉ 30 phút và lưu trong túi chống bụi kèm silica gel",
    accent: "from-emerald-500/10 to-slate-900/40 border-emerald-400/30"
  }
];

export default function ShopTab() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (typeof window === "undefined") return;
      setIsCompact(window.innerWidth <= 900);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const cardPadding = mobileShrink ? "p-3.5" : "p-5";
  const cardRadius = mobileShrink ? "rounded-2xl" : "rounded-3xl";
  const cardGap = mobileShrink ? "gap-3" : "gap-4";
  const headingSize = mobileShrink ? "text-2xl" : "text-[25px]";
  const headingBadge = mobileShrink ? "p-2 text-xl" : "p-1 text-2xl";
  const sectionTitleSize = mobileShrink ? "text-lg" : "text-xl";
  const sectionSubtitleSize = mobileShrink ? "text-xs" : "text-sm";
  const sectionIconBox = mobileShrink ? "h-10 w-10 text-xl" : "h-11 w-11 text-2xl";
  const linkBodyText = mobileShrink ? "text-xs" : "text-sm";
  const linkPadding = mobileShrink ? "p-2.5" : "p-3";
  const listGap = mobileShrink ? "gap-2.5" : "gap-3";
  const labelSize = mobileShrink ? "text-[11px]" : "text-sm";
  const proTipPadding = mobileShrink ? "p-3" : "p-4";

  return (
    <section className="relative w-full space-y-8">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <div className="absolute -top-40 right-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.35),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.25),_transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className={`flex items-center gap-3 ${headingSize} font-black text-white`}>
              <span className={`rounded-full bg-cyan-500/10 ${headingBadge} text-cyan-300`}>🛒</span>
              Shop Rubik
            </h2>
          </div>
        </header>
        <div className="flex flex-col gap-5">
          {shopSections.map(section => (
            <article
              key={section.id}
                      className={`flex flex-col ${cardGap} ${cardRadius} border ${section.border} bg-gradient-to-br ${section.gradient} ${cardPadding} text-white`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center rounded-2xl bg-white/10 ${sectionIconBox}`}>
                    {section.icon}
                  </span>
                  <div>
                    <p className={`${labelSize} uppercase tracking-[0.3em] text-white/60`}>Danh mục</p>
                    <h3 className={`${sectionTitleSize} font-semibold text-white`}>{section.title}</h3>
                  </div>
                </div>
                <p className={`${sectionSubtitleSize} text-white/70`}>{section.subtitle}</p>
              </div>

              <div className={`flex flex-col ${listGap}`}>
                {section.items.map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 ${linkPadding} ${linkBodyText} text-white/80 transition hover:-translate-y-1 hover:border-cyan-300/50`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${section.dot}`} />
                      <p className={`${mobileShrink ? "text-sm" : "text-base"} font-semibold text-white group-hover:text-cyan-100`}>{item.label}</p>
                    </div>
                    {item.tag && (
                      <span className="inline-flex w-fit rounded-full border border-white/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-white/60">
                        {item.tag}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-cyan-200 opacity-0 transition group-hover:opacity-100">
                      Mở link ↗
                    </span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {proTips.map(tip => (
            <div
              key={tip.title}
              className={`rounded-3xl border ${tip.accent} bg-gradient-to-br ${proTipPadding} text-white`}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Pro tip</p>
              <h4 className={`${mobileShrink ? "text-base" : "text-lg"} font-semibold text-white`}>{tip.title}</h4>
              <p className={`${linkBodyText} text-white/75`}>{tip.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
