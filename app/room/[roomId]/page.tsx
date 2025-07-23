
"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { useRouter } from "next/navigation";
// Đảm bảo window.userName luôn có giá trị đúng khi vào phòng
declare global {
  interface Window { userName?: string }
}
import { getSocket } from "@/lib/socket";

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
  const valid = times.filter(t => typeof t === 'number' && t > 0) as number[];
  if (valid.length === 0) return { best: null, worst: null, mean3: null, avg5: null, ao5: null };
  const sorted = [...valid].sort((a, b) => a - b);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  // mean3: average of 3 solves (nếu đủ 3, có DNF thì DNF)
  let mean3 = null;
  if (times.length >= 3) {
    const last3 = times.slice(-3);
    if (last3.some(t => t === null)) {
      mean3 = null;
    } else {
      mean3 = (last3 as number[]).reduce((a, b) => a + b, 0) / 3;
    }
  }
  // avg5: average of 5 solves, nếu có DNF thì DNF
  let avg5 = null;
  if (times.length >= 5) {
    const last5 = times.slice(-5);
    if (last5.some(t => t === null)) {
      avg5 = null;
    } else {
      avg5 = (last5 as number[]).reduce((a, b) => a + b, 0) / 5;
    }
  }
  // ao5: loại best và worst trong 5 lần gần nhất, nếu có DNF thì DNF
  let ao5 = null;
  if (times.length >= 5) {
    const last5 = times.slice(-5);
    if (last5.some(t => t === null)) {
      ao5 = null;
    } else {
      const arr = [...(last5 as number[])].sort((a, b) => a - b).slice(1, 4);
      ao5 = arr.reduce((a, b) => a + b, 0) / 3;
    }
  }
  return { best, worst, mean3, avg5, ao5 };
}

