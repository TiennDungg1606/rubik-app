declare global {
  interface Window { userName?: string }
}
"use client"


import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import AuthForm from "@/components/AuthForm";

const BrandCubeIcon = ({ size = 64, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="2" y="2" width="18" height="18" rx="3" fill="#F59E42" stroke="#222" strokeWidth="2" />
    <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2" />
    <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2" />
    <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2" />
    <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2" />
    <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2" />
    <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2" />
    <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2" />
    <rect x="44" y="44" width="18" height="18" rx="3" fill="#F59E42" stroke="#222" strokeWidth="2" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" role="img">
    <rect width="24" height="24" rx="6" fill="#1877F2" />
    <path
      d="M13 18.5v-4h2.2l.35-2.6H13v-1.6c0-.75.21-1.25 1.28-1.25h1.33V6.7c-.64-.1-1.4-.2-2.22-.2-2.2 0-3.69 1.34-3.69 3.8v1.9H7.5v2.6h2.2v4z"
      fill="#fff"
    />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" role="img">
    <rect width="24" height="24" rx="6" fill="#0f0f0f" />
    <path
      d="M15.7 9.3a4.3 4.3 0 0 0 2.5.8V7.1c-.9-.1-1.8-.6-2.4-1.3s-.9-1.5-1-2.4H12v11.3a1.7 1.7 0 1 1-1.2-1.7V11a4.7 4.7 0 1 0 3.7 4.5v-4.6c.3.2.8.3 1.2.4z"
      fill="#fff"
    />
    <path d="M13.5 3.4v2.4c0 1.8 1.2 3.3 2.9 3.6V7.1c-1.1-.2-2-1.1-2.3-2.2z" fill="#ff0050" />
    <path d="M10.8 12.6a1.7 1.7 0 0 1 1.2 0V7.4H12V3.4h-1.2z" fill="#00f2ea" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" role="img">
    <rect width="24" height="24" rx="6" fill="#E1306C" />
    <rect x="6.5" y="6.5" width="11" height="11" rx="3.5" stroke="#fff" strokeWidth="1.8" fill="none" />
    <circle cx="12" cy="12" r="2.8" stroke="#fff" strokeWidth="1.8" fill="none" />
    <circle cx="16.4" cy="7.6" r="1" fill="#fff" />
  </svg>
);

export default function HomePage() {
  // Tự động chuyển hướng nếu đã đăng nhập (còn cookie)
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [mobileShrink, setMobileShrink] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  useEffect(() => {
    async function checkLogin() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.firstName && data.lastName) {
            window.userName = data.firstName + " " + data.lastName;
          } else {
            window.userName = undefined;
          }
          setTimeout(() => {
            window.location.href = "/lobby";
          }, 5000); // Độ trễ 5 giây
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    }
    checkLogin();
  }, []);

  useEffect(() => {
    function evaluateViewport() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;
      const mobileLandscape = mobile && !portrait && window.innerWidth < 1200;
      setIsMobileLandscape(mobileLandscape);
      const compactWidth = window.innerWidth < 768;
      setMobileShrink(compactWidth || mobileLandscape);
    }

    if (typeof window !== "undefined") {
      evaluateViewport();
      window.addEventListener("resize", evaluateViewport);
      window.addEventListener("orientationchange", evaluateViewport);
      return () => {
        window.removeEventListener("resize", evaluateViewport);
        window.removeEventListener("orientationchange", evaluateViewport);
      };
    }
  }, []);

  const effectiveMobileShrink = mobileShrink || isMobileLandscape;
  const loadingLogoSize = effectiveMobileShrink ? 40 : 52;
  const loadingTitleClasses = `${effectiveMobileShrink ? "text-2xl" : "text-3xl"} font-black text-center tracking-tight text-white drop-shadow mb-4`;

  const metricBadges = [
    { value: "500", label: "Cubers" },
    { value: "2k", label: "Solves" },
    { value: "400", label: "1v1 Matches" },
    { value: "100", label: "2v2 Matches" },
    { value: "1+", label: "Years Cubing" }
  ];

  const proTimerFeatures = [
    "Focus mode",
    "StackMat support",
    "Manual time entry",
    "Inspection mode",
    "Change cube type",
    "Up to 3 decimal points",
    "Hotkeys",
    "Lock, copy, and reset scramble"
  ];

  const publisherInfo = {
    name: "Chu Tiến Dũng",
    title: "Nhà phát hành Rubik App • Sinh viên, trường ĐH Bách khoa Đà Nẵng",
    bio: "Mình xây Rubik App để gom đủ công cụ luyện tập cho cộng đồng speedcubing Việt Nam: luyện giải, phân tích dữ liệu, và kết nối thi đấu online mỗi ngày.",
    socials: [
      { label: "Facebook", href: "https://www.facebook.com/tienndungg258/", icon: FacebookIcon },
      { label: "TikTok", href: "https://www.tiktok.com/@tienndungg2006", icon: TikTokIcon },
      { label: "Instagram", href: "https://www.instagram.com/tienndungg258/", icon: InstagramIcon }
    ]
  } as const;

  const solveEntries = [
    { id: "2,303", time: "13.33", status: "+2 DNF" },
    { id: "2,302", time: "8.64", status: "+2 DNF" },
    { id: "2,301", time: "10.20", status: "+2 DNF" },
    { id: "2,300", time: "DNF", status: "+2 DNF" },
    { id: "2,299", time: "13.12", status: "" },
    { id: "2,298", time: "12.21", status: "" },
    { id: "2,297", time: "9.21", status: "" },
    { id: "2,296", time: "12.33", status: "" }
  ];

  const heroHeadingClass = effectiveMobileShrink
    ? "text-2xl font-black leading-snug"
    : "text-5xl md:text-6xl font-black leading-tight";
  const bodyTextClass = `${effectiveMobileShrink ? "text-sm" : "text-lg"} text-slate-600 max-w-xl`;
  const modalOverlayClass = `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${loginModalOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} flex overflow-y-auto px-4 ${effectiveMobileShrink ? 'items-start justify-center pt-1 pb-1' : 'items-start justify-center py-12 md:py-10'}`;
  const modalPanelClass = `relative w-full ${effectiveMobileShrink ? 'max-w-[20rem] rounded-[28px] px-6 py-4' : 'max-w-md rounded-[32px] px-6 py-8'} border border-white/10 bg-slate-950/95 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] transition-transform duration-200 ${loginModalOpen ? 'scale-100' : 'scale-95'}`;

  if (checking) {
    // Sử dụng effectiveMobileShrink để xác định modal nhỏ
    const modalMaxWidth = mobileShrink ? 'max-w-[23rem]' : 'max-w-lg';
    const modalPaddingX = mobileShrink ? 'px-3' : 'px-6';
    const modalPaddingY = mobileShrink ? 'py-6' : 'py-12';
    const modalRounded = mobileShrink ? 'rounded-[20px]' : 'rounded-[32px]';
    const iconSize = mobileShrink ? 32 : loadingLogoSize + 8;
    const titleClass = mobileShrink ? 'text-xl font-black text-center tracking-tight text-white drop-shadow mb-3' : loadingTitleClasses;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Video loading đã được comment lại - 1 tuần sau sẽ gỡ comment */}
        <video
          src="/rubik-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        />
        <div className={`relative z-10 w-full ${modalMaxWidth} ${modalRounded} bg-neutral-900/30 bg-neutral-900/50 shadow-xl border border-neutral-700 flex flex-col items-center text-center ${modalPaddingX} ${modalPaddingY}`}>
          <BrandCubeIcon size={iconSize} className="mb-4" />
          <h1 className={titleClass}>Rubik App</h1>
          <span className="mb-6 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-emerald-200">
            Đang kiểm tra đăng nhập...
          </span>
          <span className="mb-4 animate-spin">
            <svg width={effectiveMobileShrink ? 40 : 64} height={effectiveMobileShrink ? 40 : 64} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="26" stroke="#38bdf8" strokeWidth="6" strokeDasharray="70 40" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-slate-200 text-sm max-w-sm">
            Nếu đã lưu cookie, bạn sẽ được tự động chuyển vào sảnh trong giây lát.
          </p>
        </div>
      </div>
    );
  }
  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#F8FBFF] text-slate-900 ${effectiveMobileShrink ? 'px-1' : 'px-1'}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 left-[-60px] w-[480px] h-[480px] rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_left,_#a5b4fc33,_transparent_45%),_radial-gradient(circle_at_bottom_right,_#34d39933,_transparent_45%)]" />
      </div>
      <div className={`relative z-10 mx-auto flex w-full flex-col ${effectiveMobileShrink ? 'px-2 py-6' : 'px-2 py-10 lg:py-6'}`}>
        <nav className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <BrandCubeIcon size={40} />
            Rubik App
          </div>
          <div className="hidden gap-3 md:flex">
            <a className="rounded-full border border-slate-300 px-2 py-1 hover:text-slate-900" href="/about">About</a>
            <button
              className="rounded-full border border-slate-300 px-2 py-1 hover:text-slate-900"
              onClick={() => {
                setAuthMode('login');
                setLoginModalOpen(true);
              }}
            >
              Log in
            </button>
            <button
              className="rounded-full border border-slate-300 px-2 py-1 hover:text-slate-900"
              onClick={() => {
                setAuthMode('register');
                setLoginModalOpen(true);
              }}
            >
              Sign up
            </button>
          </div>
        </nav>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600 md:hidden justify-end">
          <a className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold" href="/about">About</a>
          <button
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold"
            onClick={() => {
              setAuthMode('login');
              setLoginModalOpen(true);
            }}
          >
            Log in
          </button>
          <button
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold"
            onClick={() => {
              setAuthMode('register');
              setLoginModalOpen(true);
            }}
          >
            Sign up
          </button>
        </div>
        <div className={`${effectiveMobileShrink ? 'mt-6 grid gap-8' : 'mt-12 grid items-center gap-12 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]'}`}>
          <div className={`${effectiveMobileShrink ? 'space-y-5' : 'space-y-8'}`}>
            <h1 className={heroHeadingClass}>
              <span className="relative inline-block text-emerald-500">
                <span className="absolute inset-x-0 bottom-1 h-3 rounded-full bg-emerald-200/60" />
                <span className="relative">All the tools</span>
              </span>{" "}
              you need to improve at cubing!
            </h1>
            <p className={bodyTextClass}>
              Bộ công cụ Rubik toàn diện: luyện tập, thống kê Ao5, phân tích video và cộng đồng thi đấu online giúp bạn nâng trình mỗi ngày.
            </p>
            <div className={`${effectiveMobileShrink ? 'flex flex-col gap-2 items-start' : 'flex flex-col gap-3 sm:flex-row'}`}>
              <a
                href="https://www.facebook.com/share/g/1BnXDHNAik/"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-slate-300 bg-white ${effectiveMobileShrink ? 'px-3.5 py-1.5 text-xs self-start' : 'px-5 py-2.5 text-sm'} font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5`}
              >
                Join Community
              </a>
            </div>
            <div className={`flex flex-wrap ${effectiveMobileShrink ? 'gap-2' : 'gap-3'}`}>
              {metricBadges.map(metric => (
                <div key={metric.label} className={`rounded-full border border-slate-200 bg-white text-center shadow-sm ${effectiveMobileShrink ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
                  <div className={`${effectiveMobileShrink ? 'text-base' : 'text-lg'} font-bold text-slate-900`}>{metric.value}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={`${effectiveMobileShrink ? 'relative mx-auto max-w-xs' : 'relative flex flex-col items-center gap-10'}`}>
            <div className="relative w-full max-w-sm">
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.12)] p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400 mb-4">Recent solves</div>
                <div className="space-y-2">
                  {solveEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span className="text-slate-400">{entry.id}</span>
                      <span className="text-slate-900">{entry.time}</span>
                      <span className="text-[11px] text-slate-400">{entry.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -right-6 top-16 rounded-3xl bg-[#FFD25B] px-6 py-5 text-center shadow-2xl shadow-orange-200/80">
                <div className="text-sm font-semibold text-slate-700">Average</div>
                <div className="text-4xl font-black text-slate-900">8.64</div>
                <div className="text-xs text-slate-600">seconds</div>
              </div>
              <div className="absolute -left-10 bottom-0 hidden rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-lg md:block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly Progress</div>
                <div className="flex items-end gap-1">
                  {[32, 48, 40, 60, 28].map((height, idx) => (
                    <span key={idx} className="w-3 rounded-full bg-indigo-300" style={{ height: `${height}px` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <section id="about" className={`${effectiveMobileShrink ? 'mt-10' : 'mt-16'}`}>
          <div className="rounded-[32px] border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-lg md:h-24 md:w-24">
                  <img
                    src="/myavatar.jpg"
                    alt="Chu Tiến Dũng"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Publisher</p>
                  <p className="text-2xl font-black text-slate-900">{publisherInfo.name}</p>
                  <p className="text-sm text-slate-600">{publisherInfo.title}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 md:flex-1">
                {publisherInfo.bio}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {publisherInfo.socials.map(({ label, href, icon: IconComponent }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
                    <IconComponent />
                  </span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>
                
          <div className={`grid mt-12 ${effectiveMobileShrink ? 'grid-cols-1 gap-8' : 'gap-30 lg:grid-cols-[0.9fr_minmax(0,0.9fr)]'}`}> 
              <div className={`${effectiveMobileShrink ? 'space-y-2' : 'space-y-3'}`}>
                <img
                  src="/anhtimer.png"
                  alt="RubikApp timer preview"
                  className="rounded-[18px] border border-emerald-200 shadow-lg w-full object-cover"
                  style={{ background: '#fff', minHeight: effectiveMobileShrink ? '280px' : '380px', minWidth: effectiveMobileShrink ? '500px' : '700px' }}/>
                </div>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-amber-500">Pro timer</p>
                <h2 className="text-3xl font-black text-slate-900">Chế độ giải chuyên nghiệp cho cuber.</h2>
                <p className="mt-3 text-base text-slate-600">Giao diện tập trung, hỗ trợ StackMat, nhập thời gian thủ công, chế độ inspection, đổi loại Rubik, hiển thị 3 số thập phân, phím tắt, khoá/copy/reset scramble.</p>
              </div>
              <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 mt-4">
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">✓</span>Xen lịch sử giải</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">✓</span>Hỗ trợ StackMat</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">✓</span>Nhập thời gian thủ công</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">✓</span>Chế độ inspection</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">✓</span>Đổi loại Rubik</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">✓</span>Khoá, copy, reset scramble</li>
              </ul>
              
            </div>
          </div>
        {/* Analytics Section - Unified layout for mobile and desktop */}
 
          <div className={`grid items-center mt-12 ${effectiveMobileShrink ? 'grid-cols-1 gap-8' : 'lg:grid-cols-[0.7fr_minmax(0,0.9fr)]'}`}> 
            <div className={`${effectiveMobileShrink ? 'space-y-2' : 'space-y-3'}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-500">Phòng đấu giao lưu</p>
              <h2 className="text-3xl font-black text-slate-900">Giao lưu online có tích hợp camera + mic hiện đại.</h2>
              <ul className="mt-4 space-y-3 text-base text-slate-700">
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Thi đấu trực tiếp 1v1/2v2 với thời gian hiển thị trực tiếp</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Hỗ trợ camera & mic để kiểm tra và giao tiếp</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Mời, chấp nhận trận và ghép đôi tự động (sẽ có trong tương lai)</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Hiển thị scramble chung và xác nhận kết quả</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Lưu kết quả trận đấu và lịch sử phòng (sẽ có trong tương lai)</li>
              </ul>
            </div>
              <div className={`${effectiveMobileShrink ? 'space-y-2' : 'space-y-3'}`}>
                <img
                  src="/anhphong.png"
                  alt="Room tab preview"
                  className="rounded-[18px] border border-emerald-200 shadow-lg w-full object-cover"
                  style={{ background: '#fff', minHeight: effectiveMobileShrink ? '280px' : '380px', minWidth: effectiveMobileShrink ? '700px' : '700px'}}
                />
              </div>
          </div>

          {/* Practice Trainer (Việt hóa cho tab Practice) */}
          <div className={`grid items-center mt-12 ${effectiveMobileShrink ? 'grid-cols-1 gap-8' : 'gap-30 lg:grid-cols-[0.9fr_minmax(0,0.9fr)]'}`}> 
              <div className={`${effectiveMobileShrink ? 'space-y-2' : 'space-y-3'}`}>
              <img
                src="/anhalg.png"
                alt="Preview luyện thuật toán"
                className="rounded-[18px] border border-emerald-200 shadow-lg w-full object-cover"
                style={{ background: '#fff', minHeight: effectiveMobileShrink ? '300px' : '380px', minWidth: effectiveMobileShrink ? '520px' : '700px'}}
              />
            </div>
            <div className={`${effectiveMobileShrink ? 'pt-4' : 'pl-10'}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-500">Luyện tập</p>
              <h2 className="text-3xl font-black text-slate-900">Tất cả công thức để luyện như người chuyên nghiệp.</h2>
              <div className="mt-4 space-y-3 text-base text-slate-700">
                <div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>100+ công thức từ cơ bản đến nâng cao của 2x2, 3x3, 4x4</div>
                <div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Công thức được chọn lọc kỹ càng từ Yiheng Wang</div>
                <div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Dễ học, dễ nhớ, dễ thành speedcuber</div>
              </div>
            </div>
          </div>

            {/* Giao diện section (dùng public/giaodien.png) */}
            <div className={`grid items-center mt-12 ${effectiveMobileShrink ? 'grid-cols-1 gap-8' : 'lg:grid-cols-[0.7fr_minmax(0,0.9fr)]'}`}> 
              <div className={`${effectiveMobileShrink ? 'pt-4' : 'pl-10'}`}>
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-500">Giao diện</p>
                <h2 className="text-3xl font-black text-slate-900">Giao diện trực quan, tập trung cho luyện tập.</h2>
                <div className="mt-4 space-y-3 text-base text-slate-700">
                  <div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Chế độ tối/sáng và giao diện tối giản cho tập trung.</div>
                  <div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>Tùy chỉnh hình nền có sẵn hoặc hình nền cá nhân từ thiết bị</div>
                </div>
              </div>
              <div className={`${effectiveMobileShrink ? 'space-y-2' : 'space-y-3'}`}>
                <img
                  src="/giaodien.png"
                  alt="Preview giao diện ứng dụng"
                  className="rounded-[18px] border border-emerald-200 shadow-lg w-full object-cover"
                  style={{ background: '#fff', minHeight: effectiveMobileShrink ? '300px' : '380px', minWidth: effectiveMobileShrink ? '520px' : '700px'}}
                />
              </div>            
            </div>

          <div
          className={modalOverlayClass}
          onClick={() => setLoginModalOpen(false)}
        >
          <div
            className={modalPanelClass}
            onClick={event => event.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white hover:bg-white/20"
              onClick={() => setLoginModalOpen(false)}
              aria-label="Close login"
            >
              ✕
            </button>
            <div className="mb-4 flex items-center gap-3">
              <BrandCubeIcon size={40} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Sign in to compete</div>
                <div className="text-lg font-semibold">Rubik App</div>
              </div>
            </div>
            <div>
              <AuthForm
                initialTab={authMode}
                onLogin={() => {
                  window.location.href = "/lobby";
                }}
              />
            </div>
          </div>
        </div>
      </div>
        {/* Footer */}
        <footer className="mt-16 bg-red-700 text-white pt-12 pb-8">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm text-white">
              <div>
                <h4 className="text-sm font-semibold text-white">LIÊN HỆ</h4>
                <div className="mt-4 space-y-3 text-rose-50">
                  <div className="font-semibold text-white">Rubik App</div>
                  <div>Email: <a href="mailto:info@rubikapp.local" className="underline text-white">chuthang233@gmail.com</a></div>
                  <div className="pt-2">
                    <div className="font-semibold text-white">Việt Nam</div>
                    <div className="text-xs text-rose-50">Đà Nẵng, Việt Nam</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">TÀI NGUYÊN - ĐƠN VỊ HỖ TRỢ</h4>
                <ul className="mt-4 space-y-2 text-rose-50">
                  <li><a href="https://vercel.com/" className="hover:text-white">Vercel</a></li>
                  <li><a href="https://railway.com/" className="hover:text-white">Railway</a></li>
                  <li><a href="https://stringee.com/" className="hover:text-white">Stringee</a></li>
                  <li><a href="https://daily.co/" className="hover:text-white">DailyCo</a></li>
                  <li><a href="https://mongodb.com" className="hover:text-white">MongoDB</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Gửi phản hồi qua email</h4>
                <div className="mt-4 flex items-center">
                  <div className="flex-1">
                    <input aria-label="email" placeholder="Địa chỉ Email" className="w-full rounded-l-md border border-white/20 px-3 py-2 bg-white/10 text-sm text-white" />
                  </div>
                  <button className="ml-2 rounded-r-md bg-rose-700 px-3 py-2 text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-3 text-white">
                  <a href="https://www.facebook.com/tienndungg258/" aria-label="facebook" className="hover:text-white"><FacebookIcon /></a>
                  <a href="https://www.tiktok.com/@tienndungg2006" aria-label="tiktok" className="hover:text-white"><TikTokIcon /></a>
                  <a href="https://www.instagram.com/tienndungg258/" aria-label="instagram" className="hover:text-white"><InstagramIcon /></a>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 text-center text-xs text-white/80">
              Bản quyền © {new Date().getFullYear()} Rubik App.
            </div>
          </div>
        </footer>
    </main>
  );
}
