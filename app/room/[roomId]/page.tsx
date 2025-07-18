
"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { generateWcaScramble } from "@/lib/wcaScramble";


// Helper for stats (all in ms)
function calcStats(times: (number|null)[]) {
  const valid = times.filter(t => typeof t === 'number' && t > 0) as number[];
  if (valid.length === 0) return { best: null, worst: null, mean3: null, avg5: null, ao5: null };
  const sorted = [...valid].sort((a, b) => a - b);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  // mean3: trung bình 3 giá trị giữa (nếu đủ 3)
  let mean3 = null;
  if (valid.length >= 3) {
    const m3 = [...valid].sort((a, b) => a - b).slice(1, 4);
    mean3 = m3.reduce((a, b) => a + b, 0) / 3;
  }
  // avg5: trung bình 5 lần, nếu có DNF thì là DNF
  let avg5 = null;
  if (times.length === 5) {
    if (times.some(t => t === null)) {
      avg5 = null;
    } else {
      avg5 = (times as number[]).reduce((a, b) => a + b, 0) / 5;
    }
  }
  // ao5: loại best, worst, trung bình 3 giá trị còn lại, nếu có DNF thì là DNF
  let ao5 = null;
  if (times.length === 5) {
    if (times.some(t => t === null)) {
      ao5 = null;
    } else {
      const arr = [...(times as number[])].sort((a, b) => a - b).slice(1, 4);
      ao5 = arr.reduce((a, b) => a + b, 0) / 3;
    }
  }
  return { best, worst, mean3, avg5, ao5 };
}

