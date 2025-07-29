"use client";
import { useEffect, useRef, useState } from "react";
// import Peer from "simple-peer"; // REMOVED
import { createStringeeClient, createStringeeCall } from "@/lib/stringeeClient";
import { useRouter } from "next/navigation";
// Đảm bảo window.userName luôn có giá trị đúng khi vào phòng
declare global {
  interface Window { userName?: string }
}
import { getSocket } from "@/lib/socket";
import dynamic from 'next/dynamic';

// Scramble giống TimerTab.tsx
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

// Helper for stats (all in ms)
// Tính toán thống kê chuẩn WCA, DNF là null, mọi kết quả đều 3 số thập phân
function calcStats(times: (number|null)[]) {
  // valid: các lần giải hợp lệ (không DNF)
  const valid = times.filter(t => typeof t === 'number' && t > 0) as number[];
  if (valid.length === 0) return { best: null, worst: null, mean: null, ao5: null };
  const sorted = [...valid].sort((a, b) => a - b);
  const best = sorted[0];
  // worst: nếu có DNF thì là DNF, nếu không thì là số lớn nhất
  const worst = times.includes(null) ? null : sorted[sorted.length - 1];
  // mean: trung bình cộng các lần hợp lệ
  const mean = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  // ao5: nếu có đủ 5 lần, loại tốt nhất và tệ nhất (DNF là tệ nhất), tính trung bình 3 lần còn lại
  let ao5 = null;
  if (times.length >= 5) {
    const last5 = times.slice(-5);
    const dnfCount = last5.filter(t => t === null).length;
    if (dnfCount > 1) {
      ao5 = null;
    } else {
      // DNF là tệ nhất, nên khi loại tệ nhất sẽ loại DNF (nếu có)
      const arr = last5.map(t => t === null ? Infinity : t);
      const sorted5 = [...arr].sort((a, b) => a - b);
      // loại tốt nhất (min) và tệ nhất (max)
      const ao5Arr = sorted5.slice(1, 4).filter(x => x !== Infinity);
      ao5 = ao5Arr.length === 3 ? ao5Arr.reduce((a, b) => a + b, 0) / 3 : null;
    }
  }
  return { best, worst, mean, ao5 };
}


