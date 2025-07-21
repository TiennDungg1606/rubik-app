
"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { useRouter } from "next/navigation";
// Đảm bảo window.userName luôn có giá trị đúng khi vào phòng
declare global {
  interface Window { userName?: string }
}
import { getSocket } from "@/lib/socket";
import { generateWcaScramble } from "@/lib/wcaScramble";

// Helper for stats (all in ms)
function calcStats(times: (number|null)[]) {
  const valid = times.filter(t => typeof t === 'number' && t > 0) as number[];
  if (valid.length === 0) return { best: null, worst: null, mean3: null, avg5: null, ao5: null };
  const sorted = [...valid].sort((a, b) => a - b);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
// mean3: average of the 3 middle values (if at least 3)
  let mean3 = null;
  if (valid.length >= 3) {
    const m3 = [...valid].sort((a, b) => a - b).slice(1, 4);
    mean3 = m3.reduce((a, b) => a + b, 0) / 3;
  }
// avg5: average of 5 solves, if any DNF then result is DNF
  let avg5 = null;
  if (times.length === 5) {
    if (times.some(t => t === null)) {
      avg5 = null;
    } else {
      avg5 = (times as number[]).reduce((a, b) => a + b, 0) / 5;
    }
  }
// ao5: exclude best and worst, average the remaining 3 values, if any DNF then result is DNF
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
  // Đảm bảo userName luôn đúng khi vào phòng (nếu window.userName chưa có)
  useEffect(() => {
    function cleanupPeer() {
      if (peerRef.current) {
        console.log('[CLEANUP] Destroying peer');
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (opponentVideoRef.current) {
        console.log('[CLEANUP] Clearing opponent video srcObject');
        opponentVideoRef.current.srcObject = null;
      }
    }
    if (typeof window !== 'undefined' && !window.userName) {
      fetch('/api/user/me', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.firstName && data.lastName) {
            window.userName = data.firstName + ' ' + data.lastName;
            // Reload lại trang để lấy đúng userName
            window.location.reload();
          }
        });
    }
  }, []);

  // ...existing code...

  // All variable and hook declarations must be above this line
  // (removed duplicate/old peer connection effect)
  // Lấy camera/mic và gán vào myVideoRef khi vào phòng
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function getMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
        mediaStreamRef.current = stream;
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert('Không truy cập được camera/mic. Vui lòng kiểm tra lại quyền trình duyệt!');
      }
    }
    getMedia();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (myVideoRef.current) myVideoRef.current.srcObject = null;
      mediaStreamRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // Xác định thiết bị mobile (hydration-safe)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent));
    }
  }, []);
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
  // Track previous users length to detect transition from 2 -> 1
  const prevUsersLenRef = useRef<number>(0);
  // Lấy roomId từ URL client-side để tránh lỗi build
  const [roomId, setRoomId] = useState<string>("");
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // URL dạng /room/ROOMID
      const match = window.location.pathname.match(/\/room\/([^/]+)/);
      if (match && match[1]) setRoomId(match[1]);
    }
  }, []);
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
  // const [roomError, setRoomError] = useState<string|null>(null);
  const [turn, setTurn] = useState<'me'|'opponent'>("me");
  const [myResults, setMyResults] = useState<(number|null)[]>([]);
  const [opponentResults, setOpponentResults] = useState<(number|null)[]>([]);

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
  const [dnf, setDnf] = useState(false);
  const [opponentTime, setOpponentTime] = useState<number|null>(null);
