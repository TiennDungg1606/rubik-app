import React, { useState, useEffect, useRef } from "react";
// Helper to detect mobile
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function generateScramble() {
  const moves = ["U", "D", "L", "R", "F", "B"];
  const suffix = ["", "'", "2"];
  let scramble = [];
  let prev = "";
  let prev2 = "";
  for (let i = 0; i < 20; i++) {
    let m;
    do {
      m = moves[Math.floor(Math.random() * moves.length)];
    } while (m === prev || (prev2 && m[0] === prev2[0]));
    prev2 = prev;
    prev = m;
    scramble.push(m + suffix[Math.floor(Math.random() * 3)]);
  }
  return scramble.join(" ");
}

export default function TimerTab() {
  // Ref để chặn lặp sự kiện keydown khi giữ phím Space ở desktop
  const isSpacePressed = useRef(false);
  // Ref lưu thời điểm bắt đầu nhấn/chạm (dùng cho cả desktop và mobile)
  const pressStartRef = useRef<number | null>(null);
  const [scramble, setScramble] = useState(() => generateScramble());
  const [prevScramble, setPrevScramble] = useState<string | null>(null);
  const [canGoLast, setCanGoLast] = useState(false);
  const [canGoNext, setCanGoNext] = useState(true);
  const [timerState, setTimerState] = useState<'idle'|'ready'|'preparing'|'running'|'done'|'dnf'>("idle");
  const [prepTime, setPrepTime] = useState(15);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<number|null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingValue, setTypingValue] = useState("");
  // Helper for cookie
  function setCookie(name: string, value: string, days = 365) {
    const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  }
  function getCookie(name: string) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  const [results, setResults] = useState<{time: number, scramble: string, dnf?: boolean}[]>(() => {
    if (typeof document !== 'undefined') {
      const cookie = getCookie('timer_results');
      if (cookie) {
        try {
          return JSON.parse(cookie);
        } catch {}
      }
    }
    return [];
  });
  const [best, setBest] = useState<number|null>(null);
  const [mean, setMean] = useState<string>("DNF");
  const [ao5, setAo5] = useState<string>("-");
  const [ao12, setAo12] = useState<string>("-");

  useEffect(() => {
    let prepInterval: any = null;
    let runInterval: any = null;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (isSpacePressed.current) return;
      isSpacePressed.current = true;
      pressStartRef.current = Date.now();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      isSpacePressed.current = false;
      const now = Date.now();
      const start = pressStartRef.current;
      pressStartRef.current = null;
      if (timerState === "idle") {
        setTimerState("preparing");
        setPrepTime(15);
      } else if (timerState === "preparing") {
        if (start && now - start >= 50) {
          setTimerState("running");
          setStartTime(Date.now());
        }
      } else if (timerState === "running") {
        setTimerState("done");
      } else if (timerState === "dnf") {
        setResults(prev => {
          const newResults = [...prev, { time: 0, scramble, dnf: true }];
          const valid = newResults.filter(r => !r.dnf);
          setBest(valid.length ? Math.min(...valid.map(r => r.time)) : null);
          setMean(valid.length ? (valid.reduce((a, b) => a + b.time, 0) / valid.length / 1000).toFixed(3) : "DNF");
          function avgN(arr: any[], n: number) {
            if (arr.length < n) return "-";
            const lastN = arr.slice(-n).filter(r => !r.dnf);
            if (lastN.length < n) return "DNF";
            return (lastN.reduce((a, b) => a + b.time, 0) / n / 1000).toFixed(3);
          }
          setAo5(avgN(newResults, 5));
          setAo12(avgN(newResults, 12));
          return newResults;
        });
        setScramble(generateScramble());
        setTimerState("idle");
        setStartTime(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    if (timerState === "preparing") {
      prepInterval = setInterval(() => {
        setPrepTime(prev => {
          if (prev <= 1) {
            setTimerState("dnf");
            clearInterval(prepInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    if (timerState === "running") {
      setTime(0);
      runInterval = setInterval(() => {
        setTime(Date.now() - (startTime || Date.now()));
      }, 10);
    }
    if (timerState === "done" || timerState === "dnf") {
      clearInterval(prepInterval);
      clearInterval(runInterval);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearInterval(prepInterval);
      clearInterval(runInterval);
    };
  }, [timerState, startTime]);

  useEffect(() => {
    if (timerState === "done") {
      let t = time;
      let dnf = false;
      setResults(prev => {
        const newResults = [...prev, { time: t, scramble, dnf }];
        // Save to cookie
        setCookie('timer_results', JSON.stringify(newResults));
        // Update best
        const valid = newResults.filter(r => !r.dnf);
        setBest(valid.length ? Math.min(...valid.map(r => r.time)) : null);
        // Update mean
        setMean(valid.length ? (valid.reduce((a, b) => a + b.time, 0) / valid.length / 1000).toFixed(3) : "DNF");
        // ao5, ao12 (chuẩn WCA)
        function avgN(arr: {time: number, scramble: string, dnf?: boolean}[], n: number): string {
          if (arr.length < n) return "-";
          const lastN = arr.slice(-n);
          const dnfCount = lastN.filter(r => r.dnf).length;
          if (dnfCount >= 2) return "DNF";
          const times = lastN.map(r => r.dnf ? Infinity : r.time).sort((a, b) => a - b);
          const trimmed = times.slice(1, -1);
          if (trimmed.some(t => !isFinite(t))) return "DNF";
          return (trimmed.reduce((a, b) => a + b, 0) / trimmed.length / 1000).toFixed(3);
        }
        setAo5(avgN(newResults, 5));
        setAo12(avgN(newResults, 12));
        return newResults;
      });
      setScramble(generateScramble());
      setTimerState("idle");
      setStartTime(null);
    }
    // Nếu là dnf thì chỉ hiển thị DNF, không reset, không thêm vào bảng
  }, [timerState]);

  return (
    <div className="w-full min-h-[80vh] flex flex-row rounded-2xl shadow-lg overflow-hidden relative">
      {/* Đường kẻ trắng ngang phía trên sidebar và main */}
      <div className="absolute left-0 top-0 w-full h-0.5 bg-white z-30" style={{height: '1px', top: 0}}></div>
      {/* Đường kẻ trắng dọc giữa sidebar và main */}
      <div className="fixed top-16 left-64 w-0.5 bg-white z-30" style={{width: '1px', left: '17rem', height: '90vh'}}></div>
      {/* Sidebar */}
      <aside className="w-64 bg-transparent flex flex-col items-center py-4 min-h-[80vh]">
        {/* Logo */}
        <div className="relative w-full flex items-center justify-center mb-4">
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={
              isMobileDevice()
                ? { borderRadius: '0.75rem', border: '2px solid white', boxSizing: 'border-box', top: 0, bottom: 0, left: 0, right: 0 }
                : { borderRadius: '1rem', border: '3px solid white', boxSizing: 'border-box', top: 0, bottom: 0, left: 0, right: 0 }
            }
          ></div>
          <div
            className={
              (isMobileDevice()
                ? "bg-black bg-opacity-70 border border-yellow-400 text-yellow-400 font-extrabold text-2xl px-2 py-2 rounded-xl shadow-lg flex items-center justify-center z-10"
                : "bg-black bg-opacity-70 border-2 border-yellow-400 text-yellow-400 font-extrabold text-4xl px-6 py-4 rounded-xl shadow-lg flex items-center justify-center z-10"
              )
            }
            style={{ letterSpacing: '2px', width: '100%' }}
          >
            csTimer
          </div>
        </div>
        {/* Session & stats */}
        <div className={
          "relative w-full px-2 mb-1 " +
          (isMobileDevice() ? "text-[11px]" : "")
        }>
          <div className="absolute inset-0 pointer-events-none z-0" style={{borderRadius: '0', border: '1px solid white', boxSizing: 'border-box'}}></div>
          <div className={
            "flex items-center justify-between mb-4 z-10 relative " +
            (isMobileDevice() ? "gap-1" : "")
          }>
            <div className={
              (isMobileDevice()
                ? "bg-black bg-opacity-70 border border-blue-400 rounded px-1 py-0.5 text-white text-[12px] font-bold cursor-pointer"
                : "bg-black bg-opacity-70 border border-blue-400 rounded px-2 py-1 text-white text-base font-bold cursor-pointer"
              )
            }>Session1</div>
            <div className={
              (isMobileDevice()
                ? "flex flex-row items-center gap-1"
                : "flex flex-row items-center gap-2"
              )
            }>
              <button
                className={
                  (isMobileDevice()
                    ? "text-[11px] text-white border border-red-300 rounded px-1 py-0.5 hover:bg-red-100"
                    : "text-xs text-white border border-red-300 rounded px-2 py-1 hover:bg-red-100"
                  )
                }
                onClick={() => { setResults([]); setBest(null); setMean('DNF'); setAo5('-'); setAo12('-'); setCookie('timer_results', JSON.stringify([])); }}
              >Clear</button>
              <button
                className={
                  (isTyping
                    ? (isMobileDevice()
                        ? "bg-yellow-400 text-white rounded-full p-1 shadow hover:bg-gray-200 focus:outline-none ml-1"
                        : "bg-yellow-400 text-white rounded-full p-2 shadow hover:bg-gray-200 focus:outline-none ml-2"
                      )
                    : (isMobileDevice()
                        ? "bg-white text-gray-700 rounded-full p-1 shadow hover:bg-gray-200 focus:outline-none ml-1"
                        : "bg-white text-gray-700 rounded-full p-2 shadow hover:bg-gray-200 focus:outline-none ml-2"
                      )
                  )
                }
                title={isTyping ? "Thoát chế độ nhập thời gian" : "Nhập thời gian từ bàn phím"}
                onClick={() => {
                  if (isTyping) {
                    setIsTyping(false);
                    setTypingValue("");
                  } else {
                    setIsTyping(true);
                    setTypingValue("");
                  }
                }}
              >
                {/* Keyboard SVG icon đổi màu khi bật Typing */}
                {isTyping ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={isMobileDevice() ? "w-4 h-4 text-white" : "w-5 h-5 text-white"}>
                    <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" d="M7 13h.01M11 13h.01M15 13h.01M7 17h10" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={isMobileDevice() ? "w-4 h-4 text-gray-700" : "w-5 h-5 text-gray-700"}>
                    <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" d="M7 13h.01M11 13h.01M15 13h.01M7 17h10" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className={
            (isMobileDevice()
              ? "bg-white bg-opacity-80 rounded-none p-1 text-[11px] text-black z-10 relative"
              : "bg-white bg-opacity-80 rounded-none p-2 text-xs text-black z-10 relative"
            )
          } style={{marginTop: '-8px'}}>
            <div className="flex justify-between"><span>current</span><span>best</span></div>
            <div className="flex justify-between mb-1"><span>time</span><span>-</span><span>{best !== null ? (best/1000).toFixed(3) : '-'}</span></div>
            <div>solve: {results.length}/0</div>
            <div>mean: {mean}</div>
          </div>
        </div>
        {/* Results table full height */}
        <div className="relative w-full">
          <div className="absolute inset-0 pointer-events-none z-0" style={{borderRadius: '0', border: '1px solid white', boxSizing: 'border-box'}}></div>
          <div className="relative z-10">
            {/* Chỉ bảng kết quả có thanh cuộn, không phải toàn trang */}
            <div className="w-full" style={{maxHeight: '40vh', overflowY: 'auto'}}>
              {/* Bảng kết quả dạng table với header cố định */}
              <div className="relative w-full">
                <table
                  className={
                    "w-full border-collapse " +
                    (isMobileDevice() ? "text-[10px]" : "text-xs")
                  }
                >
                  <thead className={
                    "sticky top-0 bg-black bg-opacity-80 z-20 " +
                    (isMobileDevice() ? "text-[11px]" : "")
                  }>
                    <tr className="bg-transparent">
                      <th className={
                        (isMobileDevice()
                          ? "border border-gray-300 px-1 py-0.5 text-blue-700 font-bold"
                          : "border border-gray-400 px-2 py-1 text-blue-700 font-bold"
                        )
                      }>ø</th>
                      <th className={
                        (isMobileDevice()
                          ? "border border-gray-300 px-1 py-0.5 text-blue-700 font-bold"
                          : "border border-gray-400 px-2 py-1 text-blue-700 font-bold"
                        )
                      }>time</th>
                      <th className={
                        (isMobileDevice()
                          ? "border border-gray-300 px-1 py-0.5 text-blue-700 font-bold"
                          : "border border-gray-400 px-2 py-1 text-blue-700 font-bold"
                        )
                      }>ao5</th>
                      <th className={
                        (isMobileDevice()
                          ? "border border-gray-300 px-1 py-0.5 text-blue-700 font-bold"
                          : "border border-gray-400 px-2 py-1 text-blue-700 font-bold"
                        )
                      }>ao12</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice().reverse().map((r, idx, arr) => {
                      const i = arr.length - idx; // Số thứ tự
                      // Tính ao5, ao12 cho từng dòng với đúng luật WCA
                      function calcAoN(subArr: {time: number, scramble: string, dnf?: boolean}[], n: number): string {
                        if (subArr.length < n) return "-";
                        const lastN = subArr.slice(0, n);
                        const dnfCount = lastN.filter((r) => r.dnf).length;
                        if (dnfCount >= 2) return "DNF";
                        const times = lastN.map((r) => r.dnf ? Infinity : r.time).sort((a, b) => a - b);
                        const trimmed = times.slice(1, -1);
                        if (trimmed.some((t) => !isFinite(t))) return "DNF";
                        return (trimmed.reduce((a, b) => a + b, 0) / trimmed.length / 1000).toFixed(3);
                      }
                      let ao5Val = '-';
                      let ao12Val = '-';
                      if (arr.length - idx >= 5) {
                        ao5Val = calcAoN(arr.slice(idx, idx+5), 5);
                      }
                      if (arr.length - idx >= 12) {
                        ao12Val = calcAoN(arr.slice(idx, idx+12), 12);
                      }
                      return (
                        <tr key={i}>
                          <td
                            className={
                              (isMobileDevice()
                                ? "border border-gray-300 px-1 py-0.5 text-blue-700 text-center"
                                : "border border-gray-400 px-2 py-1 text-blue-700 text-center"
                              )
                            }
                          >{i}</td>
                          <td
                            className={
                              (isMobileDevice()
                                ? `border border-gray-300 px-1 py-0.5 text-center ${r.dnf ? 'text-red-500' : 'text-red-500'}`
                                : `border border-gray-400 px-2 py-1 text-center ${r.dnf ? 'text-red-500' : 'text-red-500'}`
                              )
                            }
                          >{r.dnf ? 'DNF' : (r.time/1000).toFixed(3)}</td>
                          <td
                            className={
                              (isMobileDevice()
                                ? `border border-gray-300 px-1 py-0.5 text-center ${ao5Val !== '-' ? 'text-red-500' : ''}`
                                : `border border-gray-400 px-2 py-1 text-center ${ao5Val !== '-' ? 'text-red-500' : ''}`
                              )
                            }
                          >{ao5Val}</td>
                          <td
                            className={
                              (isMobileDevice()
                                ? "border border-gray-300 px-1 py-0.5 text-center"
                                : "border border-gray-400 px-2 py-1 text-center"
                              )
                            }
                          >{ao12Val}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </aside>
      {/* Main timer area */}
      <section className="flex-1 flex flex-col items-center justify-start relative bg-transparent">
        {/* Header scramble & options */}
        <div className="w-full flex flex-row items-center justify-center gap-2 bg-transparent py-2 px-4 border-b border-gray-200">
          <input className="bg-black border border-gray-700 rounded px-2 py-1 text-xs w-20 text-white" defaultValue="WCA" readOnly />
          <input className="bg-black border border-gray-700 rounded px-2 py-1 text-xs w-20 text-white" defaultValue="3x3x3" readOnly />
          <div className="flex flex-row items-center gap-1 ml-2">
            <button
              className="text-xs text-white bg-gray-700 rounded px-2 py-1 disabled:opacity-40"
              disabled={!canGoLast}
              onClick={() => {
                if (prevScramble) {
                  setCanGoLast(false);
                  setCanGoNext(true);
                  setScramble(prevScramble);
                }
              }}
            >Last</button>
            <span className="text-white text-xs mx-1">/</span>
            <button
              className="text-xs text-white bg-gray-700 rounded px-2 py-1 disabled:opacity-40"
              disabled={!canGoNext}
              onClick={() => {
                setPrevScramble(scramble);
                setScramble(generateScramble());
                setCanGoLast(true);
                setCanGoNext(false);
              }}
            >Next</button>
            <span className="text-xs text-white ml-2">scramble</span>
          </div>
        </div>
        {/* Scramble */}
        <div
          className={
            "w-full text-center font-mono font-bold border-b border-gray-200 bg-transparent text-white drop-shadow-lg " +
            (isMobileDevice()
              ? "text-sm py-2 px-1"
              : "text-2xl py-4 px-2")
          }
        >
          {scramble}
        </div>
        {/* Timer big + Typing button */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Đã di chuyển nút Typing lên cạnh nút Clear */}
          <div className="flex flex-col items-center">
            {/* Nếu đang nhập, hiển thị input thay cho timer */}
            {isTyping ? (
              <input
                autoFocus
                type="text"
                className={
                  (isMobileDevice()
                    ? "text-[2.5rem] px-2 py-1 w-[9ch]"
                    : "text-[6rem] px-4 py-2 w-[18ch]") +
                  " digital7mono text-black font-bold text-center rounded-lg border-2 border-yellow-400 bg-white outline-none shadow-lg"
                }
                style={{fontFamily: 'Digital7Mono, monospace'}}  
                value={typingValue}
                onChange={e => setTypingValue(e.target.value)}
                onBlur={() => {
                  // Không tự động tắt chế độ Typing khi blur, chỉ clear input
                  setTypingValue("");
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    // Kiểm tra định dạng x.xxx
                    const regex = /^\d+\.\d{3}$/;
                    const valStr = typingValue.replace(',', '.');
                    if (!regex.test(valStr)) {
                      alert('Vui lòng nhập đúng định dạng: x.xxx (ví dụ: 12.345)');
                      return;
                    }
                    const val = parseFloat(valStr);
                    if (isNaN(val) || val <= 0) {
                      alert('Thời gian không hợp lệ!');
                      return;
                    }
                    setResults(prev => {
                      const newResults = [...prev, { time: Math.round(val*1000), scramble: scramble, dnf: false }];
                      setCookie('timer_results', JSON.stringify(newResults));
                      // Update best, mean, ao5, ao12
                      const valid = newResults.filter(r => !r.dnf);
                      setBest(valid.length ? Math.min(...valid.map(r => r.time)) : null);
                      setMean(valid.length ? (valid.reduce((a, b) => a + b.time, 0) / valid.length / 1000).toFixed(3) : "DNF");
                      function avgN(arr: {time: number, scramble: string, dnf?: boolean}[], n: number): string {
                        if (arr.length < n) return "-";
                        const lastN = arr.slice(-n);
                        const dnfCount = lastN.filter(r => r.dnf).length;
                        if (dnfCount >= 2) return "DNF";
                        const times = lastN.map(r => r.dnf ? Infinity : r.time).sort((a, b) => a - b);
                        const trimmed = times.slice(1, -1);
                        if (trimmed.some(t => !isFinite(t))) return "DNF";
                        return (trimmed.reduce((a, b) => a + b, 0) / trimmed.length / 1000).toFixed(3);
                      }
                      setAo5(avgN(newResults, 5));
                      setAo12(avgN(newResults, 12));
                      return newResults;
                    });
                    setScramble(generateScramble());
                    setTimerState('idle');
                    setStartTime(null);
                    setTypingValue("");
                    // Không setIsTyping(false) để giữ chế độ Typing
                  }
                }}
              />
            ) : (
              <div
                className={
                  (() => {
                    const base = isMobileDevice()
                      ? "text-[5.5rem] "
                      : "text-[10rem] ";
                    if (timerState === 'dnf' || (timerState === 'done' && results.length > 0 && results[results.length-1].dnf))
                      return base + "digital7mono font-bold text-red-400 leading-none select-none drop-shadow-lg";
                    if (timerState === 'preparing' || timerState === 'ready')
                      return base + "digital7mono text-yellow-400 leading-none select-none drop-shadow-lg";
                    return base + "digital7mono text-white leading-none select-none drop-shadow-lg";
                  })()
                }
                style={{fontFamily: 'Digital7Mono, monospace'}}
                onTouchStart={e => {
                  e.preventDefault();
                  pressStartRef.current = Date.now();
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  const now = Date.now();
                  const start = pressStartRef.current;
                  pressStartRef.current = null;
                  if (timerState === 'idle') {
                    setTimerState('preparing');
                    setPrepTime(15);
                  } else if (timerState === 'preparing') {
                    if (start && now - start >= 50) {
                      setTimerState('running');
                      setStartTime(Date.now());
                    }
                  } else if (timerState === 'running') {
                    setTimerState('done');
                  } else if (timerState === 'dnf') {
                    setResults(prev => {
                      const newResults = [...prev, { time: 0, scramble, dnf: true }];
                      const valid = newResults.filter(r => !r.dnf);
                      setBest(valid.length ? Math.min(...valid.map(r => r.time)) : null);
                      setMean(valid.length ? (valid.reduce((a, b) => a + b.time, 0) / valid.length / 1000).toFixed(3) : "DNF");
                      function avgN(arr: any[], n: number) {
                        if (arr.length < n) return "-";
                        const lastN = arr.slice(-n).filter(r => !r.dnf);
                        if (lastN.length < n) return "DNF";
                        return (lastN.reduce((a, b) => a + b.time, 0) / n / 1000).toFixed(3);
                      }
                      setAo5(avgN(newResults, 5));
                      setAo12(avgN(newResults, 12));
                      return newResults;
                    });
                    setScramble(generateScramble());
                    setTimerState('idle');
                    setStartTime(null);
                  }
                }}
              >
                {timerState === 'dnf' || (timerState === 'done' && results.length > 0 && results[results.length-1].dnf)
                  ? 'DNF'
                  : timerState === 'preparing' || timerState === 'ready'
                    ? prepTime
                    : (time/1000).toFixed(3)
                }
              </div>
            )}
            {/* Thông báo lỗi DNF */}
            {timerState === 'dnf' && (
              <div className="mb-4 text-3xl text-yellow-400 font-bold drop-shadow-lg animate-pulse">Lỗi DNF, nhấn Space hoặc chạm</div>
            )}
            <div className={isMobileDevice() ? "text-sm text-white font-mono drop-shadow-lg" : "text-2xl text-white font-mono drop-shadow-lg"}>ao5: {ao5}</div>
            <div className={isMobileDevice() ? "text-sm text-white font-mono drop-shadow-lg" : "text-2xl text-white font-mono drop-shadow-lg"}>ao12: {ao12}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
