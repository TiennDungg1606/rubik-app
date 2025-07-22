import React, { useState, useEffect } from "react";

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
  const [scramble, setScramble] = useState(() => generateScramble());
  const [prevScramble, setPrevScramble] = useState<string | null>(null);
  const [canGoLast, setCanGoLast] = useState(false);
  const [canGoNext, setCanGoNext] = useState(true);
  const [timerState, setTimerState] = useState<'idle'|'ready'|'preparing'|'running'|'done'|'dnf'>("idle");
  const [prepTime, setPrepTime] = useState(15);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<number|null>(null);
  const [results, setResults] = useState<{time: number, scramble: string, dnf?: boolean}[]>([]);
  const [best, setBest] = useState<number|null>(null);
  const [mean, setMean] = useState<string>("DNF");
  const [ao5, setAo5] = useState<string>("-");
  const [ao12, setAo12] = useState<string>("-");

  useEffect(() => {
    let prepInterval: any = null;
    let runInterval: any = null;
    function onKeyDown(e: KeyboardEvent) {
      if (timerState === "idle" && e.code === "Space") {
        setTimerState("preparing");
        setPrepTime(15);
      } else if (timerState === "preparing" && e.code === "Space") {
        setTimerState("ready");
      } else if (timerState === "running") {
        setTimerState("done");
      } else if (timerState === "dnf" && e.code === "Space") {
        // Khi đang ở trạng thái DNF, nhấn Space để thêm kết quả DNF vào bảng và sang scramble mới
        setResults(prev => {
          const newResults = [...prev, { time: 0, scramble, dnf: true }];
          // Update best
          const valid = newResults.filter(r => !r.dnf);
          setBest(valid.length ? Math.min(...valid.map(r => r.time)) : null);
          // Update mean
          setMean(valid.length ? (valid.reduce((a, b) => a + b.time, 0) / valid.length / 1000).toFixed(3) : "DNF");
          // ao5, ao12
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
    function onKeyUp(e: KeyboardEvent) {
      if (timerState === "ready" && e.code === "Space") {
        setTimerState("running");
        setStartTime(Date.now());
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
      <div className="absolute top-0 left-64 h-full w-0.5 bg-white z-30" style={{width: '1px', left: '16rem'}}></div>
      {/* Sidebar */}
      <aside className="w-64 bg-transparent flex flex-col items-center py-4 min-h-[80vh]">
        {/* Logo */}
        <div className="relative w-full flex items-center justify-center mb-4">
          <div className="absolute inset-0 pointer-events-none z-0" style={{borderRadius: '1rem', border: '3px solid white', boxSizing: 'border-box', top: 0, bottom: 0, left: 0, right: 0}}></div>
          <div className="bg-black bg-opacity-70 border-2 border-yellow-400 text-yellow-400 font-extrabold text-4xl px-6 py-4 rounded-xl shadow-lg flex items-center justify-center z-10" style={{letterSpacing: '2px', width: '100%'}}>csTimer</div>
        </div>
        {/* Session & stats */}
        <div className="relative w-full px-2 mb-1">
          <div className="absolute inset-0 pointer-events-none z-0" style={{borderRadius: '0', border: '1px solid white', boxSizing: 'border-box'}}></div>
          <div className="flex items-center justify-between mb-4 z-10 relative">
            <div className="bg-black bg-opacity-70 border border-blue-400 rounded px-2 py-1 text-white text-base font-bold cursor-pointer">Session1</div>
            <button
              className="text-xs text-white border border-red-300 rounded px-2 py-1 ml-2 hover:bg-red-100"
              onClick={() => { setResults([]); setBest(null); setMean('DNF'); setAo5('-'); setAo12('-'); }}
            >Clear</button>
          </div>
          <div className="bg-white bg-opacity-80 rounded-none p-2 text-xs text-black z-10 relative" style={{marginTop: '-8px'}}>
            <div className="flex justify-between"><span>current</span><span>best</span></div>
            <div className="flex justify-between mb-1"><span>time</span><span>-</span><span>{best !== null ? (best/1000).toFixed(3) : '-'}</span></div>
            <div>solve: {results.length}/0</div>
            <div>mean: {mean}</div>
          </div>
        </div>
        {/* Results table full height */}
        <div className="relative w-full flex-1 flex flex-col justify-end" style={{paddingBottom: 0, height: '100%'}}>
          <div className="absolute inset-0 pointer-events-none z-0" style={{borderRadius: '0', border: '1px solid white', boxSizing: 'border-box'}}></div>
          <div className="relative z-10 h-full flex flex-col justify-end">
            <div className="overflow-y-auto w-full" style={{height: 'calc(100vh - 320px)'}}>
              {/* Bảng kết quả dạng table với header cố định */}
              <div className="relative w-full h-full">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-black bg-opacity-80 z-20">
                    <tr className="bg-transparent">
                      <th className="border border-gray-400 text-blue-700 font-bold">ø</th>
                      <th className="border border-gray-400 text-blue-700 font-bold">time</th>
                      <th className="border border-gray-400 text-blue-700 font-bold">ao5</th>
                      <th className="border border-gray-400 text-blue-700 font-bold">ao12</th>
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
                          <td className="border border-gray-400 text-blue-700 text-center">{i}</td>
                          <td className={`border border-gray-400 text-center ${r.dnf ? 'text-red-500' : 'text-red-500'}`}>{r.dnf ? 'DNF' : (r.time/1000).toFixed(3)}</td>
                          <td className={`border border-gray-400 text-center ${ao5Val !== '-' ? 'text-red-500' : ''}`}>{ao5Val}</td>
                          <td className="border border-gray-400 text-center">{ao12Val}</td>
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
        <div className="w-full text-center text-2xl font-mono font-bold py-4 px-2 border-b border-gray-200 bg-transparent text-white drop-shadow-lg">
          {scramble}
        </div>
        {/* Timer big */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="flex flex-col items-center">
            {timerState === 'dnf' && (
              <div className="mb-4 text-3xl text-yellow-400 font-bold drop-shadow-lg animate-pulse">Lỗi DNF, nhấn Space</div>
            )}
            {/* Font-face is now in globals.css for global effect */}
            {timerState === 'preparing' ? (
              <div className="text-[10rem] digital7mono text-yellow-400 leading-none select-none drop-shadow-lg">{prepTime}</div>
            ) : timerState === 'ready' ? (
              <div className="text-[10rem] digital7mono text-yellow-400 leading-none select-none drop-shadow-lg">{prepTime}</div>
            ) : (timerState === 'dnf' || (timerState === 'done' && results.length > 0 && results[results.length-1].dnf)) ? (
              <div className="text-[10rem] digital7mono font-bold text-red-400 leading-none select-none drop-shadow-lg">DNF</div>
            ) : (
              <div className="text-[10rem] digital7mono text-white leading-none select-none drop-shadow-lg" style={{fontFamily: 'Digital7Mono, monospace'}}>{(timerState === 'running' || timerState === 'done') ? (time/1000).toFixed(3) : (time/1000).toFixed(3)}</div>
            )}
            <div className="text-2xl text-white font-mono drop-shadow-lg">ao5: {ao5}</div>
            <div className="text-2xl text-white font-mono drop-shadow-lg">ao12: {ao12}</div>
            {/* Nút timer hoặc icon */}
            <button className="absolute top-2 right-2 bg-white rounded-full p-2 shadow"><span role="img" aria-label="timer">⏱️</span></button>
          </div>
        </div>
      </section>
    </div>
  );
}
