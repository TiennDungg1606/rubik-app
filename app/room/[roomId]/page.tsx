"use client";
import { useEffect, useRef, useState } from "react";

import React from "react";
// import Peer from "simple-peer"; // REMOVED
import { createStringeeClient, createStringeeCall } from "@/lib/stringeeClient";
import { useRouter } from "next/navigation";
// Đảm bảo window.userName luôn có giá trị đúng khi vào phòng
declare global {
  interface Window { userName?: string }
}
import { getSocket } from "@/lib/socket";
import dynamic from 'next/dynamic';
import { applyScrambleToCubeState, rotateFace, rotateFace2x2, getSolvedCubeState, Face, CubeState } from '@/lib/rubikUtils';
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
  // State lưu số set thắng, không reset khi tái đấu
  const [mySets, setMySets] = useState<number>(0);
  const [opponentSets, setOpponentSets] = useState<number>(0);
  // Modal xác nhận rời phòng
  const [showLeaveModal, setShowLeaveModal] = useState(false);


  const [roomId, setRoomId] = useState<string>("");
  // State cho meta phòng
  const [roomMeta, setRoomMeta] = useState<{ displayName?: string; event?: string } | null>(null);
  const [joinedRoom, setJoinedRoom] = useState(false);
  // Fetch meta phòng từ API
  useEffect(() => {
    if (!roomId || !joinedRoom) return;
    console.log('[Fetch meta phòng] roomId:', roomId);
    fetch(`/api/room-meta/${roomId.toUpperCase()}`)
      .then(res => {
        console.log('[Fetch meta phòng] status:', res.status);
        if (!res.ok) {
          console.error('[Fetch meta phòng] Không lấy được meta phòng, status:', res.status);
          return null;
        }
        return res.json();
      })
      .then(data => {
        console.log('[Fetch meta phòng] data:', data);
        if (data && (data.displayName || data.event)) setRoomMeta(data);
      });
  }, [roomId, joinedRoom]);
  const [showCubeNet, setShowCubeNet] = useState(false);
  // State cho chat
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{from: 'me'|'opponent', text: string}[]>([]);
  const [hasNewChat, setHasNewChat] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  // Ref cho video local và remote để truyền vào VideoCall
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Trạng thái thông báo tráo scramble
  const [showScrambleMsg, setShowScrambleMsg] = useState<boolean>(false);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [opponentCamOn, setOpponentCamOn] = useState<boolean>(true);
  const [micOn, setMicOn] = useState<boolean>(true);
  // Đã loại bỏ các ref và state liên quan đến Stringee và mediaStream, chỉ giữ lại state cho Daily.co và socket
 
  // (Đã di chuyển khai báo roomId lên đầu)
  const [scramble, setScramble] = useState<string>("");
  const [scrambleIndex, setScrambleIndex] = useState<number>(0);
  const [scrambles, setScrambles] = useState<string[]>([]); // Lưu 5 scramble đã dùng
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
  // turnUserId: userId của người được quyền giải (đồng bộ từ server)
  const [turnUserId, setTurnUserId] = useState<string>("");
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
  
  // State cho chế độ typing
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typingInput, setTypingInput] = useState("");


  const [opponentName, setOpponentName] = useState<string>('Đối thủ'); // display name
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  // Thêm khai báo biến roomUrl đúng chuẩn
  const [roomUrl, setRoomUrl] = useState<string>('');

   // State cho tái đấu
  const [rematchModal, setRematchModal] = useState<{show: boolean, from: 'me'|'opponent'|null}>({show: false, from: null});
  const [rematchPending, setRematchPending] = useState(false); // Đang chờ đối phương đồng ý
  const [rematchDeclined, setRematchDeclined] = useState(false); // Đối phương đã từ chối
  const [rematchJustAccepted, setRematchJustAccepted] = useState(false);



  // --- Thêm logic lấy customBg và set background giống lobby ---
type User = {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  customBg?: string;
};

const [user, setUser] = typeof window !== 'undefined' ? useState<User | null>(null) : [null, () => {}];
const [customBg, setCustomBg] = typeof window !== 'undefined' ? useState<string | null>(null) : [null, () => {}];

useEffect(() => {
  if (typeof window === 'undefined') return;
  fetch("/api/user/me", { credentials: "include" })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data) setUser(null);
      else if (data.user) setUser(data.user);
      else setUser(data);
    });
}, []);

useEffect(() => {
  if (user && user.customBg) {
    setCustomBg(user.customBg);
  } else {
    setCustomBg(null);
  }
}, [user]);