export default function RoomPage() {
  // Xác định thiết bị mobile
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  // Xác định xoay dọc màn hình
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    function checkOrientation() {
      if (window.innerHeight > window.innerWidth) setIsPortrait(true);
      else setIsPortrait(false);
    }
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);
  const router = useRouter();
  // Webcam/mic state
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream|null>(null);
  const peerRef = useRef<any>(null);
  // Fix: useParams returns Record<string, string | string[]>, so extract roomId as string
  const params = useParams() || {};
  const roomIdRaw = (params as Record<string, string | string[]>).roomId;
  const roomId = Array.isArray(roomIdRaw) ? roomIdRaw[0] : roomIdRaw || "";
  const [scramble, setScramble] = useState(generateWcaScramble());
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(0); // always latest timer value
  const [running, setRunning] = useState(false);
  const [prep, setPrep] = useState(false);
  const [prepTime, setPrepTime] = useState(15);
  const [canStart, setCanStart] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [users, setUsers] = useState<string[]>([]); // users trong phòng
  const [waiting, setWaiting] = useState(true); // true nếu <2 người
  const [roomError, setRoomError] = useState<string|null>(null);
  const [turn, setTurn] = useState<'me'|'opponent'>("me");
  const [myResults, setMyResults] = useState<(number|null)[]>([]);
  const [opponentResults, setOpponentResults] = useState<(number|null)[]>([]);

  // Luôn khôi phục kết quả từ localStorage khi roomId thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`myResults_${roomId}`);
      setMyResults(saved ? JSON.parse(saved) : []);
      const savedOpp = localStorage.getItem(`opponentResults_${roomId}`);
      setOpponentResults(savedOpp ? JSON.parse(savedOpp) : []);
    }
  }, [roomId]);
  const [dnf, setDnf] = useState(false);
  const [opponentTime, setOpponentTime] = useState<number|null>(null);
  // userName lấy từ localStorage hoặc prompt
  const [userName] = useState(() => {
    if (typeof window !== 'undefined') {
      let n = localStorage.getItem('userName');
      if (!n) {
        n = prompt('Nhập tên của bạn:') || 'Bạn';
        localStorage.setItem('userName', n);
      }
      return n;
    }
    return 'Bạn';
  });
  const [opponentName, setOpponentName] = useState('Đối thủ');
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  // Giả lập tên
  const myName = "Bạn";
  // Đã có opponentName bằng useState ở trên

  // always keep timerRef in sync
  useEffect(() => { timerRef.current = timer; }, [timer]);

  // Webcam/mic: lấy stream local và truyền peer-to-peer
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let socket: any;
    let peer: any;
    if (!camOn && myVideoRef.current) {
      myVideoRef.current.srcObject = null;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      return;
    }
    if (camOn && navigator.mediaDevices && myVideoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: micOn })
        .then(stream => {
          myVideoRef.current!.srcObject = stream;
          mediaStreamRef.current = stream;
          socket = getSocket();
          // Đăng ký signaling
          socket.emit("ready-for-peer", { roomId, userName });
          // Khi có người khác ready, chủ động tạo peer (người vào sau)
          socket.on("ready-for-peer", ({ userName: otherName }: { userName: string }) => {
            if (otherName !== userName && !peerRef.current) {
              peerRef.current = new Peer({ initiator: true, trickle: false, stream });
              peerRef.current.on("signal", (signal: any) => {
                socket.emit("peer-signal", { roomId, signal, from: userName });
              });
              peerRef.current.on("stream", (remoteStream: MediaStream) => {
                if (opponentVideoRef.current) opponentVideoRef.current.srcObject = remoteStream;
              });
            }
          });
          // Khi nhận được peer-initiate, tạo peer (người vào trước)
          socket.on("peer-initiate", ({ from }: { from: string }) => {
            if (from !== userName && !peerRef.current) {
              peerRef.current = new Peer({ initiator: false, trickle: false, stream });
              peerRef.current.on("signal", (signal: any) => {
                socket.emit("peer-signal", { roomId, signal, from: userName });
              });
              peerRef.current.on("stream", (remoteStream: MediaStream) => {
                if (opponentVideoRef.current) opponentVideoRef.current.srcObject = remoteStream;
              });
            }
          });
          // Khi nhận được peer-signal, chuyển tiếp cho peer
          socket.on("peer-signal", ({ signal, from }: { signal: any, from: string }) => {
            if (from !== userName && peerRef.current) {
              peerRef.current.signal(signal);
            }
          });
          // Khi ready, nếu đã có 2 người thì gửi peer-initiate cho người còn lại
          socket.on("room-users", (roomUsers: string[]) => {
            if (roomUsers.length === 2 && !peerRef.current) {
              const otherName = roomUsers.find(u => u !== userName);
              if (otherName) {
                socket.emit("peer-initiate", { roomId, from: userName });
              }
            }
          });
          cleanup = () => {
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach(track => track.stop());
              mediaStreamRef.current = null;
            }
            if (peerRef.current) {
              peerRef.current.destroy();
              peerRef.current = null;
            }
            if (socket) {
              socket.off("peer-signal");
              socket.off("peer-initiate");
              socket.off("ready-for-peer");
              socket.off("room-users");
            }
          };
        })
        .catch(() => {});
    }
    return () => { if (cleanup) cleanup(); };
  }, [camOn, micOn, waiting]);

  // Kết nối socket, join room, lắng nghe users và kết quả đối thủ
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-room", { roomId, userName });
    let checked = false;
    const timeout = setTimeout(() => {
      if (!checked && users.length === 0) {
        setRoomError("Mã phòng không tồn tại hoặc đã bị xóa!");
      }
    }, 2000);
    socket.on("room-users", (roomUsers: string[]) => {
      checked = true;
      setUsers(roomUsers);
      setWaiting(roomUsers.length < 2);
      // Xác định tên đối thủ
      const opp = roomUsers.find(u => u !== userName);
      if (opp) setOpponentName(opp);
      if (roomUsers.length === 0) {
        setRoomError("Mã phòng không tồn tại hoặc đã bị xóa!");
      } else {
        setRoomError(null);
      }
    });
    socket.on("opponent-solve", ({ userName: oppName, time }: { userName: string, time: number|null }) => {
      setOpponentResults(r => [...r, time]);
      setTurn('me');
      setScramble(generateWcaScramble());
    });
    return () => {
      clearTimeout(timeout);
      socket.off("room-users");
      socket.off("opponent-solve");
    };
  }, [roomId, userName]);

  // Khi vào phòng, tạo scramble chuẩn WCA
  useEffect(() => {
    setScramble(generateWcaScramble());
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, []);

  // Timer logic: desktop chỉ phím Space mới vào chuẩn bị, nhấn giữ/thả Space để bắt đầu, khi timer đang chạy nhấn phím bất kỳ để dừng, chuột click không có tác dụng
  useEffect(() => {
    if (isMobile) return;
    if (waiting || running || prep || turn !== 'me' || myResults.length >= 5) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (waiting || running || prep || turn !== 'me' || myResults.length >= 5) return;
      if (e.code === "Space") {
        setPrep(true);
        setPrepTime(15);
        setDnf(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { once: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobile, waiting, running, prep, turn, myResults.length]);

  // Desktop: Khi đang chuẩn bị, nhấn giữ/thả Space để bắt đầu
  useEffect(() => {
    if (isMobile) return;
    if (!prep || waiting) return;
    let spaceDown = false;
    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceDown) {
        spaceDown = true;
      }
    };
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && spaceDown) {
        spaceDown = false;
        setPrep(false);
        setCanStart(true);
      }
    };
    window.addEventListener("keydown", handleSpaceDown);
    window.addEventListener("keyup", handleSpaceUp);
    return () => {
      window.removeEventListener("keydown", handleSpaceDown);
      window.removeEventListener("keyup", handleSpaceUp);
    };
  }, [isMobile, prep, waiting]);

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
          setDnf(true); // DNF nếu hết giờ chuẩn bị
          // Lưu kết quả DNF
          setMyResults(r => [...r, null]);
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

  // Mobile: chạm 1 lần để chuẩn bị, nhấn giữ/thả để bắt đầu
  useEffect(() => {
    if (!isMobile) return;
    if (waiting || running || prep || turn !== 'me' || myResults.length >= 5) return;
    let prepStarted = false;
    const handleTouchStart = (e: TouchEvent) => {
      // Nếu chạm vào webcam thì bỏ qua
      const webcamEls = document.querySelectorAll('.webcam-area');
      for (let i = 0; i < webcamEls.length; i++) {
        if (webcamEls[i].contains(e.target as Node)) return;
      }
      if (waiting || running || prep || turn !== 'me' || myResults.length >= 5) return;
      prepStarted = true;
      setPrep(true);
      setPrepTime(15);
      setDnf(false);
    };
    window.addEventListener('touchstart', handleTouchStart, { once: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isMobile, waiting, running, prep, turn, myResults.length]);

  // Mobile: Khi đang chuẩn bị, nhấn giữ/thả để bắt đầu
  useEffect(() => {
    if (!isMobile) return;
    if (!prep || waiting) return;
    let touchActive = false;
    const handleTouchHold = (e: TouchEvent) => {
      // Nếu chạm vào webcam thì bỏ qua
      const webcamEls = document.querySelectorAll('.webcam-area');
      for (let i = 0; i < webcamEls.length; i++) {
        if (webcamEls[i].contains(e.target as Node)) return;
      }
      touchActive = true;
    };
    const handleTouchRelease = (e: TouchEvent) => {
      if (!touchActive) return;
      touchActive = false;
      setPrep(false);
      setCanStart(true);
    };
    window.addEventListener('touchstart', handleTouchHold);
    window.addEventListener('touchend', handleTouchRelease);
    return () => {
      window.removeEventListener('touchstart', handleTouchHold);
      window.removeEventListener('touchend', handleTouchRelease);
    };
  }, [isMobile, prep, waiting]);

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
    const stopTimer = () => {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setMyResults(r => {
        const newR = [...r, timerRef.current];
        const socket = getSocket();
        socket.emit("solve", { roomId, userName, time: timerRef.current });
        return newR;
      });
      setCanStart(false);
      setTurn('opponent');
    };
    const handleAnyKey = (e: KeyboardEvent) => {
      if (waiting) return;
      // Chỉ nhận phím, không nhận chuột
      if (e.type === 'keydown') {
        stopTimer();
      }
    };
    const handleMouse = (e: MouseEvent) => {
      // Không làm gì cả, chặn click
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const handleTouch = (e: TouchEvent) => {
      if (!isMobile) return;
      // Nếu chạm vào webcam thì bỏ qua
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
    if (myResults.length + opponentResults.length === 0) return;
    if (myResults.length > 0 && myResults.length > opponentResults.length) return; // chờ đối thủ
    setPrep(false);
    setCanStart(false);
    setSpaceHeld(false);
    setTimer(0);
    setDnf(false);
  }, [myResults, opponentResults]);

  // Tính toán thống kê
  const myStats = calcStats(myResults);
  const oppStats = calcStats(opponentResults);

  function formatTime(ms: number|null) {
    if (ms === null) return 'DNF';
    // round to 3 decimals
    const sec = Math.floor(ms / 1000);
    const msR = Math.round(ms % 1000);
    return `${sec}.${msR.toString().padStart(3, "0")}`;
  }

  function formatStat(val: number|null) {
    if (val === null) return '';
    // round to 3 decimals
    const v = Math.round(val);
    const sec = Math.floor(v / 1000);
    const msR = Math.abs(v % 1000);
    return `${sec}.${msR.toString().padStart(3, "0")}`;
  }

  if (roomError) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4">{roomError}</div>
        <button className="mt-4 px-6 py-2 bg-blue-600 rounded-lg text-white font-semibold" onClick={() => router.push("/lobby")}>Quay lại</button>
      </div>
    );
  }
  if (isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4">Vui lòng xoay ngang màn hình để sử dụng ứng dụng!</div>
        <div className="text-lg text-gray-300">Ứng dụng sẽ tự động tiếp tục khi bạn xoay ngang.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-black text-white py-4 overflow-y-auto">
      {/* Tên phòng */}
      <h2 className="text-3xl font-bold mb-2">Phòng: <span className="text-blue-400">{roomId}</span></h2>
      {/* Scramble */}
      <div className="mb-2 px-4 py-2 bg-gray-800 rounded-xl text-lg font-mono tracking-widest select-all">
        {scramble}
      </div>
      {/* Thanh trạng thái */}
      <div className="mb-2">
        {waiting ? (
          <span className="text-yellow-400 text-lg font-semibold">Đang chờ đối thủ vào phòng...</span>
        ) : (
          <span className="text-green-400 text-lg font-semibold">Đã đủ 2 người, sẵn sàng thi đấu!</span>
        )}
      </div>
      {/* Timer Display - mobile: thao tác toàn màn hình, desktop: chỉ vùng timer */}
      {isMobile ? (
        <div
          className="fixed inset-0 z-30"
          style={{ pointerEvents: 'auto' }}
          onTouchStart={e => {
            // Nếu chạm vào webcam thì bỏ qua
            const webcamEls = document.querySelectorAll('.webcam-area');
            for (let i = 0; i < webcamEls.length; i++) {
              if (webcamEls[i].contains(e.target as Node)) return;
            }
            if (waiting || myResults.length >= 5) return;
            if (!prep && !running && turn === 'me') {
              setPrep(true);
              setPrepTime(15);
              setDnf(false);
            } else if (prep && !running) {
              setPrep(false);
              setCanStart(true);
            } else if (running) {
              setRunning(false);
              if (intervalRef.current) clearInterval(intervalRef.current);
              setMyResults(r => {
                const newR = [...r, timerRef.current];
                const socket = getSocket();
                socket.emit("solve", { roomId, userName, time: timerRef.current });
                return newR;
              });
              setCanStart(false);
              setTurn('opponent');
            }
          }}
        >
          <div className="mb-4 flex flex-col items-center pt-8">
            <div className="text-6xl font-mono font-bold text-yellow-300 drop-shadow-lg select-none cursor-pointer px-4 py-2 rounded-lg">
              {prep ? (
                <span>Chuẩn bị: {prepTime}s</span>
              ) : dnf ? (
                <span className="text-red-400">DNF</span>
              ) : (
                <span>{(timer/1000).toFixed(2)}s</span>
              )}
            </div>
            {running && <div className="text-sm text-gray-400 mt-1">Chạm hoặc nhấn giữ/thả bất kỳ đâu (trừ webcam) để dừng</div>}
            {prep && <div className="text-sm text-gray-400 mt-1">Chạm hoặc nhấn giữ/thả bất kỳ đâu (trừ webcam) để bắt đầu</div>}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-col items-center">
          <div
            className="text-6xl font-mono font-bold text-yellow-300 drop-shadow-lg select-none cursor-pointer px-4 py-2 rounded-lg"
            onClick={() => {
              if (waiting || myResults.length >= 5) return;
              if (!prep && !running && turn === 'me') {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
              } else if (prep && !running) {
                setPrep(false);
                setCanStart(true);
              } else if (running) {
                setRunning(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                setMyResults(r => {
                  const newR = [...r, timerRef.current];
                  const socket = getSocket();
                  socket.emit("solve", { roomId, userName, time: timerRef.current });
                  return newR;
                });
                setCanStart(false);
                setTurn('opponent');
              }
            }}
          >
            {prep ? (
              <span>Chuẩn bị: {prepTime}s</span>
            ) : dnf ? (
              <span className="text-red-400">DNF</span>
            ) : (
              <span>{(timer/1000).toFixed(2)}s</span>
            )}
          </div>
          {running && <div className="text-sm text-gray-400 mt-1">Chạm hoặc bấm phím bất kỳ để dừng</div>}
          {prep && <div className="text-sm text-gray-400 mt-1">Chạm hoặc bấm phím Space để bắt đầu</div>}
        </div>
      )}

      {/* Webcam + mic (responsive for mobile) */}
      <div
        className={`w-full mb-4 max-w-5xl flex ${isMobile ? 'flex-col gap-4 items-center' : 'flex-row gap-8 justify-center'}`}
        style={isMobile ? { maxWidth: '100vw' } : {}}
      >
        <div className="flex flex-col items-center webcam-area" style={isMobile ? { width: '100vw', maxWidth: 420 } : {}}>
          <div
            className="bg-gray-900 rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl"
            style={isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
            {/* Webcam của bạn */}
            <video
              ref={myVideoRef}
              autoPlay
              muted={micOn ? false : true}
              className="w-full h-full object-cover rounded-2xl bg-black border-4 border-blue-400"
              style={isMobile ? { maxHeight: 240, minHeight: 120 } : {}}
            />
            <button
              className={`absolute bottom-3 left-3 px-3 py-1 rounded text-base ${camOn ? 'bg-gray-700' : 'bg-red-600'}`}
              onClick={() => setCamOn(v => !v)}
              type="button"
            >{camOn ? 'Tắt camera' : 'Bật camera'}</button>
            <button
              className={`absolute bottom-3 right-3 px-3 py-1 rounded text-base ${micOn ? 'bg-gray-700' : 'bg-red-600'}`}
              onClick={() => setMicOn(v => !v)}
              type="button"
            >{micOn ? 'Tắt mic' : 'Bật mic'}</button>
          </div>
          <span className="font-semibold text-lg text-blue-300">{userName}</span>
        </div>
        <div className="flex flex-col items-center webcam-area" style={isMobile ? { width: '100vw', maxWidth: 420 } : {}}>
          <div
            className="bg-gray-900 rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl"
            style={isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
            {/* Webcam đối thủ */}
            <video
              ref={opponentVideoRef}
              autoPlay
              className="w-full h-full object-cover rounded-2xl bg-black border-4 border-pink-400"
              style={isMobile ? { maxHeight: 240, minHeight: 120 } : {}}
            />
          </div>
          <span className="font-semibold text-lg text-pink-300">{opponentName}</span>
        </div>
      </div>
      {/* Bảng kết quả nhỏ hơn */}
      <div className="w-full max-w-xl overflow-x-auto">
        <table className="w-full text-center bg-gray-900 rounded-xl overflow-hidden text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="py-2">STT</th>
              <th className="py-2">{userName}</th>
              <th className="py-2">{opponentName}</th>
            </tr>
          </thead>
          <tbody>
            {[0,1,2,3,4].map(i => (
              <tr key={i} className="border-b border-gray-700">
                <td className="py-1">{i+1}</td>
                <td className="py-1">{myResults[i] === null ? 'DNF' : (myResults[i] ? (myResults[i]/1000).toFixed(2) : "")}</td>
                <td className="py-1">{opponentResults[i] === null ? 'DNF' : (opponentResults[i] ? (opponentResults[i]/1000).toFixed(2) : "")}</td>
              </tr>
            ))}
            <tr className="bg-gray-800 font-bold">
              <td>Best</td>
              <td>{myStats.best !== null ? (myStats.best/1000).toFixed(2) : ""}</td>
              <td>{oppStats.best !== null ? (oppStats.best/1000).toFixed(2) : ""}</td>
            </tr>
            <tr className="bg-gray-800 font-bold">
              <td>Worst</td>
              <td>{myStats.worst !== null ? (myStats.worst/1000).toFixed(2) : ""}</td>
              <td>{oppStats.worst !== null ? (oppStats.worst/1000).toFixed(2) : ""}</td>
            </tr>
            <tr className="bg-gray-800 font-bold">
              <td>Mean 3</td>
              <td>{myStats.mean3 !== null ? (myStats.mean3/1000).toFixed(2) : ""}</td>
              <td>{oppStats.mean3 !== null ? (oppStats.mean3/1000).toFixed(2) : ""}</td>
            </tr>
            <tr className="bg-gray-800 font-bold">
              <td>Avg 5</td>
              <td>{myStats.avg5 !== null ? (myStats.avg5/1000).toFixed(2) : ""}</td>
              <td>{oppStats.avg5 !== null ? (oppStats.avg5/1000).toFixed(2) : ""}</td>
            </tr>
            <tr className="bg-gray-800 font-bold">
              <td>Ao5</td>
              <td>{myStats.ao5 !== null ? (myStats.ao5/1000).toFixed(2) : ""}</td>
              <td>{oppStats.ao5 !== null ? (oppStats.ao5/1000).toFixed(2) : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