// userName luôn phải lấy từ DB, không được rỗng
const [userName, setUserName] = useState<string | null>(null);
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (window.userName) {
      setUserName(window.userName);
    } else {
      fetch('/api/user/me', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user && data.user.firstName && data.user.lastName) {
            const name = data.user.firstName + ' ' + data.user.lastName;
            window.userName = name;
            setUserName(name);
          } else {
            setUserName('Không xác định');
          }
        });
    }
  }
}, []);
  // Kiểm tra nếu là người tạo phòng (tức là vừa tạo phòng mới) (hydration-safe)
  const [isCreator, setIsCreator] = useState(false);
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
  const [opponentName, setOpponentName] = useState('Đối thủ');
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  // Giả lập tên

  // Đã có opponentName bằng useState ở trên


  // always keep timerRef in sync
  useEffect(() => { timerRef.current = timer; }, [timer]);

  // --- WebRTC peer connection effect: only create peer when users.length === 2, always cleanup otherwise ---
  useEffect(() => {
    if (!mediaStreamRef.current || !userName || !roomId) return;
    const socket = getSocket();

    function cleanupPeer() {
      if (peerRef.current) {
        console.log('[CLEANUP] Destroying peer');
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (opponentVideoRef.current) {
        console.log('[CLEANUP] Clearing opponent video srcObject');
        opponentVideoRef.current.srcObject = null;
      }
    }

    function setupPeer(filteredUsers: string[]) {
      if (filteredUsers.length !== 2) {
        console.log('Not enough users for peer connection');
        return;
      }
      if (!mediaStreamRef.current) {
        console.warn('[WebRTC] No local media stream, cannot create peer');
        return;
      }
      const isInitiator = (filteredUsers[1] === userName);
      console.log('setupPeer called', filteredUsers, 'userName:', userName, 'initiator:', isInitiator);
      const peer = new Peer({
        initiator: isInitiator,
        trickle: false,
        stream: mediaStreamRef.current,
        config: {
          iceServers: [
            { url: "stun:global.stun.twilio.com:3478", urls: "stun:global.stun.twilio.com:3478" },
            { url: "turn:global.turn.twilio.com:3478?transport=udp", urls: "turn:global.turn.twilio.com:3478?transport=udp", username: "4b757b5987da950233c0bc0a94ca3fbddfa375bc53e816b0184d958e0f09f49f", credential: "jf58N0MnDLhVKIacvs9xqp7i90LQf6FetFM0rY734fg=" },
            { url: "turn:global.turn.twilio.com:3478?transport=tcp", urls: "turn:global.turn.twilio.com:3478?transport=tcp", username: "4b757b5987da950233c0bc0a94ca3fbddfa375bc53e816b0184d958e0f09f49f", credential: "jf58N0MnDLhVKIacvs9xqp7i90LQf6FetFM0rY734fg=" },
            { url: "turn:global.turn.twilio.com:443?transport=tcp", urls: "turn:global.turn.twilio.com:443?transport=tcp", username: "4b757b5987da950233c0bc0a94ca3fbddfa375bc53e816b0184d958e0f09f49f", credential: "jf58N0MnDLhVKIacvs9xqp7i90LQf6FetFM0rY734fg=" }
          ]
        }
      });
      peerRef.current = peer;
      peer.on('signal', (data: any) => {
        socket.emit('signal', { roomId, userName, signal: data });
      });
      peer.on('connect', () => {
        console.log('Peer connected!');
      });
      peer.on('error', (err: any) => {
        console.error('Peer error:', err);
      });
      peer.on('stream', (stream: MediaStream) => {
        if (opponentVideoRef.current) {
          opponentVideoRef.current.srcObject = stream;
          console.log('[WebRTC] Set remote stream to opponent video');
        }
      });
      peer.on('close', () => {
        if (opponentVideoRef.current) opponentVideoRef.current.srcObject = null;
      });
    }

    // Lắng nghe users thay đổi từ socket
    const handleRoomUsers = (roomUsers: string[]) => {
      const filteredUsers = (roomUsers || []).filter((u: string) => typeof u === 'string' && u);
      setUsers(filteredUsers);
      setWaiting(filteredUsers.length < 2);
      // Xác định tên đối thủ
      const opp = filteredUsers.find((u: string) => u !== userName);
      if (opp) setOpponentName(opp);
      // Only setup peer if exactly 2 users and no peer exists
      if (filteredUsers.length === 2) {
        setupPeer(filteredUsers);
      }
      // Only cleanup peer if going from 2 users to 1 (or 0)
      if (prevUsersLenRef.current === 2 && filteredUsers.length < 2) {
        cleanupPeer();
      }
      prevUsersLenRef.current = filteredUsers.length;
    };
    const handleSignal = ({ userName: from, signal }: { userName: string, signal: any }) => {
      if (from !== userName && peerRef.current) {
        peerRef.current.signal(signal);
      }
    };
    socket.emit('join-room', { roomId, userName });
    socket.on('room-users', handleRoomUsers);
    socket.on('signal', handleSignal);
    // Cleanup khi effect unmount hoặc dependency thay đổi
    return () => {
      cleanupPeer();
      socket.off('room-users', handleRoomUsers);
      socket.off('signal', handleSignal);
    };
    // eslint-disable-next-line
  }, [roomId, userName, mediaStreamRef.current]);



  // Khi bật/tắt cam/mic chỉ enable/disable track, không tạo lại peer/stream
  useEffect(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = camOn;
      });
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = micOn;
      });
    }
  }, [camOn, micOn]);

  // Kết nối socket, join room, lắng nghe users và kết quả đối thủ
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-room", { roomId, userName });
    socket.on("room-users", (roomUsers: string[]) => {
      // Lọc bỏ null/undefined và chỉ giữ string hợp lệ
      const filteredUsers = (roomUsers || []).filter(u => typeof u === 'string' && u);
      setUsers(filteredUsers);
      setWaiting(filteredUsers.length < 2);
      // Xác định tên đối thủ
      const opp = filteredUsers.find(u => u !== userName);
      if (opp) setOpponentName(opp);
    });
    socket.on("opponent-solve", ({ userName: oppName, time }: { userName: string, time: number|null }) => {
      setOpponentResults(r => [...r, time]);
      setTurn('me');
      setScramble(generateWcaScramble());
    });
    return () => {
      socket.off("room-users");
      socket.off("opponent-solve");
    };
  }, [roomId, userName]);

  // Khi là người tạo phòng, luôn đảm bảo chỉ có 1 user và waiting=true ngay sau khi tạo phòng
  useEffect(() => {
    if (isCreator && typeof userName === 'string') {
      setUsers([userName]);
      setWaiting(true);
    }
  }, [isCreator, userName]);

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
              muted={true}
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