export default function RoomPage() {
  // Trạng thái thông báo tráo scramble
  const [showScrambleMsg, setShowScrambleMsg] = useState<boolean>(false);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [micOn, setMicOn] = useState<boolean>(true);
  // Đã loại bỏ các ref và state liên quan đến Stringee và mediaStream, chỉ giữ lại state cho Daily.co và socket
  const [roomId, setRoomId] = useState<string>("");
  const [scramble, setScramble] = useState<string>("");
  const [scrambleIndex, setScrambleIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const timerRef = useRef<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [prep, setPrep] = useState<boolean>(false);
  const [prepTime, setPrepTime] = useState<number>(15);
  // Ref lưu thời điểm bắt đầu nhấn Space hoặc chạm (dùng cho cả desktop và mobile)
  const pressStartRef = useRef<number | null>(null);
  const [canStart, setCanStart] = useState<boolean>(false);
  const [spaceHeld, setSpaceHeld] = useState<boolean>(false);
  const [users, setUsers] = useState<string[]>([]); // userId array
  const [userId, setUserId] = useState<string>("");
  const [opponentId, setOpponentId] = useState<string>("");
  const [waiting, setWaiting] = useState<boolean>(true);
  const [turn, setTurn] = useState<'me'|'opponent'>('opponent');
  const [myResults, setMyResults] = useState<(number|null)[]>([]);
  const [opponentResults, setOpponentResults] = useState<(number|null)[]>([]);
  const [dnf, setDnf] = useState<boolean>(false);
  // Thêm state cho xác nhận kết quả
  const [pendingResult, setPendingResult] = useState<number|null>(null);
  const [pendingType, setPendingType] = useState<'normal'|'+2'|'dnf'>('normal');
  const [opponentTime, setOpponentTime] = useState<number|null>(null);
  const [userName, setUserName] = useState<string>(""); // display name
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [showRules, setShowRules] = useState(false); // State for luật thi đấu modal

  const [opponentName, setOpponentName] = useState<string>('Đối thủ'); // display name
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  // Thêm khai báo biến roomUrl đúng chuẩn
  const [roomUrl, setRoomUrl] = useState<string>('');

  // Luôn tạo roomUrl khi vào phòng nếu chưa có (dù là chủ phòng hay đối thủ)
  useEffect(() => {
    if (!roomId) return;
    if (roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0) return;
    if (users.length >= 1) {
      fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.roomUrl) {
            setRoomUrl(data.roomUrl);
          }
        })
        .catch(err => {
          console.error('Lỗi tạo roomUrl:', err);
        });
    }
  }, [roomId, users.length]);


  // ...giữ nguyên toàn bộ logic và return JSX phía sau...

  // --- Effects and logic below ---

  // Hàm rời phòng: chỉ chuyển hướng về lobby
  function handleLeaveRoom() {
    window.location.href = '/lobby';
    setTimeout(() => {
      window.location.reload();
    }, 1300);
  }

  // Đã loại bỏ cleanup Stringee khi đóng tab hoặc reload

  // Reload khi rời phòng bằng nút back (popstate)
  useEffect(() => {
    function handlePopState() {
      window.location.reload();
    }
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Đảm bảo userName luôn đúng khi vào phòng (nếu window.userName chưa có)
  // Lấy userId và userName từ DB, lưu vào state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetch('/api/user/me', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user && data.user._id) {
            // Chỉ lấy 6 ký tự cuối của ObjectId
            setUserId(typeof data.user._id === 'string' && data.user._id.length >= 6 ? data.user._id.slice(-6) : data.user._id);
            if (data.user.firstName && data.user.lastName) {
              setUserName(data.user.firstName + ' ' + data.user.lastName);
            } else {
              setUserName('Không xác định');
            }
          }
        });
    }
  }, []);

  // Đã loại bỏ effect lấy media stream và gán vào video element cũ



  // Xác định thiết bị mobile (hydration-safe) và mobile landscape thực sự (màn nhỏ)
  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobile(mobile);
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      // Chỉ coi là mobile landscape nếu là mobile, landscape và chiều rộng nhỏ hơn 900px
      setIsMobileLandscape(mobile && !portrait && window.innerWidth < 900);
    }
    if (typeof window !== 'undefined') {
      checkDevice();
      window.addEventListener('resize', checkDevice);
      window.addEventListener('orientationchange', checkDevice);
      return () => {
        window.removeEventListener('resize', checkDevice);
        window.removeEventListener('orientationchange', checkDevice);
      };
    }
  }, []);

  // Lấy roomId từ URL client-side để tránh lỗi build
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // URL dạng /room/ROOMID
      const match = window.location.pathname.match(/\/room\/([^/]+)/);
      if (match && match[1]) setRoomId(match[1]);
    }
  }, []);

  // Luôn khôi phục kết quả từ localStorage khi roomId thay đổi
  useEffect(() => {
    if (!roomId) return;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`myResults_${roomId}`);
      setMyResults(saved ? JSON.parse(saved) : []);
      const savedOpp = localStorage.getItem(`opponentResults_${roomId}`);
      setOpponentResults(savedOpp ? JSON.parse(savedOpp) : []);
    }
  }, [roomId]);

  // userName luôn phải lấy từ DB, không được rỗng
  // Đã lấy userId/userName ở effect trên, không cần lặp lại

  // Kiểm tra nếu là người tạo phòng (tức là vừa tạo phòng mới) (hydration-safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const flag = sessionStorage.getItem('justCreatedRoom');
      if (flag === roomId) {
        sessionStorage.removeItem('justCreatedRoom');
        setIsCreator(true);
      } else {
        setIsCreator(false);
      }
    }
  }, [roomId]);

  // always keep timerRef in sync
  useEffect(() => { timerRef.current = timer; }, [timer]);





  // Kết nối socket, join room, lắng nghe users và kết quả đối thủ
  useEffect(() => {
    const socket = getSocket();
    if (!userId) return;
    socket.emit("join-room", { roomId, userId, userName });
    socket.on("room-users", (roomUsers: Array<{ userId: string, userName: string }>) => {
      // roomUsers là mảng object { userId, userName }
      const filteredUsers = (roomUsers || []).filter(u => u && typeof u.userId === 'string');
      setUsers(filteredUsers.map(u => u.userId));
      setWaiting(filteredUsers.length < 2);
      // Xác định đối thủ
      const opp = filteredUsers.find(u => u.userId !== userId);
      if (opp) {
        setOpponentId(opp.userId);
        setOpponentName(opp.userName || 'Đối thủ');
      }
    });
    socket.on("opponent-solve", ({ userId: oppId, userName: oppName, time }: { userId: string, userName: string, time: number|null }) => {
      setOpponentResults(r => [...r, time]);
      setTurn('me');
      setOpponentId(oppId);
      setOpponentName(oppName || 'Đối thủ');
    });
    return () => {
      socket.off("room-users");
      socket.off("opponent-solve");
    };
  }, [roomId, userId, userName]);


  // Khi là người tạo phòng, luôn đảm bảo chỉ có 1 user và waiting=true ngay sau khi tạo phòng
  useEffect(() => {
    if (isCreator && typeof userId === 'string') {
      setUsers([userId]);
      setWaiting(true);
      setTurn('me'); // Chủ phòng luôn được chơi trước
    }
  }, [isCreator, userId]);

  // Khi đủ 2 người, nếu không phải chủ phòng thì phải chờ đối thủ chơi trước
  useEffect(() => {
    if (!isCreator && users.length === 2) {
      setTurn('opponent');
    }
  }, [isCreator, users.length]);

  // Nhận scramble từ server qua socket, hiện thông báo tráo scramble đúng 5s
  useEffect(() => {
    const socket = getSocket();
    let scrambleMsgTimeout: NodeJS.Timeout | null = null;
    const handleScramble = ({ scramble, index }: { scramble: string, index: number }) => {
      setScramble(scramble);
      setScrambleIndex(index);
      // Reset trạng thái cho vòng mới
      setPrep(false);
      setCanStart(false);
      setSpaceHeld(false);
      setTimer(0);
      setDnf(false);
      setPendingResult(null);
      setPendingType('normal');
      setShowScrambleMsg(true); // Hiện thông báo tráo scramble
      if (scrambleMsgTimeout) clearTimeout(scrambleMsgTimeout);
      scrambleMsgTimeout = setTimeout(() => {
        setShowScrambleMsg(false);
      }, 10000);
    };
    socket.on("scramble", handleScramble);
    return () => {
      socket.off("scramble", handleScramble);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
      if (scrambleMsgTimeout) clearTimeout(scrambleMsgTimeout);
    };
  }, [roomId]);
  // Ẩn thông báo tráo scramble khi có người bắt đầu giải (bắt đầu chuẩn bị hoặc chạy)
  useEffect(() => {
    if (prep || running) {
      setShowScrambleMsg(false);
    }
  }, [prep, running]);


  // Desktop: Nhấn Space để vào chuẩn bị, giữ >=0.5s rồi thả ra để bắt đầu chạy
  useEffect(() => {
    if (isMobile) return;
    if (waiting || running || turn !== 'me' || myResults.length >= 5) return;
    let spaceHeld = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (prep) {
        if (!spaceHeld) {
          pressStartRef.current = Date.now();
          spaceHeld = true;
        }
      } else if (!prep && !running) {
        setPrep(true);
        setPrepTime(15);
        setDnf(false);
        pressStartRef.current = Date.now();
        spaceHeld = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (prep && spaceHeld) {
        const now = Date.now();
        const start = pressStartRef.current;
        pressStartRef.current = null;
        spaceHeld = false;
        if (start && now - start >= 300) {
          setPrep(false);
          setCanStart(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile, waiting, running, prep, turn, myResults.length]);

  // Đếm ngược 15s chuẩn bị
  useEffect(() => {
    if (!prep || waiting) return;
    setCanStart(false);
    setSpaceHeld(false);
    setDnf(false);
    prepIntervalRef.current = setInterval(() => {
      setPrepTime(t => {
        if (t <= 1) {
          clearInterval(prepIntervalRef.current!);
          setPrep(false);
          setCanStart(false);
          setRunning(false);
          setDnf(true); // DNF nếu hết giờ chuẩn bị
          pressStartRef.current = null;
          // Lưu kết quả DNF và gửi lên server, chuyển lượt cho đối thủ
          setMyResults(r => {
            const newR = [...r, null];
            const socket = getSocket();
            socket.emit("solve", { roomId, userId, userName, time: null });
            return newR;
          });
          setTurn('opponent');
          setTimeout(() => setOpponentTime(12345 + Math.floor(Math.random()*2000)), 1000); // Giả lập đối thủ giải
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, [prep, waiting]);


  // Khi canStart=true, bắt đầu timer, dừng khi bấm phím bất kỳ (desktop, không nhận chuột) hoặc chạm (mobile)
  useEffect(() => {
    if (!canStart || waiting) return;
    setRunning(true);
    setTimer(0);
    timerRef.current = 0;
    intervalRef.current = setInterval(() => {
      setTimer(t => {
        timerRef.current = t + 10;
        return t + 10;
      });
    }, 10);
    // Khi dừng timer, chỉ lưu vào pendingResult, không gửi lên server ngay
    const stopTimer = () => {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPendingResult(timerRef.current);
      setPendingType('normal');
      setCanStart(false);
      // Không setTurn('opponent') ở đây, chờ xác nhận
    };
    const handleAnyKey = (e: KeyboardEvent) => {
      if (waiting) return;
      if (e.type === 'keydown') {
        stopTimer();
      }
    };
    const handleMouse = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const handleTouch = (e: TouchEvent) => {
      if (!isMobile) return;
      const webcamEls = document.querySelectorAll('.webcam-area');
      for (let i = 0; i < webcamEls.length; i++) {
        if (webcamEls[i].contains(e.target as Node)) return;
      }
      stopTimer();
    };
    if (isMobile) {
      window.addEventListener('touchstart', handleTouch);
    } else {
      window.addEventListener("keydown", handleAnyKey);
      window.addEventListener("mousedown", handleMouse, true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (isMobile) {
        window.removeEventListener('touchstart', handleTouch);
      } else {
        window.removeEventListener("keydown", handleAnyKey);
        window.removeEventListener("mousedown", handleMouse, true);
      }
    };
    // eslint-disable-next-line
  }, [canStart, waiting, roomId, userName, isMobile]);

  // Không còn random bot, chỉ nhận kết quả đối thủ qua socket

  // Lưu kết quả vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`myResults_${roomId}`, JSON.stringify(myResults));
      localStorage.setItem(`opponentResults_${roomId}`, JSON.stringify(opponentResults));
    }
  }, [myResults, opponentResults, roomId]);

  // Reset cho lần giải tiếp theo
  useEffect(() => {
    const totalSolves = myResults.length + opponentResults.length;
    if (totalSolves === 0) return;
    if (myResults.length > 0 && myResults.length > opponentResults.length) return; // chờ đối thủ
    setPrep(false);
    setCanStart(false);
    setSpaceHeld(false);
    setTimer(0);
    setDnf(false);
    // Chỉ đổi scramble khi tổng số lượt giải là số chẵn (sau mỗi vòng)
    if (totalSolves % 2 === 0 && totalSolves < 10) {
      // Gửi yêu cầu đổi scramble lên server (nếu là chủ phòng)
      const socket = getSocket();
      socket.emit("next-scramble", { roomId });
    }
  }, [myResults, opponentResults]);

  // Tính toán thống kê
  const myStats = calcStats(myResults);
  const oppStats = calcStats(opponentResults);

function formatTime(ms: number|null, showDNF: boolean = false) {
  if (ms === null) return showDNF ? 'DNF' : '';
  return (ms/1000).toFixed(3);
}

function formatStat(val: number|null, showDNF: boolean = false) {
  if (val === null) return showDNF ? 'DNF' : '';
  return (val/1000).toFixed(3);
}

  if (!userName || !roomId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="text-xl font-semibold">Đang tải thông tin người dùng...</div>
      </div>
    );
  }
  if (isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4 text-center">VUI LÒNG XOAY NGANG MÀN HÌNH ĐỂ SỬ DỤNG ỨNG DỤNG!</div>
        <div className="text-lg text-red-300 mb-2 text-center">Nhớ tắt chế độ khóa xoay màn hình ở bảng điều khiển của thiết bị.</div>
      </div>
    );
  }

  // Helper: compact style for mobile landscape only
  const mobileShrink = isMobileLandscape;
  return (
    <div
      className={
        mobileShrink
          ? "h-screen w-screen flex flex-col items-center justify-start text-white py-1 overflow-x-hidden overflow-y-auto min-h-0 relative"
          : "min-h-screen w-full flex flex-col items-center text-white py-4 overflow-hidden relative"
      }
      style={{
        backgroundImage: "url('/images.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000',
      }}
    >
      {/* Nút rời phòng */}
      {/* Nút rời phòng: luôn cố định trên mobile landscape và desktop */}
      <button
        onClick={handleLeaveRoom}
        className={
          mobileShrink
            ? "absolute top-0.5 left-0.5 z-50 px-1 py-0.5 bg-red-600 hover:bg-red-700 text-[9px] rounded font-bold shadow-lg min-w-0 min-h-0"
            : "fixed top-4 left-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg"
        }
        style={mobileShrink ? { fontSize: 9, minWidth: 0, minHeight: 0, padding: 1 } : {}}
        type="button"
      >Rời phòng</button>
      {/* Nút luật thi đấu ở góc trên bên phải */}
      <div
        className={
          mobileShrink
            ? "absolute top-0.5 right-0.5 z-50 flex flex-col items-center"
            : "fixed top-4 right-4 z-50 flex flex-col items-center"
        }
        style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
      >
        <button
          onClick={() => setShowRules(true)}
          className={
            mobileShrink
              ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
              : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center"
          }
          style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
          type="button"
          aria-label="Luật thi đấu"
          title="Luật thi đấu"
        >
          <span role="img" aria-label="Luật thi đấu">📜</span>
        </button>
        <span
          className={mobileShrink ? "text-[9px] text-blue-200 font-semibold mt-0.5" : "text-base text-blue-200 font-semibold mt-1"}
          style={mobileShrink ? { lineHeight: '12px' } : {}}
        >Luật thi đấu</span>
      </div>
      {/* Modal luật thi đấu */}
      {showRules && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className={mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[260px] h-[220px] border-2 border-blue-400 relative flex flex-col" : "bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] h-[340px] border-4 border-blue-400 relative flex flex-col"}
            style={mobileShrink ? { fontSize: 10, overflow: 'hidden' } : { overflow: 'hidden' }}
          >
            <button
              onClick={() => setShowRules(false)}
              className={mobileShrink ? "absolute top-1 right-1 px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold" : "absolute top-3 right-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-base rounded-lg font-bold"}
              style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              type="button"
            >Đóng</button>
            <div className={mobileShrink ? "text-[11px] font-bold text-blue-300 mb-1 text-center" : "text-xl font-bold text-blue-300 mb-3 text-center"}>
              Luật thi đấu phòng
            </div>
            <div
              className={mobileShrink ? "text-[9px] text-white flex-1 overflow-y-auto pr-1" : "text-base text-white flex-1 overflow-y-auto pr-2"}
              style={mobileShrink ? { maxHeight: 160 } : { maxHeight: 240 }}
            >
              {/* Thay nội dung này bằng luật thi đấu cụ thể sau */}
              <ul className="list-disc pl-4">
                <li>Mỗi người có 5 lượt giải, chủ phòng là người giải trước.</li>
                <li>Trường hợp camera không hoạt động, vui lòng tắt bật lại camera.</li>
                <li>Chỉ có thể giải khi lượt của bạn, nếu không phải lượt của bạn thì hệ thống tự động khóa thao tác (chú ý xem thông báo trạng thái).</li>
                <li>Mỗi vòng là 1 scramble, nghĩa là có tổng cộng 5 scramble, mỗi vòng cả 2 người đều cùng tráo theo scramble đã cho.</li>
                <li>Nhấn <b>Space</b> (đối với máy tính) để có 15 giây chuẩn bị, tiếp tục nhấn <b>Space</b> để bắt đầu giải và cuối cùng nhấn phím <b>Space</b> để kết thúc lượt giải.</li>
                <li>Trên điện thoại, chạm 1 lần vào timer để chuẩn bị, nhấn giữ và thả timer để bắt đầu và chạm 1 lần vào timer để kết thúc lượt giải.</li>              
                <li>DNF (Did Not Finish) nếu hết giờ chuẩn bị hoặc chọn DNF sau khi bạn dừng thời gian.</li>
                <li>Ấn <b>Gửi</b> để xác nhận kết quả, <b>+2</b> nếu bị phạt, <b>DNF</b> nếu không hoàn thành, khi đó kết quả sẽ được cập nhật lên bảng kết quả.</li>
                <li>Người có Ao5 tốt hơn sẽ thắng.</li>
                <li><b>HÃY THI ĐẤU MỘT CÁCH CÔNG BẰNG VÀ TRUNG THỰC!</b></li>
              </ul>
            </div>
          </div>  
        </div>
      )}
      {/* Khối trên cùng: Tên phòng và scramble */}
      <div className="w-full flex flex-col items-center justify-center mb-0.5">
        <h2 className={mobileShrink ? "text-[14px] font-bold mb-1" : "text-3xl font-bold mb-2"}>
          Phòng: <span className="text-blue-400">{roomId}</span>
        </h2>
        <div className={mobileShrink ? "mb-1 px-2 py-1 bg-gray-800 rounded text-[16px] font-mono font-bold tracking-widest select-all w-[90vw] max-w-[340px] overflow-x-auto whitespace-normal" : "mb-2 px-2 py-1 bg-gray-800 rounded-xl text-2xl font-mono font-bold tracking-widest select-all"}
          style={mobileShrink ? { fontSize: 16, minWidth: '60vw', maxWidth: 340, overflowX: 'auto', whiteSpace: 'normal' } : {}}>
          {scramble}
        </div>
      </div>
      {/* Hàng ngang 3 khối: bảng tổng hợp | trạng thái + thông báo | bảng kết quả */}
      <div
        className={
          mobileShrink
            ? "w-full flex flex-row items-center gap-1 px-0 mb-1"
            : isMobileLandscape
              ? "w-full flex flex-row flex-wrap justify-between items-start gap-2 px-1 mb-4 overflow-x-auto"
              : "w-full flex flex-row justify-between items-start gap-4 mb-6"
        }
        style={mobileShrink ? { maxWidth: '100vw', columnGap: 4 } : isMobileLandscape ? { maxWidth: '100vw', rowGap: 8 } : {}}
      >
        {/* Bảng tổng hợp bên trái */}
        <div
          className={
            mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-1 m-0 min-w-[120px] max-w-[180px] w-[150px] flex-shrink-0 ml-0 mb-1"
              : isMobileLandscape
                ? "bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white rounded-xl p-0 m-0 min-w-[180px] max-w-[260px] w-[220px] flex-shrink-0 ml-0 mb-2"
                : "bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white rounded-xl p-0 m-0 min-w-[260px] max-w-[340px] w-[300px] flex-shrink-0 ml-4"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 11 } : isMobileLandscape ? { wordBreak: 'break-word', fontSize: 13 } : { fontSize: 15 }}
        >
          <table className={mobileShrink ? "text-center bg-gray-900 rounded overflow-hidden text-[8px] shadow border-collapse w-full" : "text-center bg-gray-900 rounded-xl overflow-hidden text-sm shadow-lg border-collapse w-full"} style={mobileShrink ? { border: '1px solid #374151', margin: 0 } : { border: '1px solid #374151', margin: 0 }}>
            <thead className="bg-gray-800">
              <tr>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Tên</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Best</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Worst</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Mean</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Ao5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#60a5fa' }}>{userName}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-green-300">{myStats.best !== null ? formatTime(myStats.best) : formatTime(myStats.best, myResults.length >= 5)}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-red-300">{myStats.worst !== null ? formatTime(myStats.worst) : formatTime(myStats.worst, myResults.length >= 5)}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.mean !== null ? formatStat(myStats.mean) : formatStat(myStats.mean, myResults.length >= 5)}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.ao5 !== null ? formatStat(myStats.ao5) : formatStat(myStats.ao5, myResults.length >= 5)}</td>
              </tr>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#f472b6' }}>{opponentName}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-green-300">{oppStats.best !== null ? formatTime(oppStats.best) : formatTime(oppStats.best, opponentResults.length >= 5)}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-red-300">{oppStats.worst !== null ? formatTime(oppStats.worst) : formatTime(oppStats.worst, opponentResults.length >= 5)}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.mean !== null ? formatStat(oppStats.mean) : formatStat(oppStats.mean, opponentResults.length >= 5)}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.ao5 !== null ? formatStat(oppStats.ao5) : formatStat(oppStats.ao5, opponentResults.length >= 5)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Khối giữa: trạng thái + thông báo */}
        <div
          className={
            mobileShrink
              ? "flex flex-col items-center justify-center min-w-[70px] max-w-[110px] mx-auto mb-1 w-auto"
              : isMobileLandscape
                ? "flex flex-col items-center justify-center min-w-[120px] max-w-[180px] mx-auto mb-2 w-auto"
                : "flex flex-col items-center justify-center min-w-[260px] max-w-[520px] mx-auto w-auto"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 9 } : isMobileLandscape ? { wordBreak: 'break-word' } : {}}
        >
          {/* Thanh trạng thái */}
          <div className="mb-2 w-full flex items-center justify-center">
            {waiting ? (
              <span className={mobileShrink ? "text-yellow-400 text-[10px] font-semibold text-center w-full block" : "text-yellow-400 text-2xl font-semibold text-center w-full block"}>Đang chờ đối thủ vào phòng...</span>
            ) : (
              <span className={mobileShrink ? "text-green-400 text-[10px] font-semibold text-center w-full block" : "text-green-400 text-2xl font-semibold text-center w-full block"}>Đã đủ 2 người, sẵn sàng thi đấu!</span>
            )}
          </div>
          {/* Thông báo trạng thái lượt giải + Thông báo lỗi camera */}
          <div className="mb-3 relative w-full flex flex-col items-center justify-center text-center">
            {(() => {
              // Chỉ hiển thị khi đủ 2 người
              if (waiting || users.length < 2) return null;
              // Nếu cả 2 đã đủ 5 lượt thì thông báo kết quả
              const bothDone = myResults.length >= 5 && opponentResults.length >= 5;
              if (bothDone) {
                // So sánh ao5, nếu đều DNF thì hòa
                const myAo5 = calcStats(myResults).ao5;
                const oppAo5 = calcStats(opponentResults).ao5;
                let winner = null;
                if (myAo5 === null && oppAo5 === null) {
                  return <span className={mobileShrink ? "text-[9px] font-semibold text-yellow-400" : "text-base font-semibold text-yellow-400"}>Trận đấu kết thúc, hòa</span>;
                } else if (myAo5 === null) {
                  winner = opponentName;
                } else if (oppAo5 === null) {
                  winner = userName;
                } else if (myAo5 < oppAo5) {
                  winner = userName;
                } else if (myAo5 > oppAo5) {
                  winner = opponentName;
                } else {
                  return <span className="text-base font-semibold text-yellow-400">Trận đấu kết thúc, hòa</span>;
                }
                  return <span className={mobileShrink ? "text-[9px] font-semibold text-green-400" : "text-base font-semibold text-green-400"}>Trận đấu kết thúc, {winner} thắng</span>;
              }
              // Đang trong trận
              let msg = "";
              let name = turn === 'me' ? userName : opponentName;
              if (prep) {
                msg = `${name} đang chuẩn bị`;
              } else if (running) {
                msg = `${name} đang giải`;
              } else {
                msg = `Đến lượt ${name} thi đấu`;
              }
              return (
                <>
                  <span className={mobileShrink ? "text-[10px] font-semibold text-green-300" : "text-xl font-semibold text-green-300"}>{msg}</span>
                  {showScrambleMsg && (
                    <span className={mobileShrink ? "text-[10px] font-semibold text-yellow-300 block mt-1" : "text-xl font-semibold text-yellow-300 block mt-2"}>Hai cuber hãy tráo scramble</span>
                  )}
                </>
              );
            })()}
            {/* Đã xóa thông báo lỗi camera theo yêu cầu */}
          </div>
        </div>
        {/* Bảng kết quả bên phải */}
        <div
          className={
            mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-1 m-0 min-w-[120px] max-w-[180px] w-[150px] flex-shrink-0 mr-0 mb-1"
              : isMobileLandscape
                ? "bg-gray-900 bg-opacity-90 shadow-lg rounded-xl p-0 m-0 min-w-[180px] max-w-[260px] w-[220px] flex-shrink-0 mr-0 mb-2"
                : "bg-gray-900 bg-opacity-90 shadow-lg rounded-xl p-0 m-0 min-w-[260px] max-w-[340px] w-[300px] flex-shrink-0 mr-4"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 11 } : isMobileLandscape ? { wordBreak: 'break-word', fontSize: 13 } : { fontSize: 15 }}
        >
          <table className={mobileShrink ? "w-full text-center bg-gray-900 rounded overflow-hidden text-[8px] shadow border-collapse" : "w-full text-center bg-gray-900 rounded-xl overflow-hidden text-sm shadow-lg"}>
            <thead className="bg-gray-800">
              <tr>
                <th className="py-2 border border-gray-700">STT</th>
                <th className="py-2 border border-gray-700" style={{ color: '#60a5fa' }}>{userName}</th>
                <th className="py-2 border border-gray-700" style={{ color: '#f472b6' }}>{opponentName}</th>
              </tr>
            </thead>
            <tbody>
              {[0,1,2,3,4].map(i => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="py-1 border border-gray-700">{i+1}</td>
                  <td className="py-1 border border-gray-700">{myResults[i] === null ? 'DNF' : (typeof myResults[i] === 'number' ? formatTime(myResults[i]) : "")}</td>
                  <td className="py-1 border border-gray-700">{opponentResults[i] === null ? 'DNF' : (typeof opponentResults[i] === 'number' ? formatTime(opponentResults[i]) : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Đã xóa Timer phía trên, chỉ giữ lại Timer nằm ngang giữa hai webcam */}
      {/* Webcam + Timer ngang hàng, chia 3 cột: webcam - timer - webcam */}
      <div
        className={mobileShrink ? "w-full flex flex-row justify-center items-center gap-2 box-border mb-2" : "w-full flex flex-row justify-center items-center gap-4 box-border"}
        style={mobileShrink ? { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' } : { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' }}
      >
        {/* Webcam của bạn - cột 1 */}
        <div
          className={mobileShrink ? "flex flex-col items-center webcam-area flex-shrink-0" : "flex flex-col items-center webcam-area flex-shrink-0"}
          style={mobileShrink ? { flex: '0 1 40%', maxWidth: 180, minWidth: 100 } : { flex: '0 1 40%', maxWidth: 420, minWidth: 180 }}
        >
          <div
            className={mobileShrink ? "rounded flex items-center justify-center mb-0.5 relative shadow border border-blue-400" : "rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl border-4 border-blue-400"}
            style={mobileShrink
              ? { width: 160, height: 120, minWidth: 100, minHeight: 80, maxWidth: 180, maxHeight: 140 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
            {/* Video element for local webcam */}
            <video
              id="my-video"
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', position: 'absolute', top: 0, left: 0, zIndex: 1, display: camOn ? 'block' : 'none' }}
            />
            <button
              className={mobileShrink ? `absolute bottom-0.5 left-0.5 px-0.5 py-0.5 rounded text-[8px] ${camOn ? 'bg-gray-700' : 'bg-red-600'}` : `absolute bottom-3 left-3 px-3 py-1 rounded text-base ${camOn ? 'bg-gray-700' : 'bg-red-600'}`}
              style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              onClick={() => setCamOn(v => !v)}
              type="button"
            >{camOn ? 'Tắt cam' : 'Bật cam'}</button>
            <button
              className={mobileShrink ? `absolute bottom-0.5 right-0.5 px-0.5 py-0.5 rounded text-[8px] ${micOn ? 'bg-gray-700' : 'bg-red-600'}` : `absolute bottom-3 right-3 px-3 py-1 rounded text-base ${micOn ? 'bg-gray-700' : 'bg-red-600'}`}
              style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              onClick={() => setMicOn(v => !v)}
              type="button"
            >{micOn ? 'Tắt mic' : 'Bật mic'}</button>
          </div>
          <span className={mobileShrink ? "font-semibold text-[8px] text-blue-300" : "font-semibold text-lg text-blue-300"}>{userName}</span>
        </div>
        {/* Timer ở giữa - cột 2 */}
        <div
          className={mobileShrink ? "flex flex-col items-center justify-center timer-area" : "flex flex-col items-center justify-center timer-area"}
          style={mobileShrink ? { flex: '0 1 20%', minWidth: 120, maxWidth: 200 } : { flex: '0 1 20%', minWidth: 180, maxWidth: 320 }}
        {...(isMobile ? {
            onTouchStart: (e) => {
              if (pendingResult !== null) return;
              // Nếu chạm vào webcam thì bỏ qua
              const webcamEls = document.querySelectorAll('.webcam-area');
              for (let i = 0; i < webcamEls.length; i++) {
                if (webcamEls[i].contains(e.target as Node)) return;
              }
              if (waiting || myResults.length >= 5) return;
              // Đánh dấu touch bắt đầu
              pressStartRef.current = Date.now();
            },
            onTouchEnd: (e) => {
              if (pendingResult !== null) return;
              // Nếu chạm vào webcam thì bỏ qua
              const webcamEls = document.querySelectorAll('.webcam-area');
              for (let i = 0; i < webcamEls.length; i++) {
                if (webcamEls[i].contains(e.target as Node)) return;
              }
              if (waiting || myResults.length >= 5) return;
              const now = Date.now();
              const start = pressStartRef.current;
              pressStartRef.current = null;
              // 1. Tap and release to enter prep
              if (!prep && !running && turn === 'me') {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
                return;
              }
              // 2. In prep, giữ >=0.5s rồi thả ra để start timer
              if (prep && !running) {
                if (start && now - start >= 300) {
                  setPrep(false);
                  setCanStart(true);
                }
                return;
              }
              // 3. When running, tap and release to stop timer
              if (running) {
                setRunning(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                setPendingResult(timerRef.current);
                setPendingType('normal');
                setCanStart(false);
                return;
              }
            }
          } : {
            onClick: () => {
              if (waiting || myResults.length >= 5) return;
              if (!prep && !running && turn === 'me') {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
              } else if (prep && !running) {
                setPrep(false);
                setCanStart(true);
              } else if (canStart && !running) {
                setRunning(true);
                setTimer(0);
                timerRef.current = 0;
                intervalRef.current = setInterval(() => {
                  setTimer(t => {
                    timerRef.current = t + 10;
                    return t + 10;
                  });
                }, 10);
                setCanStart(false);
                setPrep(false);
              } else if (running) {
                setRunning(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                setPendingResult(timerRef.current);
                setPendingType('normal');
                setCanStart(false);
              }
            }
          })}
        >
          {/* Nếu có pendingResult thì hiện 3 nút xác nhận */}
          {pendingResult !== null && !running && !prep ? (
            <div className="flex flex-row items-center justify-center gap-1 mb-1">
              <button
                className={mobileShrink ? "px-1 py-0.5 text-[9px] rounded bg-green-600 hover:bg-green-700 font-bold text-white" : "px-3 py-1 text-base rounded-lg bg-green-600 hover:bg-green-700 font-bold text-white"}
                onClick={e => {
                  e.stopPropagation();
                  // Gửi kết quả bình thường
                  let result: number|null = pendingResult;
                  if (pendingType === '+2' && result !== null) result = result + 2000;
                  if (pendingType === 'dnf') result = null;
                  setMyResults(r => {
                    const newR = [...r, result];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userId, userName, time: result === null ? null : result });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  setTurn('opponent');
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >Gửi</button>
              <button
                className={mobileShrink ? `px-1 py-0.5 text-[9px] rounded bg-yellow-500 font-bold text-white` : `px-3 py-1 text-base rounded-lg bg-yellow-500 font-bold text-white`}
                onClick={e => {
                  e.stopPropagation();
                  // Gửi kết quả +2 ngay
                  let result: number|null = pendingResult;
                  if (result !== null) result = result + 2000;
                  setMyResults(r => {
                    const newR = [...r, result];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userId, userName, time: result });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  setTurn('opponent');
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >+2</button>
              <button
                className={mobileShrink ? `px-1 py-0.5 text-[9px] rounded bg-red-600 font-bold text-white` : `px-3 py-1 text-base rounded-lg bg-red-600 hover:bg-red-700 font-bold text-white`}
                onClick={e => {
                  e.stopPropagation();
                  // Gửi kết quả DNF ngay
                  setMyResults(r => {
                    const newR = [...r, null];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userId, userName, time: null });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  setTurn('opponent');
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >DNF</button>
            </div>
          ) : null}
          <div
            className={mobileShrink ? "text-2xl font-bold text-yellow-300 drop-shadow select-none px-2 py-2 rounded" : "text-8xl font-['Digital-7'] font-bold text-yellow-300 drop-shadow-lg select-none px-8 py-4 rounded-2xl"}
            style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: 32, textAlign: 'center', fontSize: 32, padding: 2 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: '180px', textAlign: 'center', fontSize: 80, padding: 8 }}
          >
              {prep ? (
                <span className={mobileShrink ? "text-[20px]" : undefined}>Chuẩn bị: {prepTime}s</span>
              ) : dnf ? (
                <span className={mobileShrink ? "text-[20px] text-red-400" : "text-red-400"}>DNF</span>
              ) : (
                <>
                  <span style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 32 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 80 }}>{(timer/1000).toFixed(3)}</span>
                  <span className={mobileShrink ? "ml-1 align-bottom" : "ml-2 align-bottom"} style={mobileShrink ? { fontFamily: 'font-mono', fontWeight: 400, fontSize: 12, lineHeight: 1 } : { fontFamily: 'font-mono', fontWeight: 400, fontSize: '1em', lineHeight: 1 }}>s</span>
                </>
              )}
          </div>
          {running && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím bất kỳ để dừng</div>}
          {prep && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím Space để bắt đầu</div>}
        </div>
        {/* Webcam đối thủ - cột 3 */}
        <div
          className={mobileShrink ? "flex flex-col items-center webcam-area flex-shrink-0" : "flex flex-col items-center webcam-area flex-shrink-0"}
          style={mobileShrink ? { flex: '0 1 40%', maxWidth: 180, minWidth: 100 } : { flex: '0 1 40%', maxWidth: 420, minWidth: 180 }}
        >
          <div
            className={mobileShrink ? "rounded flex items-center justify-center mb-0.5 relative shadow border border-pink-400" : "rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl border-4 border-pink-400"}
            style={mobileShrink
              ? { width: 160, height: 120, minWidth: 100, minHeight: 80, maxWidth: 180, maxHeight: 140 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
            {/* Video element for remote webcam */}
            <video
              id="opponent-video"
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', position: 'absolute', top: 0, left: 0, zIndex: 2, background: '#111', display: 'none' }}
            />
          </div>
          <span className={mobileShrink ? "font-semibold text-[8px] text-pink-300" : "font-semibold text-lg text-pink-300"}>{opponentName}</span>
        </div>
      </div>

      {/* Mount VideoCall (Daily) sau webcam row để quản lý stream */}
      {(() => {
        // Log roomUrl để debug
        console.log('[RoomPage] Render VideoCall with roomUrl:', roomUrl, '| typeof:', typeof roomUrl, '| length:', roomUrl?.length);
        if (roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0) {
          console.log('[RoomPage] VideoCall sẽ được mount với roomUrl:', roomUrl);
        } else {
          console.warn('[RoomPage] Không mount VideoCall vì roomUrl chưa sẵn sàng:', roomUrl);
        }
        return roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0 ? (
          <VideoCall key={roomUrl} roomUrl={roomUrl} camOn={camOn} micOn={micOn} />
        ) : null;
      })()}
    </div>
  );
}

// Dynamic import cho VideoCall tránh lỗi SSR, không cần generic
const VideoCall = dynamic(() => import('@/components/VideoCall'), { ssr: false });

