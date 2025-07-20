"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// WCA 3x3x3 scramble generator
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

function generateRoomId() {
  // Simple random 6-character alphanumeric
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type User = {
  email?: string;
  firstName?: string;
  lastName?: string;
  // Thêm các trường khác nếu cần
};

export default function Lobby() {
  const [roomInput, setRoomInput] = useState("");
  const [tab, setTab] = useState("room");
  const [user, setUser] = useState<User | null>(null);
  // Scramble logic: chỉ cho phép next/last 1 lần
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
  const router = useRouter();

  // Fetch user info for account tab
  useEffect(() => {
    if (tab === "account") {
      fetch("/api/user/me", { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .then(data => setUser(data));
    }
  }, [tab]);

  // Timer logic
  useEffect(() => {
    if (tab !== "timer") return;
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
  }, [timerState, tab, startTime]);

  // Save result when done/dnf
  useEffect(() => {
    if (timerState === "done" || timerState === "dnf") {
      let t = timerState === "dnf" ? 0 : time;
      let dnf = timerState === "dnf";
      setResults(prev => {
        const newResults = [...prev, { time: t, scramble, dnf }];
        // Update best
        const valid = newResults.filter(r => !r.dnf);
        setBest(valid.length ? Math.min(...valid.map(r => r.time)) : null);
        // Update mean
        setMean(valid.length ? (valid.reduce((a, b) => a + b.time, 0) / valid.length / 1000).toFixed(2) : "DNF");
        // ao5, ao12
        function avgN(arr: any[], n: number) {
          if (arr.length < n) return "-";
          const lastN = arr.slice(-n).filter(r => !r.dnf);
          if (lastN.length < n) return "DNF";
          return (lastN.reduce((a, b) => a + b.time, 0) / n / 1000).toFixed(2);
        }
        setAo5(avgN(newResults, 5));
        setAo12(avgN(newResults, 12));
        return newResults;
      });
      // Đổi scramble ngay khi giải xong, không phải khi chuẩn bị
      setScramble(generateScramble());
      // Không reset time, giữ nguyên số vừa giải cho đến khi user thao tác tiếp
      setTimerState("idle");
      setStartTime(null);
    }
  }, [timerState]);

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = () => {
    if (roomInput.trim()) {
      router.push(`/room/${roomInput.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen text-white px-4 font-sans" style={{ backgroundImage: 'url(/images.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Tab Navigation Bar */}
      <nav className="w-full max-w-2xl flex items-center justify-between bg-gray-900 rounded-b-2xl shadow-lg px-6 py-3 mt-2 mb-10">
        <div className="flex gap-6">
          <button className={`text-base font-semibold transition-colors ${tab === "timer" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("timer")}>Timer</button>
          <button className={`text-base font-semibold transition-colors ${tab === "room" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("room")}>Room</button>
          <button className={`text-base font-semibold transition-colors ${tab === "account" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("account")}>Account</button>
        </div>
        <button className="text-white font-semibold text-base hover:text-red-400 transition-colors" onClick={() => {
          fetch('/api/user/logout', { method: 'POST' }).then(() => {
            router.push('/');
          });
        }}>Sign out</button>
      </nav>
      {/* Tab Content */}
      {tab === "timer" && (
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
                          // Tính ao5, ao12 cho từng dòng
                          let ao5Val = '-';
                          let ao12Val = '-';
                          if (arr.length - idx >= 5) {
                            const last5 = arr.slice(idx, idx+5).filter(x => !x.dnf);
                            if (last5.length === 5) ao5Val = (last5.reduce((a, b) => a + b.time, 0) / 5 / 1000).toFixed(2);
                          }
                          if (arr.length - idx >= 12) {
                            const last12 = arr.slice(idx, idx+12).filter(x => !x.dnf);
                            if (last12.length === 12) ao12Val = (last12.reduce((a, b) => a + b.time, 0) / 12 / 1000).toFixed(2);
                          }
                          return (
                            <tr key={i}>
                              <td className="border border-gray-400 text-blue-700 text-center">{i}</td>
                              <td className={`border border-gray-400 text-center ${r.dnf ? 'text-red-500' : 'text-red-500'}`}>{r.dnf ? 'DNF' : (r.time/1000).toFixed(2)}</td>
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
            <div className="w-full text-center text-lg font-mono py-4 px-2 border-b border-gray-200 bg-transparent text-white drop-shadow-lg">
              {scramble}
            </div>
            {/* Timer big */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="flex flex-col items-center">
                {timerState === 'preparing' ? (
                  <div className="text-[5rem] font-mono font-bold text-yellow-400 leading-none select-none drop-shadow-lg">{prepTime}</div>
                ) : timerState === 'ready' ? (
                  <div className="text-[5rem] font-mono font-bold text-yellow-400 leading-none select-none drop-shadow-lg">{prepTime}</div>
                ) : timerState === 'dnf' ? (
                  <div className="text-[8rem] font-mono font-bold text-red-400 leading-none select-none drop-shadow-lg">DNF</div>
                ) : (
                  <div className="text-[8rem] font-mono font-bold text-white leading-none select-none drop-shadow-lg">{(timerState === 'running' ? time : (timerState === 'done' ? time : time))/1000.0 < 0.001 ? '0.000' : ((timerState === 'running' || timerState === 'done') ? (time/1000).toFixed(3) : (time/1000).toFixed(3))}</div>
                )}
                <div className="text-2xl text-white font-mono drop-shadow-lg">ao5: {ao5}</div>
                <div className="text-2xl text-white font-mono drop-shadow-lg">ao12: {ao12}</div>
                {/* Nút timer hoặc icon */}
                <button className="absolute top-2 right-2 bg-white rounded-full p-2 shadow"><span role="img" aria-label="timer">⏱️</span></button>
              </div>
            </div>
          </section>
        </div>
      )}
      {tab === "room" && (
        <div className="w-full flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-8 text-center">Chọn chế độ</h2>
          <button
            className="bg-blue-500 px-8 py-3 rounded-xl hover:bg-blue-600 transition-colors font-medium mb-8"
            onClick={handleCreateRoom}
          >
            Tạo phòng
          </button>
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <input
              className="w-full px-4 py-2 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="text"
              placeholder="Nhập mã phòng..."
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJoinRoom(); }}
            />
            <button
              className="bg-green-500 w-full py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
              onClick={handleJoinRoom}
            >
              Tham gia
            </button>
          </div>
        </div>
      )}
      {tab === "account" && (
        <div className="w-full flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-6">Thông tin tài khoản</h2>
          {user ? (
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-xs flex flex-col gap-2">
              <div><span className="font-semibold">Email:</span> {user.email}</div>
              <div><span className="font-semibold">Tên:</span> {user.firstName} {user.lastName}</div>
              {/* Thêm các thông tin khác nếu có */}
            </div>
          ) : (
            <div className="text-gray-400">Đang tải thông tin...</div>
          )}
        </div>
      )}
    </main>
  );
}