export default function RoomPage() {
  // All hooks and refs declared ONCE at the top
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream|null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const peerRef = useRef<any>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [scramble, setScramble] = useState(generateScramble());
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [prep, setPrep] = useState(false);
  const [prepTime, setPrepTime] = useState(15);
  const [canStart, setCanStart] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [waiting, setWaiting] = useState(true);
  // const [roomError, setRoomError] = useState<string|null>(null);
  const [turn, setTurn] = useState<'me'|'opponent'>("opponent");
  const [myResults, setMyResults] = useState<(number|null)[]>([]);
  const [opponentResults, setOpponentResults] = useState<(number|null)[]>([]);
  const [dnf, setDnf] = useState(false);
  const [opponentTime, setOpponentTime] = useState<number|null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [opponentName, setOpponentName] = useState('Đối thủ');
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);

  // --- Effects and logic below ---

  // Hàm rời phòng: cleanup và chuyển hướng về lobby
  function cleanupResources() {
    // Cleanup peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    // Cleanup local stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    // Cleanup video element
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (opponentVideoRef.current) opponentVideoRef.current.srcObject = null;
  }
  function handleLeaveRoom() {
    cleanupResources();
    window.location.href = '/lobby';
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  // Cleanup khi đóng tab hoặc reload
  useEffect(() => {
    function handleBeforeUnload() {
      cleanupResources();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
  useEffect(() => {
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
        mediaStreamRef.current = stream;
        setStreamReady(true); // trigger effect to set video srcObject
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert('Không truy cập được camera/mic. Vui lòng kiểm tra lại quyền trình duyệt!');
      }
    }
    getMedia();
    return () => {};
    // eslint-disable-next-line
  }, []);

  // Đảm bảo luôn gán lại stream cho myVideoRef khi stream đã sẵn sàng hoặc khi cam/mic thay đổi hoặc streamReady thay đổi
  useEffect(() => {
    if (myVideoRef.current && mediaStreamRef.current) {
      myVideoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [streamReady, camOn, micOn]);


  // Xác định thiết bị mobile (hydration-safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent));
    }
  }, []);

  // Xác định xoay dọc màn hình
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

  // --- WebRTC peer connection effect: only create peer when users.length === 2, always cleanup otherwise ---
  useEffect(() => {
    if (!mediaStreamRef.current || !userName || !roomId) return;
    const socket = getSocket();

    function cleanupPeer(shouldDestroy = true) {
      if (shouldDestroy && peerRef.current) {
        console.log('[CLEANUP] Destroying peer');
        peerRef.current.destroy();
        peerRef.current = null;
      }
      // Không clear opponentVideoRef ở đây nữa
    }

    function clearOpponentVideo() {
      if (opponentVideoRef.current) {
        console.log('[CLEANUP] Clearing opponent video srcObject');
        opponentVideoRef.current.srcObject = null;
      }
    }

    function setupPeer(filteredUsers: string[]) {
      // Chỉ destroy peer khi đủ 2 user, còn thiếu user thì giữ nguyên peer
      if (filteredUsers.length !== 2) {
        console.log('Not enough users for peer connection');
        cleanupPeer(false); // Không destroy peer
        return;
      }
      cleanupPeer(true); // Đủ 2 user thì destroy peer cũ trước khi tạo mới
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
        clearOpponentVideo();
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
      setupPeer(filteredUsers);
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
      setScramble(generateScramble());
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
      setTurn('me'); // Chủ phòng luôn được chơi trước
    }
  }, [isCreator, userName]);

  // Khi đủ 2 người, nếu không phải chủ phòng thì phải chờ đối thủ chơi trước
  useEffect(() => {
    if (!isCreator && users.length === 2) {
      setTurn('opponent');
    }
  }, [isCreator, users.length]);

  // Khi vào phòng, tạo scramble mới
  useEffect(() => {
    setScramble(generateScramble());
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
  return (ms/1000).toFixed(3);
}

function formatStat(val: number|null) {
  if (val === null) return '';
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
        <div className="text-2xl font-bold text-red-400 mb-4">Vui lòng xoay ngang màn hình để sử dụng ứng dụng!</div>
        <div className="text-lg text-gray-300">Nếu bạn dùng điện thoại, hãy bật "Trang web cho máy tính" trong trình duyệt để sử dụng đầy đủ chức năng.</div>
      </div>
    );
  }

  return (
    <div
      className={
        isMobile && !isPortrait
          ? "h-screen w-screen flex flex-row items-center justify-center text-white py-4 overflow-x-hidden overflow-y-auto min-h-0 relative"
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
          isMobile && !isPortrait
            ? "absolute top-4 left-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg"
            : "fixed top-4 left-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg"
        }
        type="button"
      >Rời phòng</button>
      {/* Dải chỉ số tổng hợp của cả 2 người ở góc trên trái */}
      {/* Bảng tổng hợp: luôn cố định trên desktop, còn mobile landscape thì đặt absolute đầu trang */}
      <div className={
        isMobile && !isPortrait
          ? "absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white p-0 m-0 rounded-xl"
          : "fixed top-35 left-28 z-50 bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white p-0 m-0 rounded-xl"
      }>
        <table className="text-center bg-gray-900 rounded-xl overflow-hidden text-sm shadow-lg border-collapse" style={{ border: '1px solid #374151', margin: 0 }}>
          <thead className="bg-gray-800">
            <tr>
              <th className="px-3 py-1 border border-gray-700 font-bold">Tên</th>
              <th className="px-3 py-1 border border-gray-700 font-bold">Best</th>
              <th className="px-3 py-1 border border-gray-700 font-bold">Worst</th>
              <th className="px-3 py-1 border border-gray-700 font-bold">Mean3</th>
              <th className="px-3 py-1 border border-gray-700 font-bold">Avg5</th>
              <th className="px-3 py-1 border border-gray-700 font-bold">Ao5</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-1 border border-gray-700 font-bold" style={{ color: '#60a5fa' }}>{userName}</td>
              <td className="px-3 py-1 border border-gray-700 text-green-300">{myStats.best !== null ? formatTime(myStats.best) : ""}</td>
              <td className="px-3 py-1 border border-gray-700 text-red-300">{myStats.worst !== null ? formatTime(myStats.worst) : ""}</td>
              <td className="px-3 py-1 border border-gray-700">{myStats.mean3 !== null ? formatStat(myStats.mean3) : ""}</td>
              <td className="px-3 py-1 border border-gray-700">{myStats.avg5 !== null ? formatStat(myStats.avg5) : ""}</td>
              <td className="px-3 py-1 border border-gray-700">{myStats.ao5 !== null ? formatStat(myStats.ao5) : ""}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 border border-gray-700 font-bold" style={{ color: '#f472b6' }}>{opponentName}</td>
              <td className="px-3 py-1 border border-gray-700 text-green-300">{oppStats.best !== null ? formatTime(oppStats.best) : ""}</td>
              <td className="px-3 py-1 border border-gray-700 text-red-300">{oppStats.worst !== null ? formatTime(oppStats.worst) : ""}</td>
              <td className="px-3 py-1 border border-gray-700">{oppStats.mean3 !== null ? formatStat(oppStats.mean3) : ""}</td>
              <td className="px-3 py-1 border border-gray-700">{oppStats.avg5 !== null ? formatStat(oppStats.avg5) : ""}</td>
              <td className="px-3 py-1 border border-gray-700">{oppStats.ao5 !== null ? formatStat(oppStats.ao5) : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Bảng kết quả ở góc phải trên */}
      <div
        className="absolute top-28 right-25 z-40 w-[340px] max-w-xs"
        style={{ minWidth: 260 }}
      >
        <table className="w-full text-center bg-gray-900 rounded-xl overflow-hidden text-sm shadow-lg">
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
      {/* Tên phòng */}
      <h2 className="text-3xl font-bold mb-2">Phòng: <span className="text-blue-400">{roomId}</span></h2>
      {/* Scramble */}
      <div className="mb-5 px-2 py-1 bg-gray-800 rounded-xl text-2xl font-mono font-bold tracking-widest select-all">
        {scramble}
      </div>
      {/* Thanh trạng thái */}
      <div className="mb-2">
        {waiting ? (
          <span className="text-yellow-400 text-2xl font-semibold">Đang chờ đối thủ vào phòng...</span>
        ) : (
          <span className="text-green-400 text-2xl font-semibold">Đã đủ 2 người, sẵn sàng thi đấu!</span>
        )}
      </div>
      {/* Thông báo trạng thái lượt giải */}
      <div className="mb-3">
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
              return <span className="text-base font-semibold text-yellow-400">Trận đấu kết thúc, hòa</span>;
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
            return <span className="text-base font-semibold text-green-400">Trận đấu kết thúc, {winner} thắng</span>;
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
            return <span className="text-xl font-semibold text-green-300">{msg}</span>;
        })()}
      </div>
      {/* Đã xóa Timer phía trên, chỉ giữ lại Timer nằm ngang giữa hai webcam */}
      {/* Webcam + Timer ngang hàng */}
      {/* Webcam + Timer ngang hàng, mobile landscape: chia đều chiều ngang, không tràn, có padding */}
      <div
        className={
          isMobile && !isPortrait
            ? "flex flex-row w-full justify-center items-center gap-2 px-1 box-border"
            : "w-full mb-0 max-w-5xl flex flex-row gap-20 justify-center items-center mt-38 relative"
        }
        style={isMobile && !isPortrait ? { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' } : { maxWidth: '100vw' }}
      >
        {/* Thông báo lỗi camera */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 z-30" style={{ top: '-2.5rem', width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
          <span className="text-yellow-300 text-lg font-semibold">
            Nếu camera của bạn không hoạt động, vui lòng nhấn nút tắt camera rồi bật lại
          </span>
        </div>
        {/* Webcam của bạn */}
        <div
          className="flex flex-col items-center webcam-area flex-shrink-0"
          style={isMobile && !isPortrait
            ? { width: '32vw', minWidth: 0, maxWidth: 420 }
            : isMobile ? { width: '100vw', maxWidth: 420 } : {}}
        >
          <div
            className="bg-gray-900 rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl"
            style={isMobile && !isPortrait
              ? { width: '30vw', height: '22vw', minWidth: 0, minHeight: 0, maxWidth: 420, maxHeight: 240 }
              : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
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
        {/* Timer ở giữa */}
        <div className={isMobile && !isPortrait ? "flex flex-col items-center justify-center" : "flex flex-col items-center justify-center"} style={isMobile && !isPortrait ? { width: '24vw', minHeight: 0, minWidth: 120, maxWidth: 240 } : {}}>
          <div
            className="text-7xl font-[\'Digital-7\'] font-bold text-yellow-300 drop-shadow-lg select-none cursor-pointer px-4 py-2 rounded-lg"
            style={{ fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: '100px', textAlign: 'center' }}
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
              <>
                <span style={{ fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace" }}>{(timer/1000).toFixed(3)}</span>
                <span className="ml-1 align-bottom" style={{ fontFamily: 'font-mono', fontWeight: 400, fontSize: '0.7em', lineHeight: 1 }}>s</span>
              </>
            )}
          </div>
          {running && <div className="text-sm text-gray-400 mt-1">Chạm hoặc bấm phím bất kỳ để dừng</div>}
          {prep && <div className="text-sm text-gray-400 mt-1">Chạm hoặc bấm phím Space để bắt đầu</div>}
        </div>
        {/* Webcam đối thủ */}
        <div
          className="flex flex-col items-center webcam-area flex-shrink-0"
          style={isMobile && !isPortrait
            ? { width: '32vw', minWidth: 0, maxWidth: 420 }
            : isMobile ? { width: '100vw', maxWidth: 420 } : {}}
        >
          <div
            className="bg-gray-900 rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl"
            style={isMobile && !isPortrait
              ? { width: '30vw', height: '22vw', minWidth: 0, minHeight: 0, maxWidth: 420, maxHeight: 240 }
              : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
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
    </div>
  );
}