useEffect(() => {
  if (typeof window === 'undefined') return;
  if (customBg) {
    document.body.style.backgroundImage = `url('${customBg}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.backgroundImage = '';
  }
}, [customBg]);
// ... (các khai báo state khác)
// Lưu usersArr cuối cùng để xử lý khi userId đến sau
  const [pendingUsers, setPendingUsers] = useState<{ userId: string, userName: string }[] | null>(null);
  // Thêm state để kiểm soát việc hiện nút xác nhận sau 1s
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);

    // Ref cho khối chat để auto-scroll
  const chatListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll xuống cuối khi mở chat hoặc có tin nhắn mới
  useEffect(() => {
    if (showChat && chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [showChat, chatMessages]);

  useEffect(() => {
    if (pendingResult !== null && !running && !prep) {
      setShowConfirmButtons(false);
      const timer = setTimeout(() => setShowConfirmButtons(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowConfirmButtons(false);
    }
  }, [pendingResult, running, prep]);
// Lắng nghe danh sách users và hostId từ server
useEffect(() => {
  const socket = getSocket();
  const handleUsers = (data: { users: { userId: string, userName: string }[], hostId: string }) => {
    setUsers(data.users.map(u => u.userId));
    setWaiting(data.users.length < 2);
    setPendingUsers(data.users);
    // Đồng bộ chủ phòng từ server
    if (userId && data.hostId) {
      setIsCreator(userId === data.hostId);
    } else {
      setIsCreator(false);
    }
  };
  socket.on('room-users', handleUsers);
  return () => {
    socket.off('room-users', handleUsers);
  };
}, [userId]);

  // Lắng nghe sự kiện hủy tái đấu từ đối phương
  useEffect(() => {
    const socket = getSocket();
    function handleRematchCancel() {
      setRematchPending(false);
      setRematchModal({ show: false, from: null });
    }
    socket.on('rematch-cancel', handleRematchCancel);
    return () => {
      socket.off('rematch-cancel', handleRematchCancel);
    };
  }, []);


// Khi userId hoặc pendingUsers thay đổi, luôn cập nhật opponentId/opponentName

// Reset SETS khi có sự thay đổi người dùng (ra/vào phòng)
useEffect(() => {
  if (!userId || !pendingUsers) return;
  const opp = pendingUsers.find(u => u.userId !== userId);
  if (opp) {
    setOpponentId(opp.userId);
    setOpponentName(opp.userName || 'Đối thủ');
  }
  // Reset số set thắng khi danh sách user thay đổi
  setMySets(0);
  setOpponentSets(0);
}, [userId, pendingUsers]);



  // State cho timer và chuẩn bị của đối thủ
  const [opponentPrep, setOpponentPrep] = useState(false);
  const [opponentPrepTime, setOpponentPrepTime] = useState(15);
  const [opponentRunning, setOpponentRunning] = useState(false);
  const [opponentTimer, setOpponentTimer] = useState(0);
  const opponentTimerRef = useRef(0);
  const opponentPrepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  const opponentIntervalRef = useRef<NodeJS.Timeout|null>(null);

  // Lắng nghe socket để đồng bộ timer-prep và timer-update từ đối thủ
  useEffect(() => {
    // Đảm bảo roomId, userId đã được khai báo trước khi dùng
    if (!roomId || !userId) return;
    const socket = getSocket();
    // Nhận sự kiện đối thủ bắt đầu hoặc đang đếm ngược chuẩn bị
    type PrepPayload = { roomId: string; userId: string; remaining: number };
    const handleOpponentPrep = ({ roomId: rid, userId: uid, remaining }: PrepPayload) => {
      if (rid !== roomId || uid === userId) return;
      setOpponentPrep(true);
      setOpponentPrepTime(remaining);
      // Reset timer running khi bắt đầu chuẩn bị
      setOpponentRunning(false);
      setOpponentTimer(0);
      if (opponentPrepIntervalRef.current) clearInterval(opponentPrepIntervalRef.current);
      opponentPrepIntervalRef.current = setInterval(() => {
        setOpponentPrepTime(t => {
          if (t <= 1) {
            clearInterval(opponentPrepIntervalRef.current!);
            setOpponentPrep(false);
            setOpponentPrepTime(15);
            return 15;
          }
          return t - 1;
        });
      }, 1000);
    };
    // Nhận sự kiện đối thủ bắt đầu hoặc đang chạy timer
    type TimerPayload = { roomId: string; userId: string; ms: number; running: boolean; finished: boolean };
    let lastOpponentUpdate = Date.now();
    const handleOpponentTimer = ({ roomId: rid, userId: uid, ms, running, finished }: TimerPayload) => {
      if (rid !== roomId || uid === userId) return;
      
      console.log('[Opponent Timer] Received:', { running, ms, finished });
      
      if (running) {
        // Khi đối thủ bắt đầu timer, tắt chuẩn bị và bắt đầu timer
        console.log('[Opponent Timer] Starting timer, stopping prep');
        setOpponentPrep(false);
        setOpponentPrepTime(15);
        if (opponentPrepIntervalRef.current) clearInterval(opponentPrepIntervalRef.current);
        
        setOpponentRunning(true);
        setOpponentTimer(ms);
        opponentTimerRef.current = ms;
        lastOpponentUpdate = Date.now();
        
        // Bắt đầu interval để tăng timer dựa trên thời gian thực tế
        if (opponentIntervalRef.current) clearInterval(opponentIntervalRef.current);
        opponentIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = now - lastOpponentUpdate;
          setOpponentTimer(ms + elapsed);
        }, 30);
      } else {
        // Khi đối thủ dừng timer
        setOpponentRunning(false);
        setOpponentTimer(ms);
        opponentTimerRef.current = ms;
        if (opponentIntervalRef.current) clearInterval(opponentIntervalRef.current);
      }
    };
    socket.on('timer-prep', handleOpponentPrep);
    socket.on('timer-update', handleOpponentTimer);
    return () => {
      socket.off('timer-prep', handleOpponentPrep);
      socket.off('timer-update', handleOpponentTimer);
      if (opponentPrepIntervalRef.current) clearInterval(opponentPrepIntervalRef.current);
      if (opponentIntervalRef.current) clearInterval(opponentIntervalRef.current);
    };
  }, [roomId, userId]);



// --- CubeNetModal component and scramble logic ---
type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
type CubeState = Record<Face, string[]>;


interface CubeNetModalProps {
  scramble: string;
  open: boolean;
  onClose: () => void;
  size: number; // 2 hoặc 3
}


function CubeNetModal({ scramble, open, onClose, size }: CubeNetModalProps) {
  const [cubeState, setCubeState] = useState<CubeState>(() => applyScrambleToCubeState(scramble || '', size));
  useEffect(() => {
    setCubeState(applyScrambleToCubeState(scramble || '', size));
  }, [scramble, size]);
  const faceSize = 70;
  // layoutGrid cho 2x2 và 3x3 giống nhau về vị trí, chỉ khác số sticker mỗi mặt
  const layoutGrid: (Face | '')[][] = [
    ['', 'U', '', ''],
    ['L', 'F', 'R', 'B'],
    ['', 'D', '', ''],
  ];
  function renderStickers(faceKey: Face) {
    // Nếu size=2, chỉ render đúng 4 sticker (2x2), không render 9 sticker
    if (size === 2) {
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 4).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    } else {
      // 3x3: 9 sticker
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 9).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    }
  }
  return open ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-pink-100 rounded-xl p-4 shadow-lg relative modal-content" style={{ minWidth: 320, minHeight: 320 }}>
        <button onClick={onClose} className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Đóng</button>
        <div className="mb-2 text-center font-bold text-lg text-gray-700"></div>
        <div id="net-view" style={{ display: 'grid', gridTemplateColumns: `repeat(4, ${faceSize}px)`, gridTemplateRows: `repeat(3, ${faceSize}px)`, gap: 2, background: 'none' }}>
          {layoutGrid.flatMap((row, rowIdx) =>
            row.map((faceKey, colIdx) => {
              if (faceKey === '') {
                return <div key={`blank-${rowIdx}-${colIdx}`} className="net-face-empty" style={{ width: faceSize, height: faceSize, background: 'none' }}></div>;
              } else {
                return (
                  <React.Fragment key={faceKey}>{renderStickers(faceKey as Face)}</React.Fragment>
                );
              }
            })
          )}
        </div>
        <div className="mt-3 text-gray-700 text-sm text-center font-mono">Scramble: <span className="font-bold">{scramble}</span></div>
      </div>
    </div>
  ) : null;
}
// --- End CubeNetModal ---
  // Xác định loại cube (2x2 hoặc 3x3) dựa vào roomMeta.event, dùng useMemo để luôn cập nhật đúng
  const cubeSize = React.useMemo(() => {
    if (roomMeta && typeof roomMeta.event === 'string' && roomMeta.event.includes('2x2')) return 2;
    return 3;
  }, [roomMeta]);


// Lắng nghe sự kiện reset phòng từ server (khi chỉ còn 1 người)
useEffect(() => {
  const socket = getSocket();
  const handleRoomReset = () => {
    setMyResults([]);
    setOpponentResults([]);
    setScramble("");
    setScrambleIndex(0);
    setScrambles([]);
    setPrep(false);
    setCanStart(false);
    setSpaceHeld(false);
    setTimer(0);
    setDnf(false);
    setPendingResult(null);
    setPendingType('normal');
    setOpponentId("");
    setOpponentName("Đối thủ");
    setRoomUrl("");
    setRematchPending(false);
    setRematchModal({ show: false, from: null });
    setRematchDeclined(false);
  // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
  };
  socket.on('room-reset', handleRoomReset);
  return () => {
    socket.off('room-reset', handleRoomReset);
  };
}, [roomId]);

// Đặt effect lắng nghe rematch ở cuối cùng, sau tất cả các state liên quan

// --- EFFECT LẮNG NGHE REMATCH ---

useEffect(() => {
  const socket = getSocket();
  if (!userId) return;
  // Khi nhận được yêu cầu tái đấu
  const handleRematchRequest = ({ fromUserId }: { fromUserId: string }) => {
    if (fromUserId !== userId) {
      setRematchModal({ show: true, from: 'opponent' });
    }
  };
  // Khi đối phương đồng ý tái đấu
  const handleRematchAccepted = () => {
    setMyResults([]);
    setOpponentResults([]);
    setScramble("");
    setScrambleIndex(0);
    setPendingResult(null);
    setPendingType('normal');
  // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
    setRematchPending(false);
    setRematchJustAccepted(true); // Đánh dấu vừa tái đấu xong
  };
  // Khi đối phương từ chối tái đấu
  const handleRematchDeclined = () => {
    setRematchPending(false);
    setRematchModal({ show: false, from: null });
    setRematchDeclined(true);
    setTimeout(() => setRematchDeclined(false), 2500); // Ẩn sau 2.5s
  };
  socket.on('rematch-request', handleRematchRequest);
  socket.on('rematch-accepted', handleRematchAccepted);
  socket.on('rematch-declined', handleRematchDeclined);
  return () => {
    socket.off('rematch-request', handleRematchRequest);
    socket.off('rematch-accepted', handleRematchAccepted);
    socket.off('rematch-declined', handleRematchDeclined);
  };
}, [userId, roomId, isCreator]);

// Lắng nghe sự kiện opponent-solve từ server để cập nhật kết quả đối thủ
useEffect(() => {
  const socket = getSocket();
  const handleOpponentSolve = (data: { userId: string, userName: string, time: number }) => {
    setOpponentResults(prev => {
      const arr = [...prev];
      const nextIdx = arr.length;
      if (nextIdx < 5) arr[nextIdx] = data.time;
      return arr.slice(0, 5);
    });
    if (data.userName && data.userName !== opponentName) setOpponentName(data.userName);
    // Không tự chuyển lượt nữa, lượt sẽ do server broadcast
  };
  socket.on('opponent-solve', handleOpponentSolve);
  return () => {
    socket.off('opponent-solve', handleOpponentSolve);
  };
}, [opponentName]);

// Lắng nghe lượt chơi từ server (turnUserId)
useEffect(() => {
  const socket = getSocket();
  const handleTurn = (data: { turnUserId: string }) => {
    setTurnUserId(data.turnUserId || "");
  };
  socket.on('room-turn', handleTurn);
  return () => {
    socket.off('room-turn', handleTurn);
  };
}, []);

// --- EFFECT LẮNG NGHE SCRAMBLE ---
useEffect(() => {
  const socket = getSocket();
  let scrambleMsgTimeout: NodeJS.Timeout | null = null;
  const handleScramble = ({ scramble, index }: { scramble: string, index: number }) => {
    setScramble(scramble);
    setScrambleIndex(index);
    setScrambles(prev => {
      const arr = [...prev];
      arr[index] = scramble;
      return arr.slice(0, 5); // chỉ giữ 5 scramble
    });
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
    // Nếu vừa tái đấu xong thì reset cờ
    setRematchJustAccepted(false);
  };
  socket.on("scramble", handleScramble);
  return () => {
    socket.off("scramble", handleScramble);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    if (scrambleMsgTimeout) clearTimeout(scrambleMsgTimeout);
  };
}, [roomId]);

  // Hàm gửi yêu cầu tái đấu
  function handleRematch() {
    const socket = getSocket();
    setRematchPending(true);
    socket.emit('rematch-request', { roomId, fromUserId: userId });
  }

  // Hàm đối phương đồng ý hoặc từ chối
  function respondRematch(accept: boolean) {
    const socket = getSocket();
    setRematchModal({ show: false, from: null });
    if (accept) {
      socket.emit('rematch-accepted', { roomId });
      // Reset toàn bộ kết quả, scramble, index, giữ quyền chủ phòng
      setMyResults([]);
      setOpponentResults([]);
      setScramble("");
      setScrambleIndex(0);
      setPendingResult(null);
      setPendingType('normal');
    // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
      // Không gửi next-scramble, chỉ chờ server gửi scramble đầu tiên
    } else {
      socket.emit('rematch-declined', { roomId });
    }
  }
    // Lắng nghe tin nhắn chat từ đối thủ (đặt sau khi đã có userId, userName)
  useEffect(() => {
    const socket = getSocket();
    const handleChat = (data: { userId: string, userName: string, message: string }) => {
      // Nếu là tin nhắn của mình thì bỏ qua (đã hiển thị local)
      if (data.userId === userId) return;
      setChatMessages(msgs => [...msgs, { from: 'opponent', text: data.message }]);
      setHasNewChat(true);
      // Phát âm thanh ting
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    };
    socket.on('chat', handleChat);
    return () => {
      socket.off('chat', handleChat);
    };
  }, [userId]);
  // Lắng nghe sự kiện đối thủ tắt/bật cam để hiện overlay đúng
  useEffect(() => {
    const socket = getSocket();
    const handleOpponentCamToggle = ({ userId: fromId, camOn, userName: fromName }: { userId: string, camOn: boolean, userName?: string }) => {
      if (fromId !== userId) {
        setOpponentCamOn(camOn);
        if (fromName) setOpponentName(fromName);
      }
    };
    socket.on('user-cam-toggle', handleOpponentCamToggle);
    return () => {
      socket.off('user-cam-toggle', handleOpponentCamToggle);
    };
  }, [userId]);

  // Lấy access_token cho Stringee khi vào phòng (dùng userId và opponentId)
  useEffect(() => {
    if (!roomId || !userId || !opponentId) return;
    if (roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0) return;
    // Gọi API lấy access_token cho userId
    fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.access_token) {
          // Tạo roomUrl đúng định dạng JSON cho VideoCall
          const url = JSON.stringify({ access_token: data.access_token, userId, opponentId });
          setRoomUrl(url);
          console.log('[RoomPage] Đã nhận roomUrl:', url);
        } else {
          console.error('[RoomPage] Không nhận được access_token từ API:', data);
        }
      })
      .catch(err => {
        console.error('[RoomPage] Lỗi fetch /api/token:', err);
      });
  }, [roomId, userId, opponentId, roomUrl]);


  // ...giữ nguyên toàn bộ logic và return JSX phía sau...

  // --- Effects and logic below ---

  // Hàm rời phòng: emit leave-room trước khi chuyển hướng về lobby
  function handleLeaveRoom() {
    // Chỉ hiện modal xác nhận
    setShowLeaveModal(true);
  }

  function confirmLeaveRoom() {
    const socket = getSocket();
    if (roomId && userId) {
      socket.emit('leave-room', { roomId, userId });
    }
    window.location.href = '/lobby';
    setTimeout(() => {
      window.location.reload();
    }, 1300);
  }

  // Hàm xử lý chế độ typing
  function handleTypingMode() {
    if (users.length < 2) return; // Chỉ hoạt động khi đủ 2 người
    setIsTypingMode(!isTypingMode);
    setTypingInput("");
  }

  // Hàm xử lý nhập thời gian
  function handleTypingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (users.length < 2) return;
    
    const socket = getSocket();
    let time: number | null = null;
    
    if (typingInput.trim() === "") {
      // Nếu để trống, gửi DNF
      time = null;
    } else {
      // Chuyển đổi input thành milliseconds theo logic đúng
      const input = typingInput.trim();
      if (input.length === 1) {
        time = parseInt(input) * 10; // 1 -> 0.01s
      } else if (input.length === 2) {
        time = parseInt(input); // 12 -> 0.12s
      } else if (input.length === 3) {
        time = parseInt(input) * 10; // 123 -> 1.23s
      } else if (input.length === 4) {
        time = parseInt(input) * 10; // 1234 -> 12.34s
      } else {
        // 5 chữ số: lấy 4 chữ số cuối và nhân 10
        time = parseInt(input.slice(-4)) * 10; // 12345 -> 234.50s
      }
    }
    
    // Gửi kết quả lên server
    if (time !== null) {
      setMyResults(r => [...r, time]);
      socket.emit("solve", { roomId, userId, userName, time });
    } else {
      setMyResults(r => [...r, null]);
      socket.emit("solve", { roomId, userId, userName, time: null });
    }
    
    // Reset input và chuyển lượt, giữ nguyên chế độ typing/timer
    setTypingInput("");
    // setIsTypingMode(false); // Không reset chế độ typing/timer
    setOpponentTime(12345 + Math.floor(Math.random() * 2000));
  }

  // Hàm xử lý input chỉ nhận số
  function handleTypingInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Chỉ giữ lại số
    if (value.length <= 5) { // Giới hạn tối đa 5 chữ số
      setTypingInput(value);
    }
  }

  // Đã loại bỏ cleanup Stringee khi đóng tab hoặc reload

  // Reload khi rời phòng bằng nút back (popstate) và emit leave-room
  useEffect(() => {
    function handlePopState() {
      const socket = getSocket();
      if (roomId && userId) {
        socket.emit('leave-room', { roomId, userId });
      }
      window.location.reload();
    }
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomId, userId]);
  // Emit leave-room when component unmounts (tab close, navigation away)
  useEffect(() => {
    return () => {
      const socket = getSocket();
      if (roomId && userId) {
        socket.emit('leave-room', { roomId, userId });
      }
    };
  }, [roomId, userId]);

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

  // Khi đã có roomId, join-room với password nếu có
  useEffect(() => {
    if (!roomId || !userName || !userId) return;
    const socket = getSocket();
    // Lấy meta phòng từ sessionStorage nếu có (chỉ khi vừa tạo phòng)
    let password = "";
    let event = undefined;
    let displayName = undefined;
    if (typeof window !== "undefined") {
      // Ưu tiên lấy meta nếu là người tạo phòng
      const metaStr = sessionStorage.getItem(`roomMeta_${roomId}`);
      if (metaStr) {
        try {
          const meta = JSON.parse(metaStr);
          event = meta.event;
          displayName = meta.displayName;
          password = meta.password || "";
        } catch {}
        sessionStorage.removeItem(`roomMeta_${roomId}`);
      } else {
        password = sessionStorage.getItem(`roomPassword_${roomId}`) || "";
        sessionStorage.removeItem(`roomPassword_${roomId}`);
      }
    }
    socket.emit("join-room", { roomId, userId, userName, event, displayName, password });
    // Lắng nghe xác nhận đã join phòng
    const handleRoomJoined = () => {
      setJoinedRoom(true);
    };
    socket.on("room-joined", handleRoomJoined);
    // Lắng nghe sai mật khẩu
    const handleWrongPassword = (data: { message?: string }) => {
      alert(data?.message || "Sai mật khẩu phòng!");
      window.location.href = "/lobby";
    };
    socket.on("wrong-password", handleWrongPassword);
    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("wrong-password", handleWrongPassword);
    };
  }, [roomId, userName, userId]);

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

  // Đã loại bỏ logic tự xác định chủ phòng từ sessionStorage, isCreator sẽ được đồng bộ từ server

  // always keep timerRef in sync
  useEffect(() => { timerRef.current = timer; }, [timer]);





  // ĐÃ LOẠI BỎ effect thừa join-room không truyền password, event, displayName


  // Đã loại bỏ logic tự set turn, turn sẽ được đồng bộ từ server qua turnUserId

  // Nhận scramble từ server qua socket, hiện thông báo tráo scramble đúng 5s
  useEffect(() => {
    const socket = getSocket();
    let scrambleMsgTimeout: NodeJS.Timeout | null = null;
    const handleScramble = ({ scramble, index }: { scramble: string, index: number }) => {
      setScramble(scramble);
      setScrambleIndex(index);
      setScrambles(prev => {
        const arr = [...prev];
        arr[index] = scramble;
        return arr.slice(0, 5); // chỉ giữ 5 scramble
      });
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
    // Chỉ cho phép nếu đến lượt mình (userId === turnUserId)
    if (waiting || running || userId !== turnUserId || myResults.length >= 5 || pendingResult !== null) return;
    let localSpaceHeld = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (pendingResult !== null) return;
      if (isTypingMode) return; // Chặn phím space khi đang ở chế độ typing
      
      // Kiểm tra xem có đang trong modal nào không
      const activeElement = document.activeElement;
      const isInModal = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('.modal-content') ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('[data-modal]')
      );
      
      if (isInModal) return; // Không xử lý phím space nếu đang trong modal
      
      if (prep) {
        if (!localSpaceHeld) {
          pressStartRef.current = Date.now();
          localSpaceHeld = true;
          setSpaceHeld(true);
        }
      } else if (!prep && !running) {
        setPrep(true);
        setPrepTime(15);
        setDnf(false);
        pressStartRef.current = Date.now();
        localSpaceHeld = true;
        setSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (prep && localSpaceHeld) {
        const now = Date.now();
        const start = pressStartRef.current;
        pressStartRef.current = null;
        localSpaceHeld = false;
        setSpaceHeld(false);
        if (start && now - start >= 150) {
          setPrep(false);
          setCanStart(true);
        }
      } else {
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile, waiting, running, prep, userId, turnUserId, myResults.length]);

  // Đếm ngược 15s chuẩn bị
  useEffect(() => {
    if (!prep || waiting) return;
    setCanStart(false);
    setSpaceHeld(false);
    setDnf(false);
    
    // Gửi timer-prep event để đối thủ biết mình đang chuẩn bị
    const socket = getSocket();
    socket.emit("timer-prep", { roomId, userId, remaining: 15 });
    
    prepIntervalRef.current = setInterval(() => {
      setPrepTime(t => {
                  if (t <= 1) {
            clearInterval(prepIntervalRef.current!);
            setPrep(false);
            setCanStart(false);
            setRunning(false);
            setDnf(true);
            pressStartRef.current = null;
            
            // Gửi timer-update event để đối thủ biết mình DNF
            const socket = getSocket();
            socket.emit("timer-update", { roomId, userId, ms: 0, running: false, finished: true });
            
            // Lưu kết quả DNF và gửi lên server, server sẽ tự chuyển lượt
            setMyResults(r => {
              const newR = [...r, null];
              const socket = getSocket();
              socket.emit("solve", { roomId, userId, userName, time: null });
              return newR;
            });
            // Không tự setTurn nữa
            setTimeout(() => setOpponentTime(12345 + Math.floor(Math.random()*2000)), 1000);
            return 0;
          }
        // Gửi timer-prep update mỗi giây
        socket.emit("timer-prep", { roomId, userId, remaining: t - 1 });
        return t - 1;
      });
    }, 1000);
    return () => {
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, [prep, waiting, roomId, userId]);


  // Khi canStart=true, bắt đầu timer, dừng khi bấm phím bất kỳ (desktop, không nhận chuột) hoặc chạm (mobile)
  useEffect(() => {
    if (!canStart || waiting) return;
    setRunning(true);
    setTimer(0);
    timerRef.current = 0;
    
    // Gửi timer-update event để đối thủ biết mình bắt đầu timer
    const socket = getSocket();
    socket.emit("timer-update", { roomId, userId, ms: 0, running: true, finished: false });
    
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
      
      // Gửi timer-update event để đối thủ biết mình dừng timer
      socket.emit("timer-update", { roomId, userId, ms: timerRef.current, running: false, finished: false });
      
      setPendingResult(timerRef.current);
      setPendingType('normal');
      setCanStart(false);
      // Không setTurn('opponent') ở đây, chờ xác nhận
    };
    const handleAnyKey = (e: KeyboardEvent) => {
      if (waiting) return;
      if (isTypingMode) return; // Chặn phím bất kỳ khi đang ở chế độ typing
      
      // Kiểm tra xem có đang trong modal nào không
      const activeElement = document.activeElement;
      const isInModal = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('.modal-content') ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('[data-modal]')
      );
      
      if (isInModal) return; // Không xử lý phím bất kỳ nếu đang trong modal
      
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
  // Khi kết thúc trận đấu (đủ 5 lượt mỗi bên), xác định người thắng và tăng set
  if (myResults.length === 5 && opponentResults.length === 5) {
    const myAo5 = calcStats(myResults).ao5;
    const oppAo5 = calcStats(opponentResults).ao5;
    if (myAo5 !== null && (oppAo5 === null || myAo5 < oppAo5)) {
      setMySets(s => s + 1);
    } else if (oppAo5 !== null && (myAo5 === null || myAo5 > oppAo5)) {
      setOpponentSets(s => s + 1);
    }
  }
  setPrep(false);
  setCanStart(false);
  setSpaceHeld(false);
  setTimer(0);
  setDnf(false);
  // Chỉ đổi scramble khi tổng số lượt giải là số chẵn (sau mỗi vòng)
  if (totalSolves % 2 === 0 && totalSolves < 10) {
    // ...
  }
}, [myResults, opponentResults, roomId]);

  // Tính toán thống kê
  const myStats = calcStats(myResults);
  const oppStats = calcStats(opponentResults);

function formatTime(ms: number|null, showDNF: boolean = false) {
  if (ms === null) return showDNF ? 'DNF' : '';
  return (ms/1000).toFixed(2);
}

function formatStat(val: number|null, showDNF: boolean = false) {
  if (val === null) return showDNF ? 'DNF' : '';
  return (val/1000).toFixed(2);
}

  const [showLoading, setShowLoading] = useState(true);
  // Luôn hiển thị loading đủ 5s khi mount
  useEffect(() => {
    setShowLoading(true);
    let timeout: NodeJS.Timeout;
    if (userName && roomId) {
      timeout = setTimeout(() => setShowLoading(false), 5000);
    }
    return () => timeout && clearTimeout(timeout);
  }, [userName, roomId]);

  if (showLoading || !userName || !roomId) {
    // Thanh loading đơn giản phía dưới màn hình
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
        <video
          src="/loadingroom.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        />
        {/* Thanh loading nâng lên cao hơn mép dưới */}
        <div className="fixed left-1/2 -translate-x-1/2" style={{ bottom: '60px', width: '90vw', maxWidth: 480, zIndex: 10000 }}>
          <div className="h-2 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full animate-loading-bar" style={{ width: '100%' }}></div>
          <div className="text-white text-center mt-2 text-base font-semibold drop-shadow" style={{ textShadow: '0 2px 8px #000' }}>
            Đang tải thông tin ...
          </div>
        </div>
        <style jsx global>{`
          @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-loading-bar {
            animation: loading-bar 1.2s linear infinite;
          }
        `}</style>
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
          ? "min-h-screen w-screen flex flex-col items-center justify-start text-white py-1 overflow-x-auto relative  "
          : "min-h-screen w-full flex flex-col items-center text-white py-4 overflow-hidden relative"
      }
      style={{ 
      
        // backgroundImage: "url('/images.jpg')",
        // backgroundSize: 'cover',
        // backgroundPosition: 'center',
        // backgroundRepeat: 'no-repeat',
        // backgroundColor: '#000',
        // minHeight: '100vh',
        // height: '100%',
      }}
    >
      {/* Hiển thị meta phòng */}
      <div className="w-full flex flex-col items-center justify-center mt-2 mb-1">
        {roomMeta && (
          <div className="relative w-full flex items-center justify-center">
            {/* Overlay dưới thông tin phòng */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: mobileShrink ? 'auto' : 'auto',
              minWidth: mobileShrink ? '140px' : '250px',
              maxWidth: mobileShrink ? '220px' : '400px',
              height: mobileShrink ? 32 : 48,
              background: 'rgba(0,0,0,0.35)',
              borderRadius: 12,
              zIndex: 0,
              padding: mobileShrink ? '0 8px' : '0 16px'
            }} />
            <div className={mobileShrink ? "text-[13px] font-semibold text-center mb-1 relative z-10" : "text-xl font-semibold text-center mb-2 relative z-10"}>
              <span className="text-blue-300">Tên phòng:</span> <span className="text-white">{roomMeta.displayName || roomId}</span>
              {roomMeta.event && (
                <span className="ml-3 text-pink-300">Thể loại: <span className="font-bold">{roomMeta.event}</span></span>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Nút rời phòng */}
      <div
        className={
          mobileShrink
            ? "absolute top-0.5 left-0.5 z-50 flex flex-row gap-1"
            : "fixed top-4 left-4 z-50 flex flex-row gap-2"
        }
        style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
      >
        <button
          onClick={handleLeaveRoom}
          className={
            (mobileShrink
              ? "bg-red-600 hover:bg-red-700 text-[9px] rounded-full font-bold shadow-lg flex items-center justify-center"
              : "bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg flex items-center justify-center")
            + " transition-transform duration-200 hover:scale-110 active:scale-95"
          }
          style={mobileShrink ? { fontSize: 18, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
          type="button"
          aria-label="Rời phòng"
          title="Rời phòng"
        >
          {/* Icon logout/exit SVG */}
          <span style={{fontSize: mobileShrink ? 18 : 28, display: 'block', lineHeight: 1}}>↩</span>
        </button>
      </div>
      {/* Modal xác nhận rời phòng */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(2px)' }}>
          <div className={`${mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[260px] h-[140px] border-2 border-red-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] h-[180px] border-4 border-red-400 flex flex-col items-center justify-center"} modal-content`}>
            <div className="text-lg font-bold text-red-300 mb-4 text-center">Bạn có chắc chắn muốn rời phòng không?</div>
            <div className="flex flex-row gap-4 mt-2">
              <button onClick={confirmLeaveRoom} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Rời phòng</button>
              <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Hủy</button>
            </div>
          </div>
        </div>
      )}
      {/* Nút Chat, nút tái đấu và nút luật thi đấu ở góc trên bên phải */}
      <div
        className={
          mobileShrink
            ? "absolute top-0.5 right-0.5 z-50 flex flex-row items-center gap-1"
            : "fixed top-4 right-4 z-50 flex flex-row items-center gap-2"
        }
        style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
      >
                {/* Nút typing, nút tái đấu và nút lưới scramble */}
        <div className="flex items-center gap-1">
          {/* Nút Typing */}
          <button
            onClick={handleTypingMode}
            disabled={users.length < 2 || userId !== turnUserId}
            className={
              (mobileShrink
                ? `px-1 py-0.5 ${isTypingMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${users.length < 2 || userId !== turnUserId ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 ${isTypingMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${users.length < 2 || userId !== turnUserId ? 'opacity-60 cursor-not-allowed' : ''}`)
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label={isTypingMode ? "Chế độ timer" : "Chế độ typing"}
            title={isTypingMode ? "Chế độ timer" : "Chế độ typing"}
          >
            {/* Icon keyboard hoặc clock */}
            {isTypingMode ? (
              <span style={{fontSize: mobileShrink ? 18 : 28, display: 'block', lineHeight: 1}}>⏰</span>
            ) : (
              <span style={{fontSize: mobileShrink ? 18 : 28, display: 'block', lineHeight: 1}}>⌨️</span>
            )}
          </button>
          <button
            onClick={handleRematch}
            disabled={rematchPending || users.length < 2}
            className={
              (mobileShrink
                ? `px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${rematchPending ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 bg-gray-600 hover:bg-gray-700 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${rematchPending ? 'opacity-60 cursor-not-allowed' : ''}`)
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Tái đấu"
            title="Tái đấu"
          >
            {/* Icon vòng lặp/refresh */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" width={mobileShrink ? 18 : 28} height={mobileShrink ? 18 : 28} style={{ display: 'block' }}>
              <path d="M24 8a16 16 0 1 1-11.31 4.69" stroke="white" strokeWidth="3" fill="none"/>
              <path d="M12 8v5a1 1 0 0 0 1 1h5" stroke="white" strokeWidth="3" fill="none"/>
            </svg>
          </button>
          <button
            className={
              (mobileShrink
                ? "bg-gray-500 hover:bg-gray-700 text-[13px] rounded-full font-bold shadow-lg flex items-center justify-center"
                : "bg-gray-500 hover:bg-gray-700 text-white rounded-full font-bold shadow-lg flex items-center justify-center")
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
            }
            style={mobileShrink ? { fontSize: 18, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Lưới scramble"
            title="Lưới scramble"
            onClick={() => {
              setShowCubeNet(true);
            }}
          >
            <span role="img" aria-label="cross" style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>✟</span>
          </button>
          {/* Modal lưới Rubik */}
          <CubeNetModal key={`${scramble}-${cubeSize}`} scramble={scramble} open={showCubeNet} onClose={() => setShowCubeNet(false)} size={cubeSize} />
        </div>
      {/* Modal xác nhận tái đấu khi nhận được yêu cầu từ đối phương */}
      {rematchModal.show && rematchModal.from === 'opponent' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(2px)' }}>
          <div className={`${mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[260px] h-[160px] border-2 border-green-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] h-[200px] border-4 border-green-400 flex flex-col items-center justify-center"} modal-content`}>
            <div className="text-lg font-bold text-green-300 mb-4 text-center">Đối thủ muốn tái đấu. Bạn có đồng ý không?</div>
            <div className="flex flex-row gap-4 mt-2">
              <button onClick={() => respondRematch(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Đồng ý</button>
              <button onClick={() => respondRematch(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Từ chối</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal đang chờ đối phương đồng ý tái đấu */}
      {rematchPending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(1px)' }}>
          <div className={`${mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[220px] h-[120px] border-2 border-green-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[320px] max-w-[95vw] h-[140px] border-4 border-green-400 flex flex-col items-center justify-center"} modal-content`}>
            <div className="text-base font-semibold text-green-200 text-center mb-4">Đang chờ đối phương xác nhận tái đấu...</div>
            <button
              onClick={() => {
                setRematchPending(false);
                const socket = getSocket();
                socket.emit('rematch-cancel', { roomId });
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold mt-2 transition-all duration-200 hover:scale-105 active:scale-95"
            >Hủy</button>
          </div>
        </div>
      )}

      {/* Modal thông báo đối phương đã từ chối tái đấu */}
      {rematchDeclined && (
        <div className="fixed inset-0 z-[201] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(1px)' }}>
          <div className={`${mobileShrink ? "bg-gray-900 rounded p-2 w-[80vw] max-w-[200px] h-[80px] border-2 border-red-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[300px] max-w-[90vw] h-[100px] border-4 border-red-400 flex flex-col items-center justify-center"} modal-content`}>
            <div className="text-base font-semibold text-red-300 text-center">Đối thủ đã từ chối tái đấu</div>
          </div>
        </div>
      )}
        <div className="flex items-center relative">
          <button
            onClick={() => { setShowChat(true); setHasNewChat(false); }}
            className={
              (mobileShrink
                ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
                : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center")
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Chat"
            title="Chat"
          >
            <span role="img" aria-label="Chat">💬</span>
            {/* Chấm đỏ báo tin nhắn mới */}
            {hasNewChat && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: mobileShrink ? 8 : 12, height: mobileShrink ? 8 : 12, background: '#f00', borderRadius: '50%', display: 'inline-block', border: '2px solid white', zIndex: 10 }}></span>
            )}
          </button>
          {/* Âm thanh ting */}
          <audio ref={audioRef} src="/ting.mp3" preload="auto" />
        </div>
      {/* Modal chat nổi */}
      {showChat && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent modal-backdrop"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className={`${mobileShrink ? "bg-gray-900 rounded pt-2 px-2 w-[90vw] max-w-[260px] h-[320px] border-2 border-blue-400 relative flex flex-col" : "bg-gray-900 rounded-2xl pt-6 px-6 w-[400px] max-w-[95vw] h-[520px] border-4 border-blue-400 relative flex flex-col"} modal-content`}
            style={mobileShrink ? { fontSize: 10, overflow: 'hidden' } : { overflow: 'hidden' }}
          >
            <button
              onClick={() => setShowChat(false)}
              className={`${mobileShrink ? "absolute top-1 right-1 px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold" : "absolute top-3 right-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-base rounded-lg font-bold"} transition-all duration-200 hover:scale-105 active:scale-95`}
              style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              type="button"
            >Đóng</button>
            <div className={mobileShrink ? "text-[11px] font-bold text-blue-300 mb-1 text-center" : "text-xl font-bold text-blue-300 mb-3 text-center"}>
              Chat phòng
            </div>
            <div
              ref={chatListRef}
              className={mobileShrink ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto"}
              style={mobileShrink ? { maxHeight: 230 } : { maxHeight: 350 }}
            >
              {chatMessages.length === 0 && (
                <div className="text-gray-400 text-center mt-4">Chưa có tin nhắn nào</div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${
                    msg.from === 'me'
                      ? (mobileShrink ? "flex justify-end mb-1" : "flex justify-end mb-2")
                      : (mobileShrink ? "flex justify-start mb-1" : "flex justify-start mb-2")
                  } chat-message ${idx === chatMessages.length - 1 ? 'new-message' : ''}`}
                >
                  <div
                    className={`${
                      msg.from === 'me'
                        ? (mobileShrink ? "bg-blue-500 text-white px-2 py-1 rounded-lg max-w-[70%] text-[10px]" : "bg-blue-500 text-white px-3 py-2 rounded-lg max-w-[70%] text-base")
                        : (mobileShrink ? "bg-gray-700 text-white px-2 py-1 rounded-lg max-w-[70%] text-[10px]" : "bg-gray-700 text-white px-3 py-2 rounded-lg max-w-[70%] text-base")
                    } chat-bubble`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
                          <form
                className={mobileShrink ? "flex flex-row items-center gap-1" : "flex flex-row items-center gap-2"}
                style={{ 
                  position: 'absolute', 
                  left: mobileShrink ? '8px' : '24px', 
                  right: mobileShrink ? '8px' : '24px', 
                  bottom: mobileShrink ? '8px' : '24px' 
                }}
                onSubmit={e => {
                  e.preventDefault();
                  if (chatInput.trim() === "") return;
                  setChatMessages(msgs => [...msgs, { from: 'me', text: chatInput }]);
                  // Gửi chat qua socket cho đối thủ
                  const socket = getSocket();
                  socket.emit('chat', { roomId, userId, userName, message: chatInput });
                  setChatInput("");
                }}
              >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className={mobileShrink ? "flex-1 px-1 py-1 rounded bg-gray-800 text-white text-[10px] border border-gray-600" : "flex-1 px-3 py-2 rounded-lg bg-gray-800 text-white text-base border border-gray-600"}
                placeholder="Nhập tin nhắn..."
                autoFocus
              />
              <button
                type="submit"
                className={`${mobileShrink ? "px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center justify-center" : "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-bold flex items-center justify-center"} transition-all duration-200 hover:scale-105 active:scale-95`}
                style={{ minWidth: mobileShrink ? 28 : 40, minHeight: mobileShrink ? 28 : 40, padding: 0 }}
                aria-label="Gửi"
                title="Gửi"
              >
                {/* Icon máy bay giấy */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={mobileShrink ? 16 : 22} height={mobileShrink ? 16 : 22} style={{ display: 'block' }}>
                  <path d="M2 21L23 12L2 3L5 12L2 21Z" fill="white"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
        {/* Nút luật thi đấu */}
        <div className="flex items-center">
          <button
            onClick={() => setShowRules(true)}
            className={
              (mobileShrink
                ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
                : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center")
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Luật thi đấu"
            title="Luật thi đấu"
          >
            <span role="img" aria-label="Luật thi đấu">📜</span>
          </button>
        </div>
      </div>
      {/* Modal luật thi đấu */}
      {showRules && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent modal-backdrop"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className={`${mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[260px] h-[220px] border-2 border-blue-400 relative flex flex-col" : "bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] h-[480px] border-4 border-blue-400 relative flex flex-col"} modal-content`}
            style={mobileShrink ? { fontSize: 10, overflow: 'hidden' } : { overflow: 'hidden' }}
          >
            <button
              onClick={() => setShowRules(false)}
              className={`${mobileShrink ? "absolute top-1 right-1 px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold" : "absolute top-3 right-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-base rounded-lg font-bold"} transition-all duration-200 hover:scale-105 active:scale-95`}
              style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              type="button"
            >Đóng</button>
            <div className={mobileShrink ? "text-[11px] font-bold text-blue-300 mb-1 text-center" : "text-xl font-bold text-blue-300 mb-3 text-center"}>
              Luật thi đấu phòng
            </div>
            <div
              className={mobileShrink ? "text-[9px] text-white flex-1 overflow-y-auto pr-1" : "text-base text-white flex-1 overflow-y-auto pr-2"}
              style={mobileShrink ? { maxHeight: 160 } : { maxHeight: 380 }}
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
        <div className="relative w-full flex items-center justify-center mb-1">
          {/* Overlay dưới tên phòng */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: mobileShrink ? 'auto' : 'auto',
            minWidth: mobileShrink ? '120px' : '200px',
            maxWidth: mobileShrink ? '200px' : '300px',
            height: mobileShrink ? 24 : 40,
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 12,
            zIndex: 0,
            padding: mobileShrink ? '0 8px' : '0 16px'
          }} />
          <h2 className={mobileShrink ? "text-[14px] font-bold mb-1 relative z-10" : "text-3xl font-bold mb-2 relative z-10"}>
            Phòng: <span className="text-blue-400">{roomId}</span>
          </h2>
        </div>
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
            (mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-1 m-0 min-w-[120px] max-w-[180px] w-[150px] flex-shrink-0 ml-0 mb-1"
              : isMobileLandscape
                ? "bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white rounded-xl p-0 m-0 min-w-[180px] max-w-[260px] w-[220px] flex-shrink-0 ml-0 mb-2"
                : "bg-gray-900 bg-opacity-90 shadow-lg text-xs font-semibold text-white rounded-xl p-0 m-0 min-w-[260px] max-w-[340px] w-[300px] flex-shrink-0 ml-4")
            + " transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
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
              ? "flex flex-col items-center justify-center min-w-[140px] max-w-[200px] mx-auto mb-1 w-auto"
              : isMobileLandscape
                ? "flex flex-col items-center justify-center min-w-[140px] max-w-[200px] mx-auto mb-2 w-auto"
                : "flex flex-col items-center justify-center min-w-[260px] max-w-[520px] mx-auto w-auto"
          }
          style={mobileShrink ? { wordBreak: 'break-word', fontSize: 9 } : isMobileLandscape ? { wordBreak: 'break-word' } : {}}
        >
          {/* Overlay dưới thanh trạng thái */}
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: mobileShrink ? 28 : 48,
              background: 'rgba(0,0,0,0.35)',
              borderRadius: 12,
              zIndex: 0
            }} />
            <div className="mb-2 w-full flex items-center justify-center" style={{ position: 'relative', zIndex: 1 }}>
              {waiting ? (
                <span className={mobileShrink ? "text-yellow-400 text-[10px] font-semibold text-center w-full block" : "text-yellow-400 text-2xl font-semibold text-center w-full block"}>Đang chờ đối thủ vào phòng...</span>
              ) : (
                <span className={mobileShrink ? "text-green-400 text-[10px] font-semibold text-center w-full block" : "text-green-400 text-2xl font-semibold text-center w-full block"}>Đã đủ 2 người, sẵn sàng thi đấu!</span>
              )}
            </div>
          </div>
          {/* Thông báo trạng thái lượt giải + Thông báo lỗi camera */}
          <div className="mb-3 relative w-full flex flex-col items-center justify-center text-center" style={{ position: 'relative' }}>
            {/* Overlay dưới thông báo trạng thái lượt giải */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: mobileShrink ? 38 : 60,
              background: 'rgba(0,0,0,0.32)',
              borderRadius: 12,
              zIndex: 0
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
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
                    return <span className={mobileShrink ? "text-[10px] font-semibold text-yellow-400" : "text-2xl font-semibold text-yellow-400"}>Trận đấu kết thúc, hòa</span>;
                  } else if (myAo5 === null) {
                    winner = opponentName;
                  } else if (oppAo5 === null) {
                    winner = userName;
                  } else if (myAo5 < oppAo5) {
                    winner = userName;
                  } else if (myAo5 > oppAo5) {
                    winner = opponentName;
                  } else {
                    return <span className="text-2xl font-semibold text-yellow-400">Trận đấu kết thúc, hòa</span>;
                  }
                    return <span className={mobileShrink ? "text-[10px] font-semibold text-green-400" : "text-2xl font-semibold text-green-400"}>Trận đấu kết thúc, {winner} thắng</span>;
                }
                // Đang trong trận
                let msg = "";
                let name = userId === turnUserId ? userName : opponentName;
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
                      <span className={mobileShrink ? "text-[10px] font-semibold text-yellow-300 block mt-1" : "text-2xl font-semibold text-yellow-300 block mt-2"}>
                        Hai cuber hãy tráo scramble
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Bảng kết quả bên phải */}
        <div
          className={
            (mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-1 m-0 min-w-[120px] max-w-[180px] w-[150px] flex-shrink-0 mr-0 mb-1"
              : isMobileLandscape
                ? "bg-gray-900 bg-opacity-90 shadow-lg rounded-xl p-0 m-0 min-w-[180px] max-w-[260px] w-[220px] flex-shrink-0 mr-0 mb-2"
                : "bg-gray-900 bg-opacity-90 shadow-lg rounded-xl p-0 m-0 min-w-[260px] max-w-[340px] w-[300px] flex-shrink-0 mr-4")
            + " transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
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
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }}
            />
            {/* Overlay che webcam local khi camOn=false, pointerEvents none để không che nút */}
            {!camOn && (
              <div style={{ position: 'absolute', inset: 0, background: '#111', opacity: 0.95, borderRadius: 'inherit', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: mobileShrink ? 12 : 24 }}>Đã tắt camera</span>
              </div>
            )}
            {/* Overlay thông báo khi chưa đủ 2 người */}
            {waiting && (
              <div style={{ position: 'absolute', inset: 0, background: '#111', opacity: 0.85, borderRadius: 'inherit', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: mobileShrink ? 11 : 20, textAlign: 'center' }}>Camera của bạn sẽ hiện khi đối thủ vào</span>
              </div>
            )}
            <button
              className={mobileShrink ? `absolute bottom-0.5 left-0.5 px-0.5 py-0.5 rounded text-[8px] ${camOn ? 'bg-gray-700' : 'bg-red-600'}` : `absolute bottom-3 left-3 px-3 py-1 rounded text-base ${camOn ? 'bg-gray-700' : 'bg-red-600'}`}
              style={mobileShrink ? { minWidth: 0, minHeight: 0, pointerEvents: 'auto', zIndex: 4 } : { pointerEvents: 'auto', zIndex: 4 }}
              onClick={() => {
                setCamOn(v => {
                  const newVal = !v;
                  // Gửi trạng thái camOn mới cho đối thủ qua socket, kèm userName
                  const socket = getSocket();
                  socket.emit('user-cam-toggle', { roomId, userId, camOn: newVal, userName });
                  return newVal;
                });
              }}
              type="button"
            >{camOn ? 'Tắt cam' : 'Bật cam'}</button>
          </div>
          {/* Dãy thành phần dưới webcam của bạn */}
          <div style={{
            marginTop: 6,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: mobileShrink ? 2 : 8,
            justifyContent: 'center',
            width: '100%'
          }}>
            {/* Median */}
            <div style={{
              background: '#23272b',
              color: '#ccc',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: mobileShrink ? 13 : 18,
              padding: mobileShrink ? '2px 4px' : '4px 12px',
              minWidth: mobileShrink ? 40 : 48,
              maxWidth: mobileShrink ? 55 : 70,
              textAlign: 'center',
              border: '2px solid #222',
              marginRight: mobileShrink ? 2 : 6,
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#aaa', fontWeight: 400, lineHeight: 1}}>MEDIAN</div>
              <div style={{fontSize: mobileShrink ? 11 : 18}}>{(() => {
                if (myResults.length > 0) {
                  const stats = calcStats(myResults);
                  if (stats && typeof stats.mean === 'number' && !isNaN(stats.mean)) return (stats.mean/1000).toFixed(2);
                }
                return '-';
              })()}</div>
            </div>
            {/* Timer */}
            <div style={{
              background: '#181c22',
              borderRadius: 8,
              border: '2px solid #222',
              minWidth: 60,
              minHeight: 28,
              maxWidth: 120,
              textAlign: 'center',
              fontSize: mobileShrink ? 18 : 24,
              color: dnf ? '#e53935' : '#ff3b1d',
              fontWeight: 700,
              letterSpacing: 1,
              boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
              padding: '2px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}>
              {prep ? (
                <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 13 : 16 }}>Chuẩn bị: {prepTime}s</span>
              ) : dnf ? (
                <span style={{ color: '#e53935', fontWeight: 700 }}>DNF</span>
              ) : (
                <>
                  <span style={{ fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace" }}>{(timer/1000).toFixed(2)}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                </>
              )}
            </div>
            {/* Tên người chơi */}
            <div style={{
              background: '#fff',
              color: '#222',
              borderRadius: 4,
              fontWeight: 700,
              fontSize: mobileShrink ? 'clamp(10px, 4vw, 15px)' : 'clamp(14px, 2vw, 22px)',
              padding: mobileShrink ? '2px 8px' : '4px 18px',
              minWidth: 60,
              maxWidth: mobileShrink ? 90 : 180,
              textAlign: 'center',
              border: '2px solid #bbb',
              marginLeft: mobileShrink ? 2 : 6,
              marginRight: mobileShrink ? 2 : 6,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>{userName}</div>
            {/* Số set thắng */}
            <div style={{
              background: '#7c3aed',
              color: '#fff',
              borderRadius: 4,
              fontWeight: 700,
              fontSize: mobileShrink ? 13 : 18,
              padding: mobileShrink ? '2px 4px' : '4px 12px',
              minWidth: mobileShrink ? 28 : 32,
              maxWidth: mobileShrink ? 50 : 60,
              textAlign: 'center',
              border: '2px solid #5b21b6',
              marginLeft: mobileShrink ? 2 : 6,
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#e0e7ff', fontWeight: 400, lineHeight: 1}}>SETS</div>
              <div style={{fontSize: mobileShrink ? 11 : 18}}>{mySets}</div>
            </div>
          </div>
        </div>
        {/* Timer ở giữa - cột 2 */}
        <div
          className={mobileShrink ? "flex flex-col items-center justify-center timer-area" : "flex flex-col items-center justify-center timer-area"}
          style={mobileShrink ? { flex: '0 1 20%', minWidth: 120, maxWidth: 200 } : { flex: '0 1 20%', minWidth: 180, maxWidth: 320 }}
        {...(isMobile ? {
            onTouchStart: (e) => {
              if (pendingResult !== null) return;
              if (isTypingMode) return; // Chặn touch khi đang ở chế độ typing
              // Nếu chạm vào webcam thì bỏ qua
              const webcamEls = document.querySelectorAll('.webcam-area');
              for (let i = 0; i < webcamEls.length; i++) {
                if (webcamEls[i].contains(e.target as Node)) return;
              }
              if (waiting || myResults.length >= 5) return;
              // Đánh dấu touch bắt đầu
              pressStartRef.current = Date.now();
              setSpaceHeld(true); // Đang giữ tay
            },
            onTouchEnd: (e) => {
              if (pendingResult !== null) return;
              if (isTypingMode) return; // Chặn touch khi đang ở chế độ typing
              // Nếu chạm vào webcam thì bỏ qua
              const webcamEls = document.querySelectorAll('.webcam-area');
              for (let i = 0; i < webcamEls.length; i++) {
                if (webcamEls[i].contains(e.target as Node)) return;
              }
              if (waiting || myResults.length >= 5) return;
              const now = Date.now();
              const start = pressStartRef.current;
              pressStartRef.current = null;
              setSpaceHeld(false); // Thả tay
              // 1. Tap and release to enter prep
              if (!prep && !running && userId === turnUserId) {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
                // Gửi timer-prep event
                const socket = getSocket();
                socket.emit("timer-prep", { roomId, userId, remaining: 15 });
                return;
              }
              // 2. In prep, giữ >=0.5s rồi thả ra để start timer
              if (prep && !running) {
                if (start && now - start >= 150) {
                  setPrep(false);
                  setCanStart(true);
                  // Timer sẽ được start trong useEffect của canStart
                }
                return;
              }
              // 3. When running, tap and release to stop timer
              if (running) {
                setRunning(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                // Gửi timer-update event
                const socket = getSocket();
                socket.emit("timer-update", { roomId, userId, ms: timerRef.current, running: false, finished: false });
                setPendingResult(timerRef.current);
                setPendingType('normal');
                setCanStart(false);
                return;
              }
            }
          } : {
            onClick: () => {
              if (waiting || myResults.length >= 5 || pendingResult !== null) return;
              if (isTypingMode) return; // Chặn click khi đang ở chế độ typing
              if (!prep && !running && userId === turnUserId) {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
                // Gửi timer-prep event
                const socket = getSocket();
                socket.emit("timer-prep", { roomId, userId, remaining: 15 });
              } else if (prep && !running) {
                setPrep(false);
                setCanStart(true);
                // Timer sẽ được start trong useEffect của canStart
              } else if (canStart && !running) {
                setRunning(true);
                setTimer(0);
                timerRef.current = 0;
                // Gửi timer-update event
                const socket = getSocket();
                socket.emit("timer-update", { roomId, userId, ms: 0, running: true, finished: false });
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
                // Gửi timer-update event
                const socket = getSocket();
                socket.emit("timer-update", { roomId, userId, ms: timerRef.current, running: false, finished: false });
                setPendingResult(timerRef.current);
                setPendingType('normal');
                setCanStart(false);
              }
            }
          })}
        >
          
          {/* Nếu có pendingResult thì hiện 3 nút xác nhận sau 1s */}
          {pendingResult !== null && !running && !prep && showConfirmButtons ? (
            <div className="flex flex-row items-center justify-center gap-2 mb-2">
              <button
                className={`${mobileShrink ? "px-2 py-1 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 font-bold text-white" : "px-5 py-2 text-xl rounded-2xl bg-green-600 hover:bg-green-700 font-bold text-white"} transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg result-button`}
                onClick={e => {
                  e.stopPropagation();
                  // Gửi kết quả bình thường
                  let result: number|null = pendingResult;
                  if (pendingType === '+2' && result !== null) result = result + 2000;
                  if (pendingType === 'dnf') result = null;
                  
                  // Gửi timer-update event cuối cùng
                  const socket = getSocket();
                  socket.emit("timer-update", { roomId, userId, ms: result === null ? 0 : result, running: false, finished: true });
                  
                  setMyResults(r => {
                    const newR = [...r, result];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userId, userName, time: result === null ? null : result });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >Gửi</button>
              <button
                className={`${mobileShrink ? `px-2 py-1 text-[13px] rounded-lg bg-yellow-500 font-bold text-white` : `px-5 py-2 text-xl rounded-2xl bg-yellow-500 font-bold text-white`} transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg result-button`}
                onClick={e => {
                  e.stopPropagation();
                  // Gửi kết quả +2 ngay
                  let result: number|null = pendingResult;
                  if (result !== null) result = result + 2000;
                  
                  // Gửi timer-update event cuối cùng
                  const socket = getSocket();
                  socket.emit("timer-update", { roomId, userId, ms: result, running: false, finished: true });
                  
                  setMyResults(r => {
                    const newR = [...r, result];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userId, userName, time: result });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >+2</button>
              <button
                className={`${mobileShrink ? `px-2 py-1 text-[13px] rounded-lg bg-red-600 font-bold text-white` : `px-5 py-2 text-xl rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-white`} transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg result-button`}
                onClick={e => {
                  e.stopPropagation();
                  // Gửi kết quả DNF ngay
                  
                  // Gửi timer-update event cuối cùng
                  const socket = getSocket();
                  socket.emit("timer-update", { roomId, userId, ms: 0, running: false, finished: true });
                  
                  setMyResults(r => {
                    const newR = [...r, null];
                    const socket = getSocket();
                    socket.emit("solve", { roomId, userId, userName, time: null });
                    return newR;
                  });
                  setPendingResult(null);
                  setPendingType('normal');
                  // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >DNF</button>
            </div>
          ) : null}


          {/* Nút Xuất kết quả và Tái đấu sau khi trận đấu kết thúc */}
          {myResults.length >= 5 && opponentResults.length >= 5 && (
            <div className="flex flex-row items-center justify-center gap-2 mb-2">
              <button
                className={`${mobileShrink ? "px-2 py-1 text-[10px] rounded bg-blue-600 hover:bg-blue-700 font-bold text-white" : "px-4 py-2 text-base rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white"} transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg result-button`}
                onClick={() => {
                  // Lấy ngày và thời gian hiện tại
                  const now = new Date();
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
                  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

                  // Tính toán thống kê
                  const myStats = calcStats(myResults);
                  const oppStats = calcStats(opponentResults);

                  // Xác định người thắng
                  let winner = '';
                  if (myStats.ao5 !== null && oppStats.ao5 !== null) {
                    if (myStats.ao5 < oppStats.ao5) winner = userName;
                    else if (myStats.ao5 > oppStats.ao5) winner = opponentName;
                    else winner = 'Hòa';
                  } else if (myStats.ao5 !== null) winner = userName;
                  else if (oppStats.ao5 !== null) winner = opponentName;
                  else winner = 'Không xác định';

                  // Tạo nội dung file txt theo mẫu
                  let txt = '';
                  txt += `KẾT QUẢ THI ĐẤU RUBIK'S CUBE\n`;
                  txt += `Phòng: ${roomId}\n`;
                  if (roomMeta?.event) {
                    txt += `Thể loại: ${roomMeta.event}\n`;
                  }
                  txt += `Ngày: ${dateStr}\n`;
                  txt += `Thời gian: ${timeStr}\n`;
                  txt += `\n`;

                  // Thêm scramble đã dùng cho 5 lượt
                  if (Array.isArray(scrambles) && scrambles.length >= 5) {
                    txt += `SCRAMBLE ĐÃ SỬ DỤNG:\n`;
                    for (let i = 0; i < 5; i++) {
                      txt += `  Lượt ${i+1}: ${scrambles[i] || ''}\n`;
                    }
                    txt += `\n`;
                  }

                  // Người chơi 1
                  txt += `NGƯỜI CHƠI 1: ${userName}\n`;
                  txt += `Kết quả từng lượt:\n`;
                  for (let i = 0; i < 5; i++) {
                    const val = (myResults && myResults[i] !== undefined) ? myResults[i] : null;
                    txt += `  Lượt ${i+1}: ${val === null ? 'DNF' : (typeof val === 'number' ? (val/1000).toFixed(2) : '')}\n`;
                  }
                  txt += `Thống kê:\n`;
                  txt += `  Best: ${myStats.best !== null ? (myStats.best/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `  Worst: ${myStats.worst !== null ? (myStats.worst/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `  Mean: ${myStats.mean !== null ? (myStats.mean/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `  Ao5: ${myStats.ao5 !== null ? (myStats.ao5/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `\n`;

                  // Người chơi 2
                  txt += `NGƯỜI CHƠI 2: ${opponentName}\n`;
                  txt += `Kết quả từng lượt:\n`;
                  for (let i = 0; i < 5; i++) {
                    const val = (opponentResults && opponentResults[i] !== undefined) ? opponentResults[i] : null;
                    txt += `  Lượt ${i+1}: ${val === null ? 'DNF' : (typeof val === 'number' ? (val/1000).toFixed(2) : '')}\n`;
                  }
                  txt += `Thống kê:\n`;
                  txt += `  Best: ${oppStats.best !== null ? (oppStats.best/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `  Worst: ${oppStats.worst !== null ? (oppStats.worst/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `  Mean: ${oppStats.mean !== null ? (oppStats.mean/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `  Ao5: ${oppStats.ao5 !== null ? (oppStats.ao5/1000).toFixed(2) : 'DNF'}\n`;
                  txt += `\n`;

                  // Kết quả cuối cùng
                  txt += `KẾT QUẢ CUỐI CÙNG:\n`;
                  txt += `Người thắng: ${winner}\n`;

                  // Tạo file và tải về
                  const blob = new Blob([txt], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ketqua_${roomId}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }, 100);
                }}
                style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              >Xuất kết quả</button>

            </div>
          )}
          {/* Chế độ typing: hiện trường nhập thời gian */}
          {isTypingMode ? (
            <div className="flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleTypingSubmit} className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={typingInput}
                  onChange={handleTypingInputChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  placeholder="Nhập thời gian (VD: 1234 = 12.34s)"
                  className={`${mobileShrink ? "px-3 py-2 text-lg" : "px-4 py-3 text-2xl"} bg-gray-800 text-white border-2 border-blue-500 rounded-lg focus:outline-none focus:border-blue-400 text-center font-mono`}
                  style={{ 
                    width: mobileShrink ? '200px' : '280px',
                    fontSize: mobileShrink ? '16px' : '24px'
                  }}
                  maxLength={5}
                  autoFocus
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  className={`${mobileShrink ? "px-4 py-2 text-sm" : "px-6 py-3 text-lg"} bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all duration-200 hover:scale-105 active:scale-95`}
                >
                  Gửi kết quả
                </button>
              </form>
              <div className={`${mobileShrink ? "text-xs" : "text-sm"} text-gray-400 mt-2 text-center`}>
                Để trống = DNF, Enter để gửi
              </div>
            </div>
          ) : (
            /* Chế độ timer: hiện timer bình thường */
            <>
              <div
                className={
                  mobileShrink
                    ? `text-3xl font-bold drop-shadow select-none px-3 py-3 rounded-xl ${prep ? (spaceHeld ? 'text-green-400' : 'text-red-400') : running ? 'text-yellow-300' : dnf ? 'text-red-400' : 'text-yellow-300'}`
                    : `text-9xl font-['Digital-7'] font-bold drop-shadow-2xl select-none px-12 py-8 rounded-3xl ${prep ? (spaceHeld ? 'text-green-400' : 'text-red-400') : running ? 'text-yellow-300' : dnf ? 'text-red-400' : 'text-yellow-300'}`
                }
                style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: 40, textAlign: 'center', fontSize: 40, padding: 6 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: '220px', textAlign: 'center', fontSize: 110, padding: 18 }}
              >
                {prep ? (
                  <span className={mobileShrink ? "text-[20px]" : undefined}>Chuẩn bị: {prepTime}s</span>
                ) : dnf ? (
                  <span className={mobileShrink ? "text-[20px] text-red-400" : "text-red-400"}>DNF</span>
                ) : (
                  <>
                    <span style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 32 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 80 }}>{(timer/1000).toFixed(2)}</span>
                    <span className={mobileShrink ? "ml-1 align-bottom" : "ml-2 align-bottom"} style={mobileShrink ? { fontFamily: 'font-mono', fontWeight: 400, fontSize: 12, lineHeight: 1 } : { fontFamily: 'font-mono', fontWeight: 400, fontSize: 5, lineHeight: 1 }}>s</span>
                  </>
                )}
              </div>
              {running && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím bất kỳ để dừng</div>}
              {prep && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím Space để bắt đầu</div>}
            </>
          )}

          {/* Hiển thị trạng thái timer/chuẩn bị của đối thủ */}
          {opponentPrep && (
            <span className={mobileShrink ? "text-[10px] font-semibold text-yellow-400 block mt-1" : "text-xl font-semibold text-yellow-400 block mt-2"}>
              Đối thủ đang chuẩn bị: {opponentPrepTime}s
            </span>
          )}
          {opponentRunning && (
            <span className={mobileShrink ? "text-[10px] font-semibold text-red-400 block mt-1" : "text-xl font-semibold text-red-400 block mt-2"}>
              Timer đối thủ: {(opponentTimer/1000).toFixed(2)}s
            </span>
          )}
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
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', background: '#111', display: 'block' }}
            />
            {/* Overlay che webcam remote khi opponentCamOn=false (tức đối thủ đã tắt cam), hiện tên đối thủ */}
            {!opponentCamOn && (
              <div style={{ position: 'absolute', inset: 0, background: '#111', opacity: 0.95, borderRadius: 'inherit', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: mobileShrink ? 12 : 24 }}>{opponentName} đang tắt cam</span>
              </div>
            )}
          </div>
          {/* Dãy thành phần dưới webcam đối thủ */}
          <div style={{
            marginTop: 6,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: mobileShrink ? 2 : 8,
            justifyContent: 'center',
            width: '100%'
          }}>
            {/* Median */}
            <div style={{
              background: '#23272b',
              color: '#ccc',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: mobileShrink ? 13 : 18,
              padding: mobileShrink ? '2px 4px' : '4px 12px',
              minWidth: mobileShrink ? 40 : 48,
              maxWidth: mobileShrink ? 55 : 70,
              textAlign: 'center',
              border: '2px solid #222',
              marginRight: mobileShrink ? 2 : 6,
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#aaa', fontWeight: 400, lineHeight: 1}}>MEDIAN</div>
              <div style={{fontSize: mobileShrink ? 11 : 18}}>{(() => {
                if (opponentResults.length > 0) {
                  const stats = calcStats(opponentResults);
                  if (stats && typeof stats.mean === 'number' && !isNaN(stats.mean)) return (stats.mean/1000).toFixed(2);
                }
                return '-';
              })()}</div>
            </div>
            {/* Timer */}
            <div style={{
              background: '#181c22',
              borderRadius: 8,
              border: '2px solid #222',
              minWidth: 60,
              minHeight: 28,
              maxWidth: 120,
              textAlign: 'center',
              fontSize: mobileShrink ? 18 : 24,
              color: '#ff3b1d',
              fontWeight: 700,
              letterSpacing: 1,
              boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
              padding: '2px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace"
            }}>
              {opponentPrep ? (
                <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 13 : 16, fontFamily: 'inherit' }}>Chuẩn bị: {opponentPrepTime}s</span>
              ) : (
                <>
                  <span style={{ fontFamily: 'inherit' }}>{(opponentTimer/1000).toFixed(2)}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                </>
              )}
            </div>
            {/* Tên đối thủ */}
            <div style={{
              background: '#fff',
              color: '#222',
              borderRadius: 4,
              fontWeight: 700,
              fontSize: mobileShrink ? 'clamp(10px, 4vw, 15px)' : 'clamp(14px, 2vw, 22px)',
              padding: mobileShrink ? '2px 8px' : '4px 18px',
              minWidth: 60,
              maxWidth: mobileShrink ? 90 : 180,
              textAlign: 'center',
              border: '2px solid #bbb',
              marginLeft: mobileShrink ? 2 : 6,
              marginRight: mobileShrink ? 2 : 6,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>{opponentName}</div>
            {/* Số set thắng */}
            <div style={{
              background: '#7c3aed',
              color: '#fff',
              borderRadius: 4,
              fontWeight: 700,
              fontSize: mobileShrink ? 13 : 18,
              padding: mobileShrink ? '2px 4px' : '4px 12px',
              minWidth: mobileShrink ? 28 : 32,
              maxWidth: mobileShrink ? 50 : 60,
              textAlign: 'center',
              border: '2px solid #5b21b6',
              marginLeft: mobileShrink ? 2 : 6,
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#e0e7ff', fontWeight: 400, lineHeight: 1}}>SETS</div>
              <div style={{fontSize: mobileShrink ? 11 : 18}}>{opponentSets}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mount VideoCall (Stringee) sau webcam row để quản lý stream */}
      {roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0 ? (
        <VideoCall
          key={roomUrl}
          roomUrl={roomUrl}
          camOn={camOn}
          micOn={micOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
        />
      ) : null}

      {/* CSS cho hiệu ứng modal và các nút */}
      <style jsx global>{`
        .modal-backdrop {
          animation: fadeIn 0.3s ease-out;
        }
        
        .modal-content {
          animation: slideIn 0.3s ease-out;
          transform-origin: center;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Hiệu ứng hover cho các nút trong modal */
        .modal-content button {
          transition: all 0.2s ease;
        }
        
        .modal-content button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        /* Hiệu ứng cho backdrop khi click */
        .modal-backdrop:active {
          background-color: rgba(0, 0, 0, 0.1);
        }
        
        /* Đảm bảo modal content có shadow đủ mạnh để nổi bật trên backdrop trong suốt */
        .modal-content {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        /* Hiệu ứng cho tất cả các nút trong giao diện */
        button {
          transition: all 0.2s ease;
        }
        
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        button:active {
          transform: translateY(0) scale(0.98);
        }
        
        /* Hiệu ứng đặc biệt cho các nút chức năng chính */
        .function-button {
          transition: all 0.3s ease;
        }
        
        .function-button:hover {
          transform: scale(1.1) rotate(2deg);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        
        /* Hiệu ứng cho các nút xác nhận kết quả */
        .result-button {
          transition: all 0.25s ease;
        }
        
        .result-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        
        /* Hiệu ứng cho các nút trong modal */
        .modal-content button:not([class*="transition"]) {
          transition: all 0.2s ease;
        }
        
        .modal-content button:not([class*="transition"]):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        /* Hiệu ứng cho tin nhắn mới nhất */
        .chat-message.new-message {
          animation: newMessagePop 0.6s ease-out;
        }
        
        @keyframes newMessagePop {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Hiệu ứng đặc biệt cho tin nhắn của mình */
        .chat-message:has(.bg-blue-500) .chat-bubble {
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        /* Hiệu ứng đặc biệt cho tin nhắn của đối phương */
        .chat-message:has(.bg-gray-700) .chat-bubble {
          box-shadow: 0 2px 8px rgba(55, 65, 81, 0.3);
        }
        
        /* Tùy chỉnh thanh cuộn cho chat */
        .chat-message:first-child {
          margin-top: 0;
        }
        
        .chat-message:last-child {
          margin-bottom: 0;
        }
        
        /* Tùy chỉnh thanh cuộn */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
        
        /* Đảm bảo form nhập liệu sát mép dưới */
        .modal-content form {
          margin-top: 0;
          padding-top: 0;
        }
      `}</style>
    </div>
  );
}

// Dynamic import cho VideoCall tránh lỗi SSR, không cần generic
const VideoCall = dynamic(() => import('@/components/VideoCall'), { ssr: false });