
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
  let mean3 = null;
  if (times.length >= 3) {
    const last3 = times.slice(-3);
    if (last3.some(t => t === null)) {
      mean3 = null;
    } else {
      mean3 = (last3 as number[]).reduce((a, b) => a + b, 0) / 3;
    }
  }
  let avg5 = null;
  if (times.length >= 5) {
    const last5 = times.slice(-5);
    if (last5.some(t => t === null)) {
      avg5 = null;
    } else {
      avg5 = (last5 as number[]).reduce((a, b) => a + b, 0) / 5;
    }
  }
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
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [micOn, setMicOn] = useState<boolean>(true);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream|null>(null);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const peerRef = useRef<any>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [scramble, setScramble] = useState<string>(generateScramble());
  const [timer, setTimer] = useState<number>(0);
  const timerRef = useRef<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [prep, setPrep] = useState<boolean>(false);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [canStart, setCanStart] = useState<boolean>(false);
  const [spaceHeld, setSpaceHeld] = useState<boolean>(false);
  const [users, setUsers] = useState<string[]>([]);
  const [waiting, setWaiting] = useState<boolean>(true);
  const [turn, setTurn] = useState<'me'|'opponent'>('opponent');
  const [myResults, setMyResults] = useState<(number|null)[]>([]);
  const [opponentResults, setOpponentResults] = useState<(number|null)[]>([]);
  const [dnf, setDnf] = useState<boolean>(false);
  // Thêm state cho xác nhận kết quả
  const [pendingResult, setPendingResult] = useState<number|null>(null);
  const [pendingType, setPendingType] = useState<'normal'|'+2'|'dnf'>('normal');
  const [opponentTime, setOpponentTime] = useState<number|null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isCreator, setIsCreator] = useState<boolean>(false);

  const [opponentName, setOpponentName] = useState<string>('Đối thủ');
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);


  // ...giữ nguyên toàn bộ logic và return JSX phía sau...

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
    }, 1300);
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

  // Đảm bảo luôn gán lại stream cho myVideoRef khi stream đã sẵn sàng hoặc khi cam/mic thay đổi hoặc streamReady hoặc mediaStreamRef.current thay đổi
  useEffect(() => {
    let retryInterval: NodeJS.Timeout | null = null;
    function assignStream() {
      if (myVideoRef.current && mediaStreamRef.current) {
        if (myVideoRef.current.srcObject !== mediaStreamRef.current) {
          myVideoRef.current.srcObject = mediaStreamRef.current;
        }
        // Nếu video đã có stream, clear interval
        if (myVideoRef.current.readyState >= 2) {
          if (retryInterval) clearInterval(retryInterval);
        }
      }
    }
    assignStream();
    // Fallback: liên tục thử gán lại stream nếu video chưa hiện
    retryInterval = setInterval(() => {
      assignStream();
    }, 500);
    return () => {
      if (retryInterval) clearInterval(retryInterval);
    };
  }, [streamReady, camOn, micOn, mediaStreamRef.current]);



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
        <div className="text-lg text-gray-300">Nếu bạn dùng điện thoại, hãy bật \"Trang web cho máy tính\" trong trình duyệt để sử dụng đầy đủ chức năng.</div>
      </div>
    );
  }

  // Helper: compact style for mobile landscape only
  const mobileShrink = isMobileLandscape;
  return (
    <div
      className={
        mobileShrink
          ? "h-screen w-screen flex flex-row items-center justify-center text-white py-1 overflow-x-hidden overflow-y-auto min-h-0 relative"
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
      {/* Khối trên cùng: Tên phòng và scramble */}
      <div className="w-full flex flex-col items-center justify-center mb-0.5">
        <h2 className={mobileShrink ? "text-[10px] font-bold mb-0.5" : "text-3xl font-bold mb-2"}>
          Phòng: <span className="text-blue-400">{roomId}</span>
        </h2>
        <div className={mobileShrink ? "mb-0.5 px-0.5 py-0.5 bg-gray-800 rounded text-[9px] font-mono font-bold tracking-widest select-all max-w-[100px] overflow-hidden text-ellipsis" : "mb-2 px-2 py-1 bg-gray-800 rounded-xl text-2xl font-mono font-bold tracking-widest select-all"}
          style={mobileShrink ? { fontSize: 9, minWidth: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' } : {}}>
          {scramble}
        </div>
      </div>
      {/* Hàng ngang 3 khối: bảng tổng hợp | trạng thái + thông báo | bảng kết quả */}
      <div
        className={
          mobileShrink
            ? "w-full flex flex-row flex-nowrap justify-between items-start gap-0.5 px-0 mb-0.5 overflow-x-auto"
            : isMobileLandscape
              ? "w-full flex flex-row flex-wrap justify-between items-start gap-2 px-1 mb-4 overflow-x-auto"
              : "w-full flex flex-row justify-between items-start gap-4 mb-6"
        }
        style={mobileShrink ? { maxWidth: '100vw', rowGap: 1 } : isMobileLandscape ? { maxWidth: '100vw', rowGap: 8 } : {}}
      >
        {/* Bảng tổng hợp bên trái */}
        <div
          className={
            mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-0 m-0 min-w-[55px] max-w-[65px] w-[60px] flex-shrink-0 ml-0 mb-0.5"
              : isMobileLandscape
                ? "bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white rounded-xl p-0 m-0 min-w-[120px] max-w-[180px] w-[160px] flex-shrink-0 ml-0 mb-2"
                : "bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white rounded-xl p-0 m-0 min-w-[220px] max-w-[260px] w-[240px] flex-shrink-0 ml-4"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 8 } : isMobileLandscape ? { wordBreak: 'break-word' } : {}}
        >
          <table className={mobileShrink ? "text-center bg-gray-900 rounded overflow-hidden text-[8px] shadow border-collapse w-full" : "text-center bg-gray-900 rounded-xl overflow-hidden text-sm shadow-lg border-collapse w-full"} style={mobileShrink ? { border: '1px solid #374151', margin: 0 } : { border: '1px solid #374151', margin: 0 }}>
            <thead className="bg-gray-800">
              <tr>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Tên</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Best</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Worst</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Mean3</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Avg5</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Ao5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#60a5fa' }}>{userName}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-green-300">{myStats.best !== null ? formatTime(myStats.best) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-red-300">{myStats.worst !== null ? formatTime(myStats.worst) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.mean3 !== null ? formatStat(myStats.mean3) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.avg5 !== null ? formatStat(myStats.avg5) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.ao5 !== null ? formatStat(myStats.ao5) : ""}</td>
              </tr>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#f472b6' }}>{opponentName}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-green-300">{oppStats.best !== null ? formatTime(oppStats.best) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-red-300">{oppStats.worst !== null ? formatTime(oppStats.worst) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.mean3 !== null ? formatStat(oppStats.mean3) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.avg5 !== null ? formatStat(oppStats.avg5) : ""}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.ao5 !== null ? formatStat(oppStats.ao5) : ""}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Khối giữa: trạng thái + thông báo */}
        <div
          className={
            mobileShrink
              ? "flex flex-col items-center justify-center min-w-[60px] max-w-[80px] mx-auto mb-0.5 w-auto"
              : isMobileLandscape
                ? "flex flex-col items-center justify-center min-w-[120px] max-w-[180px] mx-auto mb-2 w-auto"
                : "flex flex-col items-center justify-center min-w-[260px] max-w-[520px] mx-auto w-auto"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 8 } : isMobileLandscape ? { wordBreak: 'break-word' } : {}}
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
              return <span className={mobileShrink ? "text-[10px] font-semibold text-green-300" : "text-xl font-semibold text-green-300"}>{msg}</span>;
            })()}
            {/* Đã xóa thông báo lỗi camera theo yêu cầu */}
          </div>
        </div>
        {/* Bảng kết quả bên phải */}
        <div
          className={
            mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-0 m-0 min-w-[55px] max-w-[65px] w-[60px] flex-shrink-0 mr-0 mb-0.5"
              : isMobileLandscape
                ? "bg-gray-900 bg-opacity-90 shadow-lg rounded-xl p-0 m-0 min-w-[120px] max-w-[180px] w-[160px] flex-shrink-0 mr-0 mb-2"
                : "bg-gray-900 bg-opacity-90 shadow-lg rounded-xl p-0 m-0 min-w-[280px] max-w-[360px] w-[260px] flex-shrink-0 mr-4"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 8 } : isMobileLandscape ? { wordBreak: 'break-word' } : {}}
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
      {/* Webcam + Timer ngang hàng */}
      {/* Webcam + Timer ngang hàng, mobile landscape: chia đều chiều ngang, không tràn, có padding */}
      <div
        className={
          mobileShrink
            ? "flex flex-row w-full justify-center items-center gap-0 px-0.5 box-border"
            : isMobileLandscape
              ? "flex flex-row flex-wrap w-full justify-center items-center gap-0 px-1 box-border"
              : "w-full mb-0 max-w-5xl flex flex-row gap-10 justify-center items-center relative"
        }
        style={mobileShrink ? { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' } : isMobileLandscape ? { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' } : { maxWidth: '100vw' }}
      >
        {/* Webcam của bạn */}
        <div
          className={mobileShrink ? "flex flex-col items-center webcam-area flex-shrink-0" : isMobileLandscape ? "flex flex-col items-center webcam-area flex-shrink-0" : "flex flex-col items-center webcam-area flex-shrink-0"}
          style={mobileShrink
            ? { width: 40, minWidth: 0, maxWidth: 45 }
            : isMobileLandscape
              ? { width: '30vw', minWidth: 0, maxWidth: 180 }
              : isMobile ? { width: '100vw', maxWidth: 420 } : {}}
        >
          <div
            className={mobileShrink ? "bg-gray-900 rounded flex items-center justify-center mb-0.5 relative shadow" : "bg-gray-900 rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl"}
            style={mobileShrink
              ? { width: 40, height: 28, minWidth: 0, minHeight: 0, maxWidth: 45, maxHeight: 32 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
            <video
              ref={myVideoRef}
              autoPlay
              muted={true}
              className={mobileShrink ? "w-full h-full object-cover rounded bg-black border border-blue-400" : "w-full h-full object-cover rounded-2xl bg-black border-4 border-blue-400"}
              style={mobileShrink ? { maxHeight: 32, minHeight: 12 } : isMobile ? { maxHeight: 240, minHeight: 120 } : {}}
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
        {/* Timer ở giữa */}
        <div className={mobileShrink ? "flex flex-col items-center justify-center" : isMobileLandscape ? "flex flex-col items-center justify-center" : "flex flex-col items-center justify-center"} style={mobileShrink ? { width: 22, minHeight: 0, minWidth: 10, maxWidth: 28 } : isMobileLandscape ? { width: '18vw', minHeight: 0, minWidth: 60, maxWidth: 120 } : {}}>
          {/* Nếu có pendingResult thì hiện 3 nút xác nhận */}
          {pendingResult !== null && !running && !prep ? (
            <div className="flex flex-row items-center justify-center gap-1 mb-1">
              <button
                className={mobileShrink ? "px-1 py-0.5 text-[9px] rounded bg-green-600 hover:bg-green-700 font-bold text-white" : "px-3 py-1 text-base rounded-lg bg-green-600 hover:bg-green-700 font-bold text-white"}
                onClick={() => {
                  // Gửi kết quả bình thường
                  let result: number|null = pendingResult;
                  if (pendingType === '+2' && result !== null) result = result + 2000;
                  if (pendingType === 'dnf') result = null;
                  setMyResults(r => {
                    const newR = [...r, result];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userName, time: result === null ? null : result });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  setTurn('opponent');
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >Gửi</button>
              <button
                className={mobileShrink ? `px-1 py-0.5 text-[9px] rounded ${pendingType === '+2' ? 'bg-yellow-500' : 'bg-gray-700'} font-bold text-white` : `px-3 py-1 text-base rounded-lg ${pendingType === '+2' ? 'bg-yellow-500' : 'bg-gray-700'} font-bold text-white`}
                onClick={() => setPendingType(pendingType === '+2' ? 'normal' : '+2')}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >+2</button>
              <button
                className={mobileShrink ? `px-1 py-0.5 text-[9px] rounded ${pendingType === 'dnf' ? 'bg-red-600' : 'bg-gray-700'} font-bold text-white` : `px-3 py-1 text-base rounded-lg ${pendingType === 'dnf' ? 'bg-red-600' : 'bg-gray-700'} font-bold text-white`}
                onClick={() => setPendingType(pendingType === 'dnf' ? 'normal' : 'dnf')}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >DNF</button>
            </div>
          ) : null}
          <div
            className={mobileShrink ? "text-xs font-bold text-yellow-300 drop-shadow select-none cursor-pointer px-0.5 py-0.5 rounded" : "text-7xl font-['Digital-7'] font-bold text-yellow-300 drop-shadow-lg select-none cursor-pointer px-4 py-2 rounded-lg"}
            style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: 12, textAlign: 'center', fontSize: 12, padding: 0 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: '100px', textAlign: 'center' }}
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
                // Không gửi kết quả ngay, chỉ lưu vào pendingResult
                setPendingResult(timerRef.current);
                setPendingType('normal');
                setCanStart(false);
                // Không setTurn('opponent') ở đây
              }
            }}
          >
            {prep ? (
              <span className={mobileShrink ? "text-[9px]" : undefined}>Chuẩn bị: {prepTime}s</span>
            ) : dnf ? (
              <span className={mobileShrink ? "text-[9px] text-red-400" : "text-red-400"}>DNF</span>
            ) : (
              <>
                <span style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 12 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace" }}>{(timer/1000).toFixed(3)}</span>
                <span className={mobileShrink ? "ml-0.5 align-bottom" : "ml-1 align-bottom"} style={mobileShrink ? { fontFamily: 'font-mono', fontWeight: 400, fontSize: 8, lineHeight: 1 } : { fontFamily: 'font-mono', fontWeight: 400, fontSize: '0.7em', lineHeight: 1 }}>s</span>
              </>
            )}
          </div>
          {running && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím bất kỳ để dừng</div>}
          {prep && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím Space để bắt đầu</div>}
        </div>
        {/* Webcam đối thủ */}
        <div
          className={mobileShrink ? "flex flex-col items-center webcam-area flex-shrink-0" : isMobileLandscape ? "flex flex-col items-center webcam-area flex-shrink-0" : "flex flex-col items-center webcam-area flex-shrink-0"}
          style={mobileShrink
            ? { width: 40, minWidth: 0, maxWidth: 45 }
            : isMobileLandscape
              ? { width: '30vw', minWidth: 0, maxWidth: 180 }
              : isMobile ? { width: '100vw', maxWidth: 420 } : {}}
        >
          <div
            className={mobileShrink ? "bg-gray-900 rounded flex items-center justify-center mb-0.5 relative shadow" : "bg-gray-900 rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl"}
            style={mobileShrink
              ? { width: 40, height: 28, minWidth: 0, minHeight: 0, maxWidth: 45, maxHeight: 32 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 420, height: 320 }}
          >
            <video
              ref={opponentVideoRef}
              autoPlay
              className={mobileShrink ? "w-full h-full object-cover rounded bg-black border border-pink-400" : "w-full h-full object-cover rounded-2xl bg-black border-4 border-pink-400"}
              style={mobileShrink ? { maxHeight: 32, minHeight: 12 } : isMobile ? { maxHeight: 240, minHeight: 120 } : {}}
            />
          </div>
          <span className={mobileShrink ? "font-semibold text-[8px] text-pink-300" : "font-semibold text-lg text-pink-300"}>{opponentName}</span>
        </div>
      </div>
    </div>
  );
}

