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
import { applyScrambleToCubeState, rotateFace, rotateFace2x2, getSolvedCubeState, Face, CubeState, PyraminxState } from '@/lib/rubikUtils';
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


const SCRAMBLE_LOCK_DURATION_MS = 15000;
const CHAT_MODAL_ANIMATION_MS = 150;



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
    fetch(`/api/room-meta/${roomId.toUpperCase()}`)
      .then(res => {
        if (!res.ok) {
          console.error('[Fetch meta phòng] Không lấy được meta phòng, status:', res.status);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && (data.displayName || data.event)) setRoomMeta(data);
      });
  }, [roomId, joinedRoom]);
  const [showCubeNet, setShowCubeNet] = useState(false);
  // State cho chat
  const [showChat, setShowChat] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatModalPhase, setChatModalPhase] = useState<'enter' | 'exit'>('exit');
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{from: 'me'|'opponent', text: string, userName: string}[]>([]);
  const [hasNewChat, setHasNewChat] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const chatModalAnimRef = useRef<NodeJS.Timeout | null>(null);
  const loadingVideoRef = useRef<HTMLVideoElement|null>(null);
  const [forceMuted, setForceMuted] = useState(false);

  // Ref cho video local và remote để truyền vào VideoCall
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Trạng thái thông báo tráo scramble
  const [showScrambleMsg, setShowScrambleMsg] = useState<boolean>(false);
  // Trạng thái thông báo kết thúc sớm - ĐÃ HỦY
  const [showEarlyEndMsg, setShowEarlyEndMsg] = useState<{ show: boolean; message: string; type: 'win' | 'lose' | 'draw' }>({ show: false, message: '', type: 'draw' });
  // State để khóa thao tác khi có 2 lần DNF
  const [isLockedDue2DNF, setIsLockedDue2DNF] = useState<boolean>(false);
  // State để hiển thị modal thông báo khóa DNF
  const [showLockedDNFModal, setShowLockedDNFModal] = useState<boolean>(false);
  // State để lưu trữ thông tin khóa DNF từ server
  const [lockDNFInfo, setLockDNFInfo] = useState<{
    myDnfCount: number;
    oppDnfCount: number;
    lockedByUserId: string;
  } | null>(null);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);
  // State theo dõi trạng thái toàn màn hình
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Ref để lưu timeout đăng nhập
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref để lưu userName hiện tại
  const userNameRef = useRef<string>("");
  const [camOn, setCamOn] = useState<boolean>(true);
  const [opponentCamOn, setOpponentCamOn] = useState<boolean>(true);
  const [micOn, setMicOn] = useState<boolean>(true);
  const [opponentMicOn, setOpponentMicOn] = useState<boolean>(true);
  // Đã loại bỏ các ref và state liên quan đến Stringee và mediaStream, chỉ giữ lại state cho Daily.co và socket
 
  // (Đã di chuyển khai báo roomId lên đầu)
  const [scramble, setScramble] = useState<string>("");
  const [scrambleIndex, setScrambleIndex] = useState<number>(0);
  const [scrambles, setScrambles] = useState<string[]>([]); // Lưu 5 scramble đã dùng
  const [timer, setTimer] = useState<number>(0);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [prep, setPrep] = useState<boolean>(false);
  const [prepTime, setPrepTime] = useState<number>(15);
  // Ref lưu thời điểm bắt đầu nhấn Space hoặc chạm (dùng cho cả desktop và mobile)
  const pressStartRef = useRef<number | null>(null);
  const [canStart, setCanStart] = useState<boolean>(false);
  const [spaceHeld, setSpaceHeld] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [users, setUsers] = useState<string[]>([]); // userId array
  const usersRef = useRef<string[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [opponentId, setOpponentId] = useState<string>("");
  const [waiting, setWaiting] = useState<boolean>(true);
  // turnUserId: userId của người được quyền giải (đồng bộ từ server)
  const [turnUserId, setTurnUserId] = useState<string>("");
  const [myResults, setMyResults] = useState<(number|null)[]>([]);
  const myResultsRef = useRef<(number|null)[]>([]);
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
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Thêm khai báo biến roomUrl đúng chuẩn
  const [roomUrl, setRoomUrl] = useState<string>('');

  const runningStateRef = useRef(running);
  const prepStateRef = useRef(prep);
  const canStartRef = useRef(canStart);
  const pendingResultRef = useRef<number|null>(pendingResult);
  const spaceHeldRef = useRef(spaceHeld);

   // State cho tái đấu
  const [rematchModal, setRematchModal] = useState<{show: boolean, from: 'me'|'opponent'|null}>({show: false, from: null});
  const [rematchPending, setRematchPending] = useState(false); // Đang chờ đối phương đồng ý
  const [rematchDeclined, setRematchDeclined] = useState(false); // Đối phương đã từ chối
  const [rematchJustAccepted, setRematchJustAccepted] = useState(false);
  const [isRematchMode, setIsRematchMode] = useState(false); // State để theo dõi xem có đang ở chế độ tái đấu không

  const clearReadyTimeout = React.useCallback(() => {
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
  }, []);

  const scheduleReadyState = React.useCallback(() => {
    clearReadyTimeout();
    setReady(false);
    readyTimeoutRef.current = setTimeout(() => {
      setReady(true);
    }, 300);
  }, [clearReadyTimeout]);

  useEffect(() => {
    return () => {
      clearReadyTimeout();
    };
  }, [clearReadyTimeout]);



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
  const scrollChatToBottom = React.useCallback(() => {
    if (!chatListRef.current) return;
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    myResultsRef.current = myResults;
  }, [myResults]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    runningStateRef.current = running;
  }, [running]);

  useEffect(() => {
    prepStateRef.current = prep;
  }, [prep]);

  useEffect(() => {
    canStartRef.current = canStart;
  }, [canStart]);

  useEffect(() => {
    pendingResultRef.current = pendingResult;
  }, [pendingResult]);

  useEffect(() => {
    spaceHeldRef.current = spaceHeld;
  }, [spaceHeld]);

  // Auto-scroll xuống cuối khi mở chat hoặc có tin nhắn mới
  useEffect(() => {
    if (!showChat || !chatModalVisible) return;
    const rafId = window.requestAnimationFrame(() => {
      scrollChatToBottom();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [showChat, chatModalVisible, chatMessages, scrollChatToBottom]);

  useEffect(() => {
    if (showChat) {
      if (chatModalAnimRef.current) {
        clearTimeout(chatModalAnimRef.current);
        chatModalAnimRef.current = null;
      }
      setChatModalVisible(true);
      requestAnimationFrame(() => setChatModalPhase('enter'));
      return;
    }

    if (chatModalVisible) {
      setChatModalPhase('exit');
      chatModalAnimRef.current = setTimeout(() => {
        setChatModalVisible(false);
        chatModalAnimRef.current = null;
      }, CHAT_MODAL_ANIMATION_MS);
    }
  }, [showChat]);

  useEffect(() => {
    return () => {
      if (chatModalAnimRef.current) {
        clearTimeout(chatModalAnimRef.current);
        chatModalAnimRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (pendingResult !== null && !running && !prep) {
      setShowConfirmButtons(false);
      const timer = setTimeout(() => setShowConfirmButtons(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowConfirmButtons(false);
    }
  }, [pendingResult, running, prep]);
  // Lắng nghe danh sách users và hostId từ server
  

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

  // Reset SETS khi có sự thay đổi người dùng (ra/vào phòng) - không reset khi tái đấu
  useEffect(() => {
    if (!userId || !pendingUsers) return;
    const opp = pendingUsers.find(u => u.userId !== userId);
    if (opp) {
      setOpponentId(opp.userId);
      setOpponentName(opp.userName || 'Đối thủ');
    } else {
      setOpponentId("");
      setOpponentName('Đối thủ');
    }
    
    // Chỉ reset SETS khi thực sự có người mới vào phòng (không phải khi tái đấu)
    // Kiểm tra xem có phải đang tái đấu không
    if (!isRematchMode) {
      // Reset số set thắng khi danh sách user thay đổi
      setMySets(0);
      setOpponentSets(0);
      
      // Reset sự kiện 2 lần DNF khi có người mới vào phòng
      setIsLockedDue2DNF(false);
      // setShowLockedDNFModal(false); // ĐÃ HỦY
      setLockDNFInfo(null);
    }
  }, [userId, pendingUsers, isRematchMode]);



  // State cho timer và chuẩn bị của đối thủ
  const [opponentPrep, setOpponentPrep] = useState(false);
  const [opponentPrepTime, setOpponentPrepTime] = useState(15);
  const [opponentRunning, setOpponentRunning] = useState(false);
  const [opponentTimer, setOpponentTimer] = useState(0);
  const opponentTimerRef = useRef(0);
  const opponentPrepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  const opponentIntervalRef = useRef<NodeJS.Timeout|null>(null);

  const resetOpponentTimerState = React.useCallback(() => {
    if (opponentPrepIntervalRef.current) {
      clearInterval(opponentPrepIntervalRef.current);
      opponentPrepIntervalRef.current = null;
    }
    if (opponentIntervalRef.current) {
      clearInterval(opponentIntervalRef.current);
      opponentIntervalRef.current = null;
    }
    setOpponentPrep(false);
    setOpponentPrepTime(15);
    setOpponentRunning(false);
    setOpponentTimer(0);
    opponentTimerRef.current = 0;
  }, []);

  const resetMySolveState = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (prepIntervalRef.current) {
      clearInterval(prepIntervalRef.current);
      prepIntervalRef.current = null;
    }
    clearReadyTimeout();
    timerRef.current = 0;
    startTimeRef.current = 0;
    pressStartRef.current = null;
    setRunning(false);
    setPrep(false);
    setPrepTime(15);
    setCanStart(false);
    setSpaceHeld(false);
    setReady(false);
    setTimer(0);
    setPendingResult(null);
    setPendingType('normal');
    setDnf(false);
    setShowConfirmButtons(false);
    setOpponentTime(null);
    setShowScrambleMsg(false);
  }, [clearReadyTimeout]);

  const broadcastTimerReset = React.useCallback(() => {
    if (!roomId || !userId) return;
    const socket = getSocket();
    socket.emit("timer-update", {
      roomId,
      userId,
      ms: 0,
      running: false,
      finished: false,
      forceReset: true,
    });
  }, [roomId, userId]);

  const stopSolveAndBroadcast = React.useCallback(() => {
    resetMySolveState();
    broadcastTimerReset();
  }, [resetMySolveState, broadcastTimerReset]);

  useEffect(() => {
    const socket = getSocket();
    const handleUsers = (data: { users: { userId: string, userName: string }[], hostId: string }) => {
      const incomingUsers = Array.isArray(data.users) ? data.users : [];
      const newUserIds = incomingUsers.map(u => u.userId);
      const previousUserIds = usersRef.current;
      const playerCountDropped = newUserIds.length < previousUserIds.length;
      const stillInRoom = userId ? newUserIds.includes(userId) : false;

      setUsers(newUserIds);
      setWaiting(newUserIds.length < 2);
      setPendingUsers(incomingUsers);

      if (userId && data.hostId) {
        setIsCreator(userId === data.hostId);
      } else {
        setIsCreator(false);
      }

      if (newUserIds.length === 1) {
        setIsRematchMode(false);
      }

      if (newUserIds.length !== previousUserIds.length) {
        setIsLockedDue2DNF(false);
        setLockDNFInfo(null);
      }

      if (playerCountDropped) {
        resetOpponentTimerState();
        if (stillInRoom) {
          const wasSolving = prepStateRef.current || runningStateRef.current || canStartRef.current || pendingResultRef.current !== null || spaceHeldRef.current;
          if (wasSolving) {
            stopSolveAndBroadcast();
          }
        }
      }

      usersRef.current = newUserIds;
    };
    socket.on('room-users', handleUsers);
    return () => {
      socket.off('room-users', handleUsers);
    };
  }, [userId, resetOpponentTimerState, stopSolveAndBroadcast]);

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
  type TimerPayload = { roomId: string; userId: string; ms: number; running: boolean; finished: boolean; forceReset?: boolean };
    let lastOpponentUpdate = Date.now();
    const handleOpponentTimer = ({ roomId: rid, userId: uid, ms, running, finished, forceReset }: TimerPayload) => {
      if (rid !== roomId || uid === userId) return;
      
      if (running) {
        // Khi đối thủ bắt đầu timer, tắt chuẩn bị và bắt đầu timer
        setOpponentPrep(false);
        setOpponentPrepTime(15);
        if (opponentPrepIntervalRef.current) clearInterval(opponentPrepIntervalRef.current);
        
        setOpponentRunning(true);
        setOpponentTimer(ms);
        opponentTimerRef.current = ms;
        lastOpponentUpdate = performance.now();
        
        // Bắt đầu interval để tăng timer dựa trên thời gian thực tế
        if (opponentIntervalRef.current) clearInterval(opponentIntervalRef.current);
        opponentIntervalRef.current = setInterval(() => {
          const now = performance.now();
          const elapsed = now - lastOpponentUpdate;
          setOpponentTimer(ms + Math.round(elapsed));
        }, 30);
      } else {
        // Khi đối thủ dừng timer
        setOpponentRunning(false);
        setOpponentTimer(ms);
        opponentTimerRef.current = ms;
        if (opponentIntervalRef.current) clearInterval(opponentIntervalRef.current);
        if (forceReset) {
          resetOpponentTimerState();
        }
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
  }, [roomId, userId, resetOpponentTimerState]);



// --- Pyraminx Components ---
// PyraminxTriangle component - Tam giác hướng lên với cấu trúc 1-3-5
interface PyraminxTriangleProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt F
}

function PyraminxTriangle({ faceSize = 80, faceArray = [] }: PyraminxTriangleProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác
  const point1 = { x: triangleWidth/2, y: 0 };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 4: góc trái dưới
  const point4 = { x: 0, y: triangleHeight };
  
  // Điểm 5: 1/3 từ trái trên cạnh dưới
  const point5 = { x: triangleWidth/3, y: triangleHeight };
  
  // Điểm 6: 2/3 từ trái trên cạnh dưới
  const point6 = { x: 2*triangleWidth/3, y: triangleHeight };
  
  // Điểm 7: góc phải dưới
  const point7 = { x: triangleWidth, y: triangleHeight };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: 2*triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},0 0,${triangleHeight} ${triangleWidth},${triangleHeight}`}
        fill="#4caf50"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ mảng faceArray */}
      {/* Cấu trúc 1-3-5: Hàng 1 có 1 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 5 tam giác */}
      
      {/* Hàng 1: 1 tam giác (số 0) - đỉnh trên cùng */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[0] || '#4caf50'}
        stroke="none"
      />
      
      {/* Hàng 2: 3 tam giác (số 1, 2, 3) - từ trái sang phải */}
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#4caf50'}
        stroke="none"
      />
      
      {/* Hàng 3: 5 tam giác (số 4, 5, 6, 7, 8) - từ trái sang phải */}
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[4] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#4caf50'}
        stroke="none"
      />
      
      
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#4caf50'}
        stroke="none"
      />
      
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[8] || '#4caf50'}
        stroke="none"
      />
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// PyraminxTriangleDown component - Tam giác hướng xuống với cấu trúc 1-3-5
interface PyraminxTriangleDownProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt D
}

function PyraminxTriangleDown({ faceSize = 80, faceArray = [] }: PyraminxTriangleDownProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác (hướng xuống)
  const point1 = { x: triangleWidth/2, y: triangleHeight };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 4: góc trái trên
  const point4 = { x: 0, y: 0 };
  
  // Điểm 5: 1/3 từ trái trên cạnh trên
  const point5 = { x: triangleWidth/3, y: 0 };
  
  // Điểm 6: 2/3 từ trái trên cạnh trên
  const point6 = { x: 2*triangleWidth/3, y: 0 };
  
  // Điểm 7: góc phải trên
  const point7 = { x: triangleWidth, y: 0 };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},${triangleHeight} 0,0 ${triangleWidth},0`}
        fill="#ffeb3b"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ mảng faceArray */}
      {/* Cấu trúc 5-3-1: Hàng 1 có 5 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 1 tam giác */}
      
      {/* Hàng 1: 5 tam giác (số 8, 7, 6, 5, 4) - đáy tam giác - từ trái sang phải */}
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[4] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[8] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Hàng 2: 3 tam giác (số 3, 2, 1) - từ trái sang phải */}
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#ffeb3b'}
        stroke="none"
      />
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#ffeb3b'}
        stroke="none"
      />
      
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#ffeb3b'}
        stroke="none"
      />
     
      
      {/* Hàng 3: 1 tam giác (số 0) - đỉnh dưới cùng */}
      {/* Tam giác 0: 1-2-9 */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[0] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// PyraminxTriangleLeft component - Tam giác hướng xuống màu đỏ bên trái
interface PyraminxTriangleLeftProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt L
}

function PyraminxTriangleLeft({ faceSize = 80, faceArray = [] }: PyraminxTriangleLeftProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác (hướng xuống)
  const point1 = { x: triangleWidth/2, y: triangleHeight };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 4: góc trái trên
  const point4 = { x: 0, y: 0 };
  
  // Điểm 5: 1/3 từ trái trên cạnh trên
  const point5 = { x: triangleWidth/3, y: 0 };
  
  // Điểm 6: 2/3 từ trái trên cạnh trên
  const point6 = { x: 2*triangleWidth/3, y: 0 };
  
  // Điểm 7: góc phải trên
  const point7 = { x: triangleWidth, y: 0 };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},${triangleHeight} 0,0 ${triangleWidth},0`}
        fill="#f44336"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ faceArray */}
      {/* Cấu trúc 1-3-5: Hàng 1 có 1 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 5 tam giác */}
      
      {/* Hàng 1: 5 tam giác (số 4, 5, 1, 2, 0) - đáy tam giác - từ trái sang phải */}
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[4] || '#f44336'}
        stroke="none"
      />
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 0: 1-2-9 */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[8] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Hàng 2: 3 tam giác (số 6, 7, 3) - từ trái sang phải */}
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#f44336'}
        stroke="none"
      />
      
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#f44336'}
        stroke="none"
      />
      
      {/* Hàng 3: 1 tam giác (số 8) - đỉnh dưới cùng */}
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[0] || '#f44336'}
        stroke="none"
      />
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// PyraminxTriangleRight component - Tam giác hướng xuống màu xanh biển bên phải
interface PyraminxTriangleRightProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt R
}

function PyraminxTriangleRight({ faceSize = 80, faceArray = [] }: PyraminxTriangleRightProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác (hướng xuống)
  const point1 = { x: triangleWidth/2, y: triangleHeight };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 4: góc trái trên
  const point4 = { x: 0, y: 0 };
  
  // Điểm 5: 1/3 từ trái trên cạnh trên
  const point5 = { x: triangleWidth/3, y: 0 };
  
  // Điểm 6: 2/3 từ trái trên cạnh trên
  const point6 = { x: 2*triangleWidth/3, y: 0 };
  
  // Điểm 7: góc phải trên
  const point7 = { x: triangleWidth, y: 0 };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},${triangleHeight} 0,0 ${triangleWidth},0`}
        fill="#2196f3"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ faceArray */}
      {/* Cấu trúc 1-3-5: Hàng 1 có 1 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 5 tam giác */}
      
      {/* Hàng 1: 5 tam giác (số 0, 2, 3, 7, 8) - đáy tam giác - từ trái sang phải */}
      {/* Tam giác 0: 1-2-9 */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[4] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[8] || '#2196f3'}
        stroke="none"
      />
      
      {/* Hàng 2: 3 tam giác (số 1, 5, 6) - từ trái sang phải */}
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#2196f3'}
        stroke="none"
      />
      
      {/* Hàng 3: 1 tam giác (số 4) - đỉnh dưới cùng */}
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[0] || '#2196f3'}
        stroke="none"
      />
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// PyraminxNet component - Hiển thị 4 mặt Pyraminx
interface PyraminxNetProps {
  faceArray?: string[]; // Mảng 9 phần tử cho mặt F
}

function PyraminxNet({ faceArray = [] }: PyraminxNetProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hàng trên: 2 tam giác hướng xuống + 1 tam giác hướng lên */}
      <div className="flex items-center gap-1">
        {/* Tam giác đỏ bên trái (mặt L) - dịch sang phải */}
        <div style={{ marginRight: '-35px' }}>
          <PyraminxTriangleLeft faceSize={80} faceArray={faceArray} />
        </div>
        {/* Tam giác xanh lá giữa (mặt F) */}
        <PyraminxTriangle faceSize={80} faceArray={faceArray} />
        {/* Tam giác xanh biển bên phải (mặt R) - dịch sang trái */}
        <div style={{ marginLeft: '-35px' }}>
          <PyraminxTriangleRight faceSize={80} faceArray={faceArray} />
        </div>
      </div>
      {/* Hàng dưới: 1 tam giác hướng xuống */}
      <div className="flex justify-center">
        {/* Tam giác vàng dưới (mặt D) */}
        <PyraminxTriangleDown faceSize={80} faceArray={faceArray} />
      </div>
    </div>
  );
}

// --- CubeNetModal component and scramble logic ---
type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
type CubeState = Record<Face, string[]>;


interface CubeNetModalProps {
  scramble: string;
  open: boolean;
  onClose: () => void;
  size: number | string; // 2, 3, 4, hoặc 'pyraminx'
  mobileShrink?: boolean;
}


function CubeNetModal({ scramble, open, onClose, size, mobileShrink }: CubeNetModalProps) {
  const [cubeState, setCubeState] = useState<CubeState>(() => applyScrambleToCubeState(scramble || '', size));
  const [isCompactNet, setIsCompactNet] = useState(false);

  useEffect(() => {
    setCubeState(applyScrambleToCubeState(scramble || '', size));
  }, [scramble, size]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computeIsCompact = () => {
      const visualWidth = window.visualViewport?.width ?? window.innerWidth;
      const docWidth = document.documentElement?.clientWidth ?? visualWidth;
      const screenWidth = window.screen?.width ?? visualWidth;
      const effectiveWidth = Math.min(visualWidth, docWidth, screenWidth);
      setIsCompactNet(effectiveWidth < 768);
    };

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setIsCompactNet(event.matches);
    };

    computeIsCompact();
    window.addEventListener('resize', computeIsCompact);
    window.addEventListener('orientationchange', computeIsCompact);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener('resize', computeIsCompact);
      window.removeEventListener('orientationchange', computeIsCompact);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const compactNet = mobileShrink ? true : isCompactNet;
  const faceSize = compactNet ? 44 : 72;
  // layoutGrid cho 2x2 và 3x3 giống nhau về vị trí, chỉ khác số sticker mỗi mặt
  const layoutGrid: (Face | '')[][] = [
    ['', 'U', '', ''],
    ['L', 'F', 'R', 'B'],
    ['', 'D', '', ''],
  ];
  function renderStickers(faceKey: Face) {
    if (size === 2) {
      // 2x2: 4 sticker
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 4).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    } else if (size === 4) {
      // 4x4: 16 sticker
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 16).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    } else if (size === 'pyraminx') {
      // Pyraminx: hiển thị lưới 4 mặt Pyraminx
      return <PyraminxNet faceArray={cubeState[faceKey] || []} />;
    } else {
      // 3x3: 9 sticker (default)
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 9).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    }
  }
  if (!open) return null;

  const scrambleText = scramble || 'Chưa có scramble.';
  const tone: AuroraTone = size === 'pyraminx' ? 'amber' : 'emerald';

  return (
    <AuroraModalBackdrop open={open}>
      <div className="relative w-full max-w-4xl px-2 sm:px-4">
        <div className="relative">
          <AuroraModalCard
            compact={compactNet}
            tone={tone}
            badge="Lưới scramble"
            title={size === 'pyraminx' ? 'Lưới Pyraminx' : `Lưới ${typeof size === 'number' ? `${size}x${size}` : ''}`}
            maxWidthClass={compactNet ? "max-w-[78vw] sm:max-w-xl" : "max-w-2xl"}
            icon={(
              <svg
                viewBox="0 0 48 48"
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6h36v36H6z" />
                <path d="M6 18h36" />
                <path d="M6 30h36" />
                <path d="M18 6v36" />
                <path d="M30 6v36" />
              </svg>
            )}
          >
            <button
              onClick={onClose}
              className={`absolute right-4 top-4 rounded-full bg-red-500/95 text-white font-semibold shadow-md shadow-red-500/40 transition hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 ${compactNet ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'}`}
              type="button"
              aria-label="Đóng lưới"
            >
              ✕
            </button>
            <div className="relative w-full flex flex-col gap-4">
              <div className="rounded-[26px] border border-white/10 bg-slate-950/40 p-3 sm:p-5 shadow-inner overflow-auto">
                <div
                  className="mx-auto"
                  style={{
                    display: size === 'pyraminx' ? 'flex' : 'grid',
                    flexDirection: size === 'pyraminx' ? 'column' : undefined,
                    alignItems: size === 'pyraminx' ? 'center' : undefined,
                    justifyContent: size === 'pyraminx' ? 'center' : undefined,
                    gridTemplateColumns: size === 'pyraminx' ? undefined : `repeat(4, ${faceSize}px)`,
                    gridTemplateRows: size === 'pyraminx' ? undefined : `repeat(3, ${faceSize}px)`,
                    gap: size === 'pyraminx' ? (compactNet ? 4 : 8) : 4,
                  }}
                >
                  {size === 'pyraminx' ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <div style={{ marginRight: '-28px' }}>
                          <PyraminxTriangleLeft faceSize={compactNet ? 64 : 80} faceArray={cubeState.L || []} />
                        </div>
                        <PyraminxTriangle faceSize={compactNet ? 64 : 80} faceArray={cubeState.F || []} />
                        <div style={{ marginLeft: '-28px' }}>
                          <PyraminxTriangleRight faceSize={compactNet ? 64 : 80} faceArray={cubeState.R || []} />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <PyraminxTriangleDown faceSize={compactNet ? 64 : 80} faceArray={cubeState.D || []} />
                      </div>
                    </div>
                  ) : (
                    layoutGrid.flatMap((row, rowIdx) =>
                      row.map((faceKey, colIdx) => {
                        if (faceKey === '') {
                          return (
                            <div
                              key={`blank-${rowIdx}-${colIdx}`}
                              className="net-face-empty"
                              style={{ width: faceSize, height: faceSize }}
                            />
                          );
                        }
                        return (
                          <React.Fragment key={`${faceKey}-${rowIdx}-${colIdx}`}>
                            {renderStickers(faceKey as Face)}
                          </React.Fragment>
                        );
                      })
                    )
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.35em] text-blue-200/80">Scramble</div>
                <div className="mt-2 font-mono text-sm sm:text-base text-white break-words">
                  {scrambleText}
                </div>
              </div>
            </div>
          </AuroraModalCard>
        </div>
      </div>
    </AuroraModalBackdrop>
  );
}
// --- End CubeNetModal ---

type AuroraTone = "emerald" | "amber" | "rose" | "crimson";
type ModalTransitionStage = "enter" | "exit" | "idle";
const MODAL_TRANSITION_MS = 240;

const AURORA_TONE_MAP: Record<AuroraTone, {
  glow: string;
  gradient: string;
  iconBg: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
}> = {
  emerald: {
    glow: "bg-emerald-500/40",
    gradient: "from-emerald-400/15 via-emerald-300/5 to-transparent",
    iconBg: "from-emerald-500/30 via-emerald-400/20 to-emerald-500/10",
    chipBg: "bg-emerald-500/10",
    chipText: "text-emerald-100",
    chipBorder: "border-emerald-300/40",
  },
  amber: {
    glow: "bg-amber-400/40",
    gradient: "from-amber-300/20 via-amber-200/5 to-transparent",
    iconBg: "from-amber-400/30 via-amber-300/15 to-amber-500/10",
    chipBg: "bg-amber-400/10",
    chipText: "text-amber-100",
    chipBorder: "border-amber-200/40",
  },
  rose: {
    glow: "bg-rose-500/40",
    gradient: "from-rose-400/20 via-rose-300/10 to-transparent",
    iconBg: "from-rose-500/30 via-rose-400/15 to-rose-500/5",
    chipBg: "bg-rose-500/10",
    chipText: "text-rose-100",
    chipBorder: "border-rose-300/40",
  },
  crimson: {
    glow: "bg-red-500/40",
    gradient: "from-red-500/10 via-rose-500/5 to-transparent",
    iconBg: "from-red-500/30 via-rose-500/20 to-red-500/5",
    chipBg: "bg-red-500/15",
    chipText: "text-rose-50",
    chipBorder: "border-red-200/40",
  },
};

const useModalTransition = (open: boolean, duration = MODAL_TRANSITION_MS, disableAnimation = false) => {
  const [isMounted, setIsMounted] = useState(open);
  const [stage, setStage] = useState<ModalTransitionStage>(open ? "enter" : "idle");
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (disableAnimation) {
      setIsMounted(open);
      setStage("idle");
      prevOpenRef.current = open;
      return;
    }

    let timeout: NodeJS.Timeout | null = null;

    if (open) {
      setIsMounted(true);
      setStage("enter");
      timeout = setTimeout(() => setStage("idle"), duration);
    } else if (prevOpenRef.current) {
      setStage("exit");
      timeout = setTimeout(() => {
        setIsMounted(false);
        setStage("idle");
      }, duration);
    }

    prevOpenRef.current = open;

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [open, duration, disableAnimation]);

  return { isMounted, stage };
};

const AuroraModalBackdrop = ({ open, children, disableAnimation }: { open: boolean; children: React.ReactNode; disableAnimation?: boolean }) => {
  const { isMounted, stage } = useModalTransition(open, MODAL_TRANSITION_MS, disableAnimation);
  if (!isMounted) return null;

  const overlayClass = [
    "absolute inset-0 aurora-overlay",
    disableAnimation ? "" : stage === "enter" ? "aurora-overlay--enter" : "",
    disableAnimation ? "" : stage === "exit" ? "aurora-overlay--exit" : "",
  ].join(" ").trim();
  const cardWrapperClass = [
    "relative z-10 flex w-full max-w-3xl items-center justify-center px-4",
    disableAnimation ? "" : stage === "enter" ? "aurora-card-wrapper--enter" : "",
    disableAnimation ? "" : stage === "exit" ? "aurora-card-wrapper--exit" : "",
  ].join(" ").trim();

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center"
      data-no-motion={disableAnimation ? "true" : undefined}
    >
      <div className={overlayClass} />
      <div className={cardWrapperClass}>
        {children}
      </div>
    </div>
  );
};

interface AuroraModalCardProps {
  badge?: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: AuroraTone;
  compact?: boolean;
  children?: React.ReactNode;
  maxWidthClass?: string;
}

const AuroraModalCard: React.FC<AuroraModalCardProps> = ({
  badge,
  title,
  subtitle,
  description,
  icon,
  tone = "emerald",
  compact,
  children,
  maxWidthClass
}) => {
  const palette = AURORA_TONE_MAP[tone];
  const contentPadding = compact ? "gap-4 p-4" : "gap-5 p-5 sm:p-8";
  const iconBoxSize = compact ? "h-12 w-12" : "h-14 w-14";
  const badgeText = compact ? "text-[9px]" : "text-[11px]";
  const titleClass = compact ? "mt-1 text-lg font-semibold leading-snug" : "mt-2 text-xl font-semibold leading-tight sm:text-2xl";
  const subtitleClass = compact ? "text-xs text-slate-200/80" : "text-sm text-slate-200/90 sm:text-base";
  const descClass = compact ? "text-xs leading-relaxed text-slate-100/90" : "text-sm leading-relaxed text-slate-200/90 sm:text-base";
  const appliedWidthClass = maxWidthClass ?? (compact ? "max-w-xs" : "max-w-md");
  return (
    <div className={`relative w-full ${appliedWidthClass}`}>
      <div className={`absolute inset-0 blur-3xl opacity-80 pointer-events-none ${palette.glow}`} />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/85 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className={`absolute inset-0 bg-gradient-to-br ${palette.gradient}`} />
        <div className={`relative z-10 flex flex-col text-white ${contentPadding}`}>
          <div className="flex items-center gap-4">
            <div className={`flex ${iconBoxSize} items-center justify-center rounded-2xl bg-gradient-to-br ${palette.iconBg}`}>
              <span className={compact ? "text-xl" : "text-3xl"}>{icon ?? "♻️"}</span>
            </div>
            <div className="flex-1">
              {badge && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${badgeText} font-semibold uppercase tracking-[0.2em] ${palette.chipBg} ${palette.chipText} ${palette.chipBorder}`}>
                  {badge}
                </span>
              )}
              <h3 className={titleClass}>{title}</h3>
              {subtitle && <p className={subtitleClass}>{subtitle}</p>}
            </div>
          </div>
          {description && (
            <p className={descClass}>
              {description}
            </p>
          )}
          {children && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
  // Xác định loại cube dựa vào roomMeta.event, dùng useMemo để luôn cập nhật đúng
  const cubeSize = React.useMemo(() => {
    if (roomMeta && typeof roomMeta.event === 'string') {
      if (roomMeta.event.includes('2x2')) return 2;
      if (roomMeta.event.includes('4x4')) return 4;
      if (roomMeta.event.includes('pyraminx')) return 'pyraminx';
    }
    return 3; // default 3x3
  }, [roomMeta]);


// Lắng nghe sự kiện reset phòng từ server (khi chỉ còn 1 người)
useEffect(() => {
  const socket = getSocket();
  const handleRoomReset = () => {
    resetMySolveState();
    resetOpponentTimerState();
    setMyResults([]);
    setOpponentResults([]);
    setScramble("");
    setScrambleIndex(0);
    setScrambles([]);
    setOpponentId("");
    setOpponentName("Đối thủ");
    setRoomUrl("");
    setRematchPending(false);
    setRematchModal({ show: false, from: null });
    setRematchDeclined(false);
    
    // Reset sự kiện 2 lần DNF khi reset phòng
    setIsLockedDue2DNF(false);
    // setShowLockedDNFModal(false); // ĐÃ HỦY
    setLockDNFInfo(null);
  // Không cần setTurn, lượt sẽ do server broadcast qua turnUserId
  };
  socket.on('room-reset', handleRoomReset);
  return () => {
    socket.off('room-reset', handleRoomReset);
  };
}, [roomId, resetMySolveState, resetOpponentTimerState]);

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
    setIsRematchMode(true); // Bật chế độ tái đấu
    // Mở khóa thao tác khi tái đấu
    setIsLockedDue2DNF(false);
    // setShowLockedDNFModal(false); // ĐÃ HỦY
    // setShowEarlyEndMsg({ show: false, message: '', type: 'draw' }); // ĐÃ HỦY
    // Reset thông tin khóa DNF
    setLockDNFInfo(null);
    
    // GỬI SỰ KIỆN MỞ KHÓA LÊN SERVER để server broadcast cho cả hai bên
    const socket = getSocket();
    socket.emit('unlock-due-rematch', { roomId });
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
  }, [roomId]);

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
    }, SCRAMBLE_LOCK_DURATION_MS);
    // Nếu vừa tái đấu xong thì reset cờ
    setRematchJustAccepted(false);
    // Reset thông báo kết thúc sớm khi có scramble mới - ĐÃ HỦY
    // setShowEarlyEndMsg({ show: false, message: '', type: 'draw' });
    
    // QUAN TRỌNG: Logic reset modal khóa DNF
    // - Nếu KHÔNG bị khóa: reset showLockedDNFModal = false
    // - Nếu ĐANG bị khóa do 2 lần DNF: giữ nguyên showLockedDNFModal = true
    // Lý do: Khi bị khóa do 2 lần DNF, modal phải hiển thị mãi mãi cho đến khi tái đấu
    if (!isLockedDue2DNF) {
      // setShowLockedDNFModal(false); // ĐÃ HỦY
    } else {
      // KHÔNG BAO GIỜ reset showLockedDNFModal khi đang bị khóa
      // Modal chỉ được đóng khi tái đấu hoặc khi người dùng đóng thủ công
    }
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
    if (controlsLockedByOpponent) return;
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
      const senderName = data.userName?.trim() ? data.userName : 'Đối thủ';
      setChatMessages(msgs => [...msgs, { from: 'opponent', text: data.message, userName: senderName }]);
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
  // Lắng nghe sự kiện khóa do 2 lần DNF từ server
  useEffect(() => {
    const socket = getSocket();
    const handleLockDue2DNF = (data: { 
      roomId: string, 
      myDnfCount: number, 
      oppDnfCount: number,
      myResults: (number|null)[],
      opponentResults: (number|null)[],
      lockedByUserId: string // userId của người gửi sự kiện
    }) => {
      // Khóa thao tác cho cả hai bên
      setIsLockedDue2DNF(true);
      // Hiển thị modal thông báo khóa DNF - ĐÃ HỦY
      // setShowLockedDNFModal(true);
      
      // Lưu thông tin khóa DNF từ server để hiển thị chính xác
      setLockDNFInfo({
        myDnfCount: data.myDnfCount,
        oppDnfCount: data.oppDnfCount,
        lockedByUserId: data.lockedByUserId
      });
      
      // KHÔNG CẬP NHẬT KẾT QUẢ TỪ SERVER - TRÁNH XÁO TRỘN
      // Mỗi client sẽ tự tính toán dựa trên kết quả local
    };
    
    const handleUnlockDueRematch = (data: { roomId: string }) => {
      // Mở khóa thao tác cho cả hai bên
      setIsLockedDue2DNF(false);
      // setShowLockedDNFModal(false); // ĐÃ HỦY
      // setShowEarlyEndMsg({ show: false, message: '', type: 'draw' }); // ĐÃ HỦY
      // Reset thông tin khóa DNF
      setLockDNFInfo(null);
    };
    
    socket.on('lock-due-2dnf', handleLockDue2DNF);
    socket.on('unlock-due-rematch', handleUnlockDueRematch);
    return () => {
      socket.off('lock-due-2dnf', handleLockDue2DNF);
      socket.off('unlock-due-rematch', handleUnlockDueRematch);
    };
  }, [roomId]);

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
    if (users.length < 2 || isLockedDue2DNF || userId !== turnUserId) return; // Chỉ hoạt động khi đủ 2 người, không bị khóa và đến lượt mình
    setIsTypingMode(!isTypingMode);
    setTypingInput("");
  }

  // Hàm xử lý nhập thời gian
  function handleTypingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (users.length < 2 || isLockedDue2DNF || userId !== turnUserId) return;
    
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

  // Socket listener cho mic toggle
  useEffect(() => {
    const socket = getSocket();
    
    const handleMicToggle = (data: { userId: string; micOn: boolean; userName: string }) => {
      if (data.userId !== userId) {
        // Chỉ cập nhật state nếu không phải từ chính mình
        setOpponentMicOn(data.micOn);
      }
    };

    socket.on('user-mic-toggle', handleMicToggle);

    return () => {
      socket.off('user-mic-toggle', handleMicToggle);
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
            const resolvedId = typeof data.user._id === 'string' ? data.user._id : String(data.user._id);
            setUserId(resolvedId);
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
      // Điều chỉnh logic mobile landscape để phù hợp với điện thoại hiện đại
      setIsMobileLandscape(mobile && !portrait && window.innerWidth < 1200);
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

  // Tự động yêu cầu chế độ toàn màn hình khi sử dụng điện thoại
  useEffect(() => {
    if (typeof window !== 'undefined' && isMobile) {
      let interval: ReturnType<typeof setInterval> | undefined;

      function requestFullscreen() {
        try {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
          } else if ((document.documentElement as any).webkitRequestFullscreen) {
            (document.documentElement as any).webkitRequestFullscreen();
          } else if ((document.documentElement as any).mozRequestFullScreen) {
            (document.documentElement as any).mozRequestFullScreen();
          } else if ((document.documentElement as any).msRequestFullscreen) {
            (document.documentElement as any).msRequestFullscreen();
          }
        } catch (error) {
          // Không thể chuyển sang chế độ toàn màn hình
        }
      }

      function startInterval() {
        if (!isFullscreen && !interval) {
          interval = setInterval(() => {
            if (isMobile && !isFullscreen) {
              requestFullscreen();
            } else if (interval) {
              clearInterval(interval);
              interval = undefined;
            }
          }, 3000);
        }
      }

      function checkFullscreenStatus() {
        const fullscreenElement =
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement;

        const wasFullscreen = isFullscreen;
        setIsFullscreen(!!fullscreenElement);

        if (fullscreenElement && !wasFullscreen) {
          if (interval) {
            clearInterval(interval);
            interval = undefined;
          }
        } else if (!fullscreenElement && wasFullscreen && isMobile) {
          startInterval();
          requestFullscreen();
        } else if (!fullscreenElement && isMobile) {
          requestFullscreen();
        }
      }

      checkFullscreenStatus();

      const fullscreenChangeEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      fullscreenChangeEvents.forEach(event => {
        document.addEventListener(event, checkFullscreenStatus);
      });

      const initialTimeout = setTimeout(requestFullscreen, 1000);
      startInterval();

      return () => {
        clearTimeout(initialTimeout);
        if (interval) {
          clearInterval(interval);
        }
        fullscreenChangeEvents.forEach(event => {
          document.removeEventListener(event, checkFullscreenStatus);
        });
      };
    }
  }, [isMobile, isFullscreen]);

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
    socket.emit("join-room", { roomId, userId, userName, event, displayName, password, gameMode: '1vs1' });
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

  // Nhận scramble từ server qua socket, hiện thông báo tráo scramble trong thời gian khóa
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
  setReady(false);
      setTimer(0);
      setDnf(false);
      setPendingResult(null);
      setPendingType('normal');
  clearReadyTimeout();
      setShowScrambleMsg(true); // Hiện thông báo tráo scramble
      if (scrambleMsgTimeout) clearTimeout(scrambleMsgTimeout);
      scrambleMsgTimeout = setTimeout(() => {
        setShowScrambleMsg(false);
      }, SCRAMBLE_LOCK_DURATION_MS);
    };
    socket.on("scramble", handleScramble);
    return () => {
      socket.off("scramble", handleScramble);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
      if (scrambleMsgTimeout) clearTimeout(scrambleMsgTimeout);
    };
  }, [roomId, clearReadyTimeout]);
  // Ẩn thông báo tráo scramble khi có người bắt đầu giải (bắt đầu chuẩn bị hoặc chạy)
  useEffect(() => {
    if (prep || running) {
      setShowScrambleMsg(false);
    }
  }, [prep, running]);


  // Desktop: Nhấn Space để vào chuẩn bị, giữ >=300ms rồi thả ra để bắt đầu chạy
  useEffect(() => {
    if (isMobile) return;
    if (showScrambleMsg) return; // Tạm khóa timer trong thời gian tráo scramble
    // Chỉ cho phép nếu đến lượt mình (userId === turnUserId) và không bị khóa do 2 lần DNF
    if (waiting || running || userId !== turnUserId || myResults.length >= 5 || pendingResult !== null || isLockedDue2DNF) return;
    let localSpaceHeld = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (pendingResult !== null) return;
      if (isTypingMode) return; // Chặn phím space khi đang ở chế độ typing
      if (showScrambleMsg) return; // Chờ hết thời gian tráo scramble
      
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
          scheduleReadyState();
        }
      } else if (!prep && !running) {
        setPrep(true);
        setPrepTime(15);
        setDnf(false);
        pressStartRef.current = Date.now();
        localSpaceHeld = true;
        setSpaceHeld(true);
        scheduleReadyState();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (showScrambleMsg) return;
      clearReadyTimeout();
      setReady(false);
      if (prep && localSpaceHeld) {
        const now = Date.now();
        const start = pressStartRef.current;
        pressStartRef.current = null;
        localSpaceHeld = false;
        setSpaceHeld(false);
  if (start && now - start >= 300) {
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
  }, [isMobile, waiting, running, prep, userId, turnUserId, myResults.length, isLockedDue2DNF, pendingResult, isTypingMode, showScrambleMsg, scheduleReadyState, clearReadyTimeout]);

  // Mobile: Tap anywhere (trừ vùng webcam) để vào chuẩn bị, giữ >=300ms trong prep để bắt đầu
  useEffect(() => {
    if (!isMobile) return;
    if (running) return;
    if (showScrambleMsg) return; // Tạm khóa thao tác cảm ứng trong thời gian tráo scramble

    const isInWebcamArea = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      const webcamEls = document.querySelectorAll('.webcam-area');
      for (let i = 0; i < webcamEls.length; i++) {
        if (webcamEls[i].contains(target)) return true;
      }
      return false;
    };

    const resetHoldState = () => {
      pressStartRef.current = null;
      clearReadyTimeout();
      setReady(false);
      setSpaceHeld(false);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (running) return;
      if (pendingResult !== null || isLockedDue2DNF) return;
      if (isTypingMode) return;
      if (showScrambleMsg) return;
      if (userId !== turnUserId) return;
      if (waiting) return;
      if (e.touches.length > 1) return;
      if (isInWebcamArea(e.target)) return;
      if (myResultsRef.current.length >= 5) return;
  pressStartRef.current = Date.now();
  setSpaceHeld(true);
  scheduleReadyState();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (running) return;
      if (e.touches.length > 0) {
        resetHoldState();
        return;
      }
      if (showScrambleMsg) {
        resetHoldState();
        return;
      }
      if (isInWebcamArea(e.target)) {
        resetHoldState();
        return;
      }
      if (isTypingMode) {
        resetHoldState();
        return;
      }
      if (pendingResult !== null || isLockedDue2DNF) {
        resetHoldState();
        return;
      }
      if (waiting || myResultsRef.current.length >= 5) {
        resetHoldState();
        return;
      }

      const start = pressStartRef.current;
      const holdDuration = start ? Date.now() - start : 0;
      resetHoldState();

      if (userId !== turnUserId) return;

      if (!prep) {
        setPrep(true);
        setPrepTime(15);
        setDnf(false);
        const socket = getSocket();
        socket.emit("timer-prep", { roomId, userId, remaining: 15 });
        return;
      }

      if (prep && holdDuration >= 300) {
        setPrep(false);
        setCanStart(true);
      }
    };

    const handleTouchCancel = () => {
      resetHoldState();
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      resetHoldState();
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isMobile, running, waiting, prep, pendingResult, isLockedDue2DNF, isTypingMode, roomId, userId, turnUserId, showScrambleMsg, scheduleReadyState, clearReadyTimeout]);

      // Đếm ngược 15s chuẩn bị
  useEffect(() => {
    if (!prep || waiting || isLockedDue2DNF || userId !== turnUserId) return;
    setCanStart(false);
    setSpaceHeld(false);
    setReady(false);
    clearReadyTimeout();
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
          setReady(false);
          clearReadyTimeout();
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
  }, [prep, waiting, roomId, userId, isLockedDue2DNF, clearReadyTimeout]);

  useEffect(() => {
    if (!prep) {
      clearReadyTimeout();
      setReady(false);
    }
  }, [prep, clearReadyTimeout]);


  // Khi canStart=true, bắt đầu timer, dừng khi bấm phím bất kỳ (desktop, không nhận chuột) hoặc chạm (mobile)
  useEffect(() => {
    if (!canStart || waiting || isLockedDue2DNF || userId !== turnUserId) return;
    clearReadyTimeout();
    setReady(false);
    setRunning(true);
    setTimer(0);
    timerRef.current = 0;
    startTimeRef.current = performance.now(); // Lưu thời gian bắt đầu chính xác
    
    // Gửi timer-update event để đối thủ biết mình bắt đầu timer
    const socket = getSocket();
    socket.emit("timer-update", { roomId, userId, ms: 0, running: true, finished: false });
    
    // Sử dụng hybrid approach: requestAnimationFrame cho UI + setTimeout cho độ chính xác
    let animationId: number;
    let timeoutId: NodeJS.Timeout;
    
    const updateTimer = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const newTime = Math.round(elapsed); // Làm tròn để có số nguyên
      setTimer(newTime);
      timerRef.current = newTime;
      
      animationId = requestAnimationFrame(updateTimer);
    };
    
    const preciseUpdate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const newTime = Math.round(elapsed);
      setTimer(newTime);
      timerRef.current = newTime;
      
      timeoutId = setTimeout(preciseUpdate, 10); // Cập nhật mỗi 10ms
    };
    
    // Bắt đầu cả hai
    animationId = requestAnimationFrame(updateTimer);
    timeoutId = setTimeout(preciseUpdate, 10);
    // Khi dừng timer, chỉ lưu vào pendingResult, không gửi lên server ngay
    const stopTimer = () => {
      setRunning(false);
      cancelAnimationFrame(animationId); // Dừng animation loop
      clearTimeout(timeoutId); // Dừng timeout loop
      
      // Lấy thời gian chính xác từ performance.now()
      const currentTime = Math.round(performance.now() - startTimeRef.current);
      
      // Cập nhật timer hiển thị để đảm bảo đồng bộ
      setTimer(currentTime);
      timerRef.current = currentTime;
      
      // Gửi timer-update event để đối thủ biết mình dừng timer
      socket.emit("timer-update", { roomId, userId, ms: currentTime, running: false, finished: false });
      
      setPendingResult(currentTime);
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
      // Dừng animation loop khi component unmount
      if (typeof animationId !== 'undefined') {
        cancelAnimationFrame(animationId);
      }
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
      if (isMobile) {
        window.removeEventListener('touchstart', handleTouch);
      } else {
        window.removeEventListener("keydown", handleAnyKey);
        window.removeEventListener("mousedown", handleMouse, true);
      }
    };
    // eslint-disable-next-line
  }, [canStart, waiting, roomId, userName, isMobile, isLockedDue2DNF, clearReadyTimeout, userId, turnUserId]);

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
  
  // Kiểm tra điều kiện kết thúc sớm khi có 2 lần DNF
  const myDnfCount = myResults.filter(r => r === null).length;
  const oppDnfCount = opponentResults.filter(r => r === null).length;
  
  // Chỉ kiểm tra khi cả 2 đều xong lượt giải đó (totalSolves chẵn)
  if (totalSolves % 2 === 0 && (myDnfCount >= 2 || oppDnfCount >= 2)) {
    // KHÓA THAO TÁC CHO CẢ HAI BÊN khi có người bị 2 lần DNF
    // Lý do: Khi trận đấu kết thúc sớm, cả hai bên đều không thể tiếp tục
    setIsLockedDue2DNF(true);
    
    // GỬI SỰ KIỆN LÊN SERVER để server broadcast modal cho cả hai bên
    const socket = getSocket();
    socket.emit('lock-due-2dnf', { 
      roomId, 
      myDnfCount, 
      oppDnfCount
      // KHÔNG GỬI myResults và opponentResults để tránh xáo trộn
    });
    
    if (myDnfCount >= 2 && oppDnfCount >= 2) {
      // Cả hai đều có 2 lần DNF -> Hòa
      setShowEarlyEndMsg({ show: false, message: '', type: 'draw' }); // ĐÃ HỦY - KHÔNG HIỆN MODAL
      // Không tăng set cho ai cả
    } else if (myDnfCount >= 2) {
      // Mình có 2 lần DNF -> Đối thủ thắng
      setOpponentSets(s => s + 1);
      // Hiển thị thông báo thua cho mình
      setShowEarlyEndMsg({ show: false, message: '', type: 'draw' }); // ĐÃ HỦY - KHÔNG HIỆN MODAL
    } else {
      // Đối thủ có 2 lần DNF -> Mình thắng
      setMySets(s => s + 1);
      // Hiển thị thông báo thắng cho mình
      setShowEarlyEndMsg({ show: false, message: '', type: 'draw' }); // ĐÃ HỦY - KHÔNG HIỆN MODAL
    }
    
    // Reset trạng thái cho vòng mới
    setPrep(false);
    setCanStart(false);
    setSpaceHeld(false);
    setTimer(0);
    setDnf(false);
    
    // KHÔNG cần yêu cầu scramble mới khi có 2 lần DNF
    // Lý do: 
    // 1. Trận đấu kết thúc sớm, không cần scramble mới
    // 2. Khi tái đấu, server sẽ tự động gửi scramble mới
    // 3. Tránh gọi server không cần thiết
    
    // KHÓA THAO TÁC MÃI MÃI - chỉ mở khóa khi tái đấu
    // Không cần setTimeout để mở khóa
    
    return; // Kết thúc sớm, không cần xử lý logic khác
  }
  
  // Chỉ xử lý reset khi cả 2 đều xong lượt giải
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
  setReady(false);
  clearReadyTimeout();
  setTimer(0);
  setDnf(false);
  // Chỉ đổi scramble khi tổng số lượt giải là số chẵn (sau mỗi vòng)
  if (totalSolves % 2 === 0 && totalSolves < 10) {
    // ...
  }
}, [myResults, opponentResults, roomId, clearReadyTimeout]);

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

  useEffect(() => {
    if (!showLoading || !loadingVideoRef.current) return;
    const video = loadingVideoRef.current;
    setForceMuted(false);
    video.muted = false;
    const playResult = video.play();
    if (playResult instanceof Promise) {
      playResult.catch(() => setForceMuted(true));
    }
  }, [showLoading]);

  useEffect(() => {
    if (!showLoading || !forceMuted || !loadingVideoRef.current) return;
    const video = loadingVideoRef.current;
    video.muted = true;
    video.play().catch(() => {});
  }, [forceMuted, showLoading]);

  // Effect để cập nhật userNameRef khi userName thay đổi
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // Effect riêng để kiểm tra timeout 15 giây cho đăng nhập
  useEffect(() => {
    loginTimeoutRef.current = setTimeout(() => {
      // Kiểm tra userName tại thời điểm timeout (15s sau)
      const currentUserName = userNameRef.current;
      if (!currentUserName) {
        window.location.href = 'https://rubik-app-buhb.vercel.app/';
      }
    }, 15000);

    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    };
  }, []); // Chỉ chạy một lần khi mount

  if (showLoading || !userName || !roomId) {
    // Thanh loading đơn giản phía dưới màn hình
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
        <video
          ref={loadingVideoRef}
          src="/loadingroom.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          onLoadedMetadata={e => { e.currentTarget.volume = 0.5; }}
        />
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
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-500/40 shadow-xl">
          <video
            src="/xoay.mp4"
            className="h-auto w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </div>
    );
  }



  
  // Helper: compact style for mobile landscape only
  const mobileShrink = isMobileLandscape;
  const modalActionClass = mobileShrink ? "px-3 py-2 text-sm" : "px-4 py-3 text-base";
  const modalInfoTextClass = mobileShrink ? "text-[11px]" : "text-sm";
  const showRematchRequest = rematchModal.show && rematchModal.from === 'opponent';
  const controlsLockedByOpponent = opponentRunning || opponentPrep;
  const timerColorClass = (() => {
    if (dnf) return 'text-red-400';
    if ((ready && !running) || running || canStart) return 'text-green-400';
    if (spaceHeld && !running) return 'text-yellow-400';
    return 'text-white';
  })(); // Màu timer đồng bộ với TimerTab: trắng -> vàng -> xanh
  const roomDisplayName = roomMeta?.displayName || roomId;
  const eventName = roomMeta?.event?.trim() ? roomMeta.event.trim() : null;
  const readyStatusText = waiting ? 'Đang chờ đối thủ vào phòng...' : 'Đã đủ 2 người, sẵn sàng thi đấu!';
  const readyStatusIcon = waiting ? '⏳' : '⚡';
  const readyStatusTone = waiting ? 'text-amber-200' : 'text-emerald-200';
  const scrambleLabel = typeof cubeSize === 'number'
    ? `${cubeSize}x${cubeSize}`
    : (cubeSize === 'pyraminx' ? 'Pyraminx' : 'Scramble');
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
          title={controlsLockedByOpponent ? "Đối thủ đang giải - bạn vẫn có thể rời phòng" : "Rời phòng"}
        >
          {/* Icon logout/exit SVG */}
          <span style={{fontSize: mobileShrink ? 18 : 28, display: 'block', lineHeight: 1}}>↩</span>
        </button>
      </div>
      {/* Modal xác nhận rời phòng */}
      <AuroraModalBackdrop open={showLeaveModal}>
        <AuroraModalCard
          compact={mobileShrink}
          tone="crimson"
          badge="Rời phòng"
          title="Thoát khỏi phòng thi đấu?"
          subtitle="Hệ thống sẽ ngắt kết nối và trở về sảnh."
          icon={(
            <svg
              viewBox="0 0 48 48"
              className="h-8 w-8 text-rose-50"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12H9a3 3 0 0 0-3 3v18a3 3 0 0 0 3 3h12" />
              <path d="M33 32l6-8-6-8" />
              <path d="M17 24h22" />
            </svg>
          )}
        >
          <button
            onClick={() => setShowLeaveModal(false)}
            className={`w-full ${modalActionClass} rounded-2xl border border-white/15 bg-white/5 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30`}
          >Ở lại</button>
          <button
            onClick={confirmLeaveRoom}
            className={`w-full ${modalActionClass} rounded-2xl border border-red-300/60 bg-gradient-to-r from-red-600/90 to-rose-500/90 font-semibold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-300/60`}
          >Rời phòng</button>
        </AuroraModalCard>
      </AuroraModalBackdrop>
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
            disabled={users.length < 2 || userId !== turnUserId || isLockedDue2DNF}
            className={
              (mobileShrink
                ? `px-1 py-0.5 ${isTypingMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${users.length < 2 || userId !== turnUserId || isLockedDue2DNF ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 ${isTypingMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${users.length < 2 || userId !== turnUserId || isLockedDue2DNF ? 'opacity-60 cursor-not-allowed' : ''}`)
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
            disabled={rematchPending || users.length < 2 || controlsLockedByOpponent}
            className={
              (mobileShrink
                ? `px-1 py-0.5 ${isLockedDue2DNF ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${(rematchPending || users.length < 2 || controlsLockedByOpponent) ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 ${isLockedDue2DNF ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${(rematchPending || users.length < 2 || controlsLockedByOpponent) ? 'opacity-60 cursor-not-allowed' : ''}`)
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label={controlsLockedByOpponent ? "Đối thủ đang giải - không thể tái đấu" : (isLockedDue2DNF ? "Tái đấu để mở khóa" : "Tái đấu")}
            title={controlsLockedByOpponent ? "Đối thủ đang giải - không thể tái đấu" : (isLockedDue2DNF ? "Tái đấu để mở khóa" : "Tái đấu")}
          >
            {/* Icon vòng lặp/refresh */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" width={mobileShrink ? 18 : 28} height={mobileShrink ? 18 : 28} style={{ display: 'block' }}>
              <path d="M24 8a16 16 0 1 1-11.31 4.69" stroke="white" strokeWidth="3" fill="none"/>
              <path d="M12 8v5a1 1 0 0 0 1 1h5" stroke="white" strokeWidth="3" fill="none"/>
            </svg>
            {/* Hiển thị icon khóa khi bị khóa do 2 lần DNF */}
            {isLockedDue2DNF && (
              <span style={{ 
                position: 'absolute', 
                top: -2, 
                right: -2, 
                width: mobileShrink ? 12 : 16, 
                height: mobileShrink ? 12 : 16, 
                background: '#f00', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: mobileShrink ? 8 : 10,
                color: 'white',
                fontWeight: 'bold',
                border: '1px solid white',
                zIndex: 10 
              }}>
                🔒
              </span>
            )}
          </button>
          <button
            disabled={controlsLockedByOpponent}
            className={
              (mobileShrink
                ? "bg-gray-500 hover:bg-gray-700 text-[13px] rounded-full font-bold shadow-lg flex items-center justify-center"
                : "bg-gray-500 hover:bg-gray-700 text-white rounded-full font-bold shadow-lg flex items-center justify-center")
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
              + (controlsLockedByOpponent ? " opacity-60 cursor-not-allowed" : "")
            }
            style={mobileShrink ? { fontSize: 18, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Lưới scramble"
            title={controlsLockedByOpponent ? "Đối thủ đang giải - không thể mở lưới" : "Lưới scramble"}
            onClick={() => {
              if (controlsLockedByOpponent) return;
              setShowCubeNet(true);
            }}
          >
            <span role="img" aria-label="cross" style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>✟</span>
          </button>
          {/* Modal lưới Rubik */}
          <CubeNetModal
            key={`${scramble}-${String(cubeSize)}`}
            scramble={scramble}
            open={showCubeNet}
            onClose={() => setShowCubeNet(false)}
            size={cubeSize}
            mobileShrink={mobileShrink}
          />
        </div>
            

          {/* Modal xác nhận tái đấu khi nhận được yêu cầu từ đối phương */}
      <AuroraModalBackdrop open={showRematchRequest}>
        <AuroraModalCard
          compact={mobileShrink}
          tone="emerald"
          badge="Tái đấu"
          title="Thêm một trận nữa?"
          subtitle={`${(opponentName || 'Đối thủ')} muốn bắt đầu Ao5 mới.`}
          description="Chấp nhận để hệ thống cấp scramble mới, reset bảng điểm và mở khóa mọi thao tác cho cả hai người chơi."
          icon={( 
              <svg
                viewBox="0 0 48 48"
                className="h-8 w-8 text-emerald-50"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M34 12c4.418 0 8 3.582 8 8 0 3.314-2.686 6-6 6h-4" />
                <path d="M14 36c-4.418 0-8-3.582-8-8 0-3.314 2.686-6 6-6h4" />
                <path d="M17 17h14v10H17z" />
                <path d="M17 27h-4l-6 6" />
                <path d="M31 21h4l6-6" />
              </svg>
            )}
        >
          <button
            onClick={() => respondRematch(false)}
            className={`w-full ${modalActionClass} rounded-2xl border border-white/15 bg-white/5 font-semibold text-slate-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30`}
          >Từ chối</button>
          <button
            onClick={() => respondRematch(true)}
            className={`w-full ${modalActionClass} rounded-2xl border border-emerald-400/60 bg-emerald-500/80 font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-400/90 focus:outline-none focus:ring-2 focus:ring-emerald-300/60`}
          >Đồng ý ngay</button>
        </AuroraModalCard>
      </AuroraModalBackdrop>
      {/* Modal đang chờ đối phương đồng ý tái đấu */}
      <AuroraModalBackdrop open={rematchPending}>
        <AuroraModalCard
          compact={mobileShrink}
          tone="amber"
          badge="Đang chờ"
          title="Đợi phản hồi đối thủ"
          subtitle="Bạn đã gửi lời mời tái đấu."
          description="Chúng tôi đã gửi yêu cầu đến đối thủ để xác nhận trận mới. Vui lòng chờ trong giây lát."
          icon={( 
              <svg
                viewBox="0 0 48 48"
                className="h-8 w-8 text-amber-100"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="24" cy="24" r="16" />
                <path d="M24 12v12l8 4" />
              </svg>
            )}
        >
          <div className={`w-full rounded-2xl border border-amber-200/30 bg-white/5 px-4 py-3 text-center ${modalInfoTextClass} font-medium text-amber-50/90`}>
              <div className="mx-auto mb-1 flex w-full items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-200 animate-ping" />
                <span className="h-2 w-2 rounded-full bg-amber-300 animate-ping" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" style={{ animationDelay: '300ms' }} />
              </div>
              Đang chờ {opponentName || 'đối thủ'} phản hồi...
          </div>
          <button
            onClick={() => {
              setRematchPending(false);
              const socket = getSocket();
              socket.emit('rematch-cancel', { roomId });
            }}
            className={`w-full ${modalActionClass} rounded-2xl border border-white/15 bg-white/5 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30`}
          >Hủy yêu cầu</button>
        </AuroraModalCard>
      </AuroraModalBackdrop>

      {/* Modal thông báo đối phương đã từ chối tái đấu */}
      <AuroraModalBackdrop open={rematchDeclined}>
        <AuroraModalCard
          compact={mobileShrink}
          tone="rose"
          badge="Bị từ chối"
          title="Đối thủ chưa sẵn sàng"
          subtitle="Lời mời tái đấu đã bị từ chối."
          icon={( 
              <svg
                viewBox="0 0 48 48"
                className="h-8 w-8 text-rose-100"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="24" cy="24" r="16" />
                <path d="M30 18L18 30" />
                <path d="M18 18l12 12" />
              </svg>
            )}
        >
          <button
            onClick={() => setRematchDeclined(false)}
            className={`w-full ${modalActionClass} rounded-2xl border border-rose-300/40 bg-rose-500/20 font-semibold text-rose-50 transition hover:-translate-y-0.5 hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-300/50`}
          >Đã hiểu</button>
        </AuroraModalCard>
      </AuroraModalBackdrop>
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
      <AuroraModalBackdrop open={chatModalVisible} disableAnimation>
        <div className={`relative w-full ${mobileShrink ? 'max-w-[500px]' : 'max-w-2xl'}`}>
          <div className="absolute inset-0 blur-3xl opacity-70 bg-blue-500/20 pointer-events-none" />
          <div
            data-chat-modal-state={chatModalPhase}
            className={`chat-modal-surface relative flex flex-col rounded-[30px] border border-white/10 bg-slate-950/85 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${mobileShrink ? 'p-3 min-h-[340px]' : 'p-6 min-h-[520px]'}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className={`${mobileShrink ? 'text-lg' : 'text-2xl'} font-semibold text-white`}>Chat phòng</h3>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className={`rounded-full bg-red-500/80 text-white ${mobileShrink ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-base'} font-bold transition hover:bg-red-500`}
                type="button"
                aria-label="Đóng chat"
              >✕</button>
            </div>
            <div
              ref={chatListRef}
              className={`flex-1 overflow-y-auto pr-1 ${mobileShrink ? 'space-y-2' : 'space-y-3'}`}
              style={{ maxHeight: mobileShrink ? 240 : 360 }}
            >
              {chatMessages.length === 0 && (
                <div className="text-gray-400 text-center mt-4 text-sm">Chưa có tin nhắn nào</div>
              )}
              {chatMessages.map((msg, idx) => {
                const displayName = msg.userName?.trim()
                  ? msg.userName.trim()
                  : (msg.from === 'me'
                      ? (userName?.trim() ? userName : 'Bạn')
                      : (opponentName?.trim() ? opponentName : 'Đối thủ'));
                const nameClass = [
                  mobileShrink ? "text-[10px]" : "text-xs",
                  msg.from === 'me' ? 'text-blue-100 text-right' : 'text-gray-300 text-left',
                ].join(' ');
                const bubbleClass = msg.from === 'me'
                  ? (mobileShrink ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2.5 py-1.5 rounded-2xl text-[11px]" : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-2xl text-base")
                  : (mobileShrink ? "bg-slate-800 text-white px-2.5 py-1.5 rounded-2xl text-[11px]" : "bg-slate-800 text-white px-4 py-2 rounded-2xl text-base");

                return (
                  <div
                    key={idx}
                    className={`${
                      msg.from === 'me'
                        ? (mobileShrink ? "flex justify-end" : "flex justify-end")
                        : (mobileShrink ? "flex justify-start" : "flex justify-start")
                    } chat-message ${idx === chatMessages.length - 1 ? 'new-message' : ''}`}
                  >
                    <div className="flex flex-col max-w-[75%]" style={{ wordBreak: 'break-word' }}>
                      <div className={`${nameClass} font-semibold mb-1`} title={displayName}>{displayName}</div>
                      <div className={`${bubbleClass} chat-bubble`} style={{ wordBreak: 'break-word' }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              className={`mt-3 flex w-full items-center ${mobileShrink ? 'gap-1.5' : 'gap-3'}`}
              onSubmit={e => {
                e.preventDefault();
                if (chatInput.trim() === "") return;
                const senderName = userName?.trim() ? userName : 'Bạn';
                setChatMessages(msgs => [...msgs, { from: 'me', text: chatInput, userName: senderName }]);
                const socket = getSocket();
                socket.emit('chat', { roomId, userId, userName, message: chatInput });
                setChatInput("");
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className={`flex-1 rounded-2xl border border-white/15 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${mobileShrink ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'}`}
                placeholder="Nhập tin nhắn..."
                autoFocus
              />
              <button
                type="submit"
                className={`rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 ${mobileShrink ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-base'}`}
                style={{ minWidth: mobileShrink ? 72 : 96 }}
                aria-label="Gửi"
                title="Gửi"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      </AuroraModalBackdrop>
        {/* Nút luật thi đấu */}
        <div className="flex items-center">
          <button
            onClick={() => {
              if (controlsLockedByOpponent) return;
              setShowRules(true);
            }}
            disabled={controlsLockedByOpponent}
            className={
              (mobileShrink
                ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
                : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center")
              + " transition-transform duration-200 hover:scale-110 active:scale-95 function-button"
              + (controlsLockedByOpponent ? " opacity-60 cursor-not-allowed" : "")
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Luật thi đấu"
            title={controlsLockedByOpponent ? "Đối thủ đang giải - không thể mở luật" : "Luật thi đấu"}
          >
            <span role="img" aria-label="Luật thi đấu">📜</span>
          </button>
        </div>
      </div>
      {/* Modal luật thi đấu */}
      <AuroraModalBackdrop open={showRules}>
        <div className={`relative w-full ${mobileShrink ? 'max-w-[520px]' : 'max-w-2xl'}`}>
          <div className="absolute inset-0 blur-3xl opacity-60 bg-indigo-500/20 pointer-events-none" />
          <div className={`relative flex flex-col rounded-[30px] border border-white/10 bg-slate-950/85 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${mobileShrink ? 'p-3 min-h-[320px]' : 'p-6 min-h-[520px]'}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className={`${mobileShrink ? 'text-lg' : 'text-2xl'} font-semibold text-white`}>Luật thi đấu phòng</h3>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className={`rounded-full bg-red-500/80 text-white ${mobileShrink ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-base'} font-bold transition hover:bg-red-500`}
                type="button"
                aria-label="Đóng luật thi đấu"
              >✕</button>
            </div>
            <div
              className={`${mobileShrink ? 'text-[11px]' : 'text-sm'} text-white flex-1 overflow-y-auto pr-2 leading-relaxed`}
              style={{ maxHeight: mobileShrink ? 260 : 420 }}
            >
              <ul className="pl-4 space-y-2 text-white/90">
                <li>1. Mỗi người có 5 lượt giải, chủ phòng là người giải trước.</li>
                <li>2. Cam lỗi? Tắt/bật lại camera và báo cho đối thủ trước khi tiếp tục.</li>
                <li>3. Chỉ giải khi tới lượt; nếu không phải lượt của bạn, hệ thống sẽ khóa timer.</li>
                <li>4. Mỗi scramble dùng chung cho cả hai người trong từng vòng, tổng cộng 5 vòng.</li>
                <li>5. Máy tính: nhấn <b>Space</b> để chuẩn bị 15s, nhả Space để bắt đầu và nhấn lần nữa để kết thúc.</li>
                <li>6. Điện thoại: chạm để chuẩn bị, nhấn giữ rồi thả để bắt đầu, chạm một lần để dừng.</li>
                <li>7. Chọn <b>DNF</b> khi không hoàn thành, hoặc <b>+2</b> khi bị phạt theo luật Ao5.</li>
                <li>8. Ấn <b>Gửi</b> để xác nhận kết quả; hệ thống cập nhật bảng ngay lập tức.</li>
                <li>9. Thắng thua dựa trên Ao5; nếu cả hai đều DNF Ao5 sẽ tính hòa.</li>
                <li>10. <b>THI ĐẤU TRUNG THỰC VÀ TÔN TRỌNG ĐỐI THỦ!!!</b></li>
              </ul>
            </div>
          </div>
        </div>
      </AuroraModalBackdrop>
              {/* Thông tin phòng */}
        <div className={`w-full flex justify-center ${mobileShrink ? 'px-1' : 'px-3'} mb-2`}>
          <div className={`w-full ${mobileShrink ? 'max-w-[250px]' : 'max-w-[500px]'}`}>
            <div
              className={`rounded-[20px] border border-white/10 bg-gradient-to-r from-slate-950/85 via-slate-900/65 to-slate-950/85 shadow-[0_14px_35px_rgba(0,0,0,0.35)] flex items-center justify-between gap-2 ${mobileShrink ? 'p-2' : 'p-2'}`}
            >
              <div className="min-w-0 text-left flex-1">
                <div className={`${mobileShrink ? 'text-[17px]' : 'text-xl'} font-bold text-white`}>{roomDisplayName}</div>
                <div className={`${mobileShrink ? 'text-[10px]' : 'text-[11px]'} text-slate-300 mt-0.5`}>ID phòng: {roomId}</div>
              </div>
              {eventName && (
                <span className="ml-auto inline-flex items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-[13px] font-semibold text-blue-100">
                  {eventName}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Khối meta + trạng thái + scramble ở giữa */}
      {/* Hàng ngang 3 khối: bảng tổng hợp | trạng thái + thông báo | bảng kết quả */}
      <div
        className={
          mobileShrink
            ? "w-full flex flex-row justify-between items-start gap-1 px-1 mb-1"
            : isMobileLandscape
              ? "w-full flex flex-row flex-wrap justify-between items-start gap-2 px-1 mb-4 overflow-x-auto"
              : "w-full flex flex-row flex-wrap justify-between items-start gap-4 mb-6"
        }
        style={mobileShrink ? { maxWidth: '100vw' } : isMobileLandscape ? { maxWidth: '100vw', rowGap: 8 } : {}}
      >
        {/* Bảng tổng hợp bên trái */}
        <div
          className={
            (mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-1 m-0 min-w-[140px] max-w-[210px] w-[180px] flex-shrink-0 ml-0 mb-1"
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
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Average</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Ao5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#60a5fa' }}>{userName}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-green-300">{myStats.best !== null ? (() => {
                  const ms = myStats.best;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (myResults.length >= 5 ? 'DNF' : '')}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-red-300">{myStats.worst !== null ? (() => {
                  const ms = myStats.worst;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (myResults.length >= 5 ? 'DNF' : '')}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.mean !== null ? (() => {
                  const ms = myStats.mean;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (myResults.length >= 5 ? 'DNF' : '')}</td>
                <td className="px-1 py-0.5 border border-gray-700">{myStats.ao5 !== null ? (() => {
                  const ms = myStats.ao5;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (myResults.length >= 5 ? 'DNF' : '')}</td>
              </tr>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#f472b6' }}>{opponentName}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-green-300">{oppStats.best !== null ? (() => {
                  const ms = oppStats.best;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (opponentResults.length >= 5 ? 'DNF' : '')}</td>
                <td className="px-1 py-0.5 border border-gray-700 text-red-300">{oppStats.worst !== null ? (() => {
                  const ms = oppStats.worst;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (opponentResults.length >= 5 ? 'DNF' : '')}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.mean !== null ? (() => {
                  const ms = oppStats.mean;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (opponentResults.length >= 5 ? 'DNF' : '')}</td>
                <td className="px-1 py-0.5 border border-gray-700">{oppStats.ao5 !== null ? (() => {
                  const ms = oppStats.ao5;
                  const cs = Math.floor((ms % 1000) / 10);
                  const s = Math.floor((ms / 1000) % 60);
                  const m = Math.floor(ms / 60000);
                  
                  if (m > 0) {
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })() : (opponentResults.length >= 5 ? 'DNF' : '')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          className={
            mobileShrink
              ? "flex-1 min-w-0 px-1 max-w-[480px]"
              : isMobileLandscape
                ? "flex-1 w-full max-w-[560px] min-w-[320px] px-1.5 mb-2"
                : "flex-1 w-full max-w-[850px] min-w-[420px] px-3"
          }
        >
          <div className={`w-full ${mobileShrink ? 'space-y-1' : 'space-y-2.5'}`}>
            <div className={`grid grid-cols-1 ${mobileShrink ? 'gap-1' : 'gap-2.5'}`}>
              <div className={`rounded-[16px] border border-white/10 bg-slate-950/80 shadow-[0_12px_30px_rgba(0,0,0,0.3)] ${mobileShrink ? 'p-2.25' : 'p-2.5'} flex flex-col ${mobileShrink ? 'gap-1.5' : 'gap-1.75'}`}>
                <div className="flex items-center justify-center gap-2 text-center">
                  <div className={`flex ${mobileShrink ? 'h-5 w-5 text-sm' : 'h-6 w-6 text-base'} items-center justify-center rounded-2xl bg-white/5`} aria-hidden="true">{readyStatusIcon}</div>
                  <div className={`${mobileShrink ? 'text-[11px]' : 'text-base'} font-semibold ${readyStatusTone}`}>
                    {readyStatusText}
                  </div>
                </div>
                <div className={`rounded-2xl border border-white/10 bg-white/5 ${mobileShrink ? 'px-1.25 py-0.75' : 'px-2 py-1.5'} text-center text-white/90`}>
                  {(() => {
                    if (waiting || users.length < 2) {
                      return null;
                    }
                    if (showEarlyEndMsg.show) {
                      return null;
                    }
                    if (isLockedDue2DNF && !showEarlyEndMsg.show) {
                      const myDnfCount = myResults.filter(r => r === null).length;
                      const oppDnfCount = opponentResults.filter(r => r === null).length;
                      if (myDnfCount >= 2 && oppDnfCount >= 2) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-yellow-300 font-semibold`}>
                            {userName} và {opponentName} hòa - cả hai đều có 2 lần DNF.
                          </span>
                        );
                      }
                      if (myDnfCount >= 2) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-orange-300 font-semibold`}>
                            {userName} thua - có 2 lần DNF. {opponentName} thắng.
                          </span>
                        );
                      }
                      if (oppDnfCount >= 2) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-emerald-300 font-semibold`}>
                            {userName} thắng - {opponentName} có 2 lần DNF.
                          </span>
                        );
                      }
                    }
                    const bothDone = myResults.length >= 5 && opponentResults.length >= 5;
                    if (bothDone) {
                      const myAo5 = calcStats(myResults).ao5;
                      const oppAo5 = calcStats(opponentResults).ao5;
                      if (myAo5 === null && oppAo5 === null) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-yellow-300 font-semibold`}>
                            Trận đấu kết thúc, hòa
                          </span>
                        );
                      }
                      if (myAo5 === null) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-emerald-300 font-semibold`}>
                            Trận đấu kết thúc, {opponentName} thắng
                          </span>
                        );
                      }
                      if (oppAo5 === null) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-emerald-300 font-semibold`}>
                            Trận đấu kết thúc, {userName} thắng
                          </span>
                        );
                      }
                      if (myAo5 < oppAo5) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-emerald-300 font-semibold`}>
                            Trận đấu kết thúc, {userName} thắng
                          </span>
                        );
                      }
                      if (myAo5 > oppAo5) {
                        return (
                          <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-emerald-300 font-semibold`}>
                            Trận đấu kết thúc, {opponentName} thắng
                          </span>
                        );
                      }
                      return (
                        <span className={`${mobileShrink ? 'text-[10px]' : 'text-sm'} text-yellow-300 font-semibold`}>
                          Trận đấu kết thúc, hòa
                        </span>
                      );
                    }
                    if (!isLockedDue2DNF) {
                      const name = userId === turnUserId ? (userName || 'Bạn') : (opponentName || 'Đối thủ');
                      let msg = '';
                      if (prep) {
                        msg = `${name} đang chuẩn bị`;
                      } else if (running) {
                        msg = `${name} đang giải`;
                      } else {
                        msg = `Đến lượt ${name} thi đấu`;
                      }
                      return (
                        <div className="flex flex-col gap-0.5 items-center text-center">
                          <span className={`${mobileShrink ? 'text-11px]' : 'text-lg'} font-semibold text-green-200`}>
                            {msg}
                          </span>
                          {showScrambleMsg && (
                            <span className={`${mobileShrink ? 'text-[10px]' : 'text-base'} text-yellow-200`}>
                              Hai cuber hãy tráo scramble trong {SCRAMBLE_LOCK_DURATION_MS / 1000}s
                            </span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <span className={`${mobileShrink ? 'text-[9px]' : 'text-sm'} text-red-300 font-semibold`}>
                        ⚠️ KHÓA THAO TÁC DO 2 LẦN DNF! {(() => {
                          const myDnfCount = myResults.filter(r => r === null).length;
                          const oppDnfCount = opponentResults.filter(r => r === null).length;
                          if (myDnfCount >= 2 && oppDnfCount >= 2) {
                            return 'Cả hai đều có 2 lần DNF. Tái đấu để mở khóa.';
                          }
                          if (myDnfCount >= 2) {
                            return 'Bạn có 2 lần DNF. Tái đấu để mở khóa.';
                          }
                          return 'Đối thủ có 2 lần DNF. Tái đấu để mở khóa.';
                        })()}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className={`rounded-[16px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-900/40 shadow-[0_12px_30px_rgba(0,0,0,0.3)] ${mobileShrink ? 'p-1.25' : 'p-2.5'} flex flex-col ${mobileShrink ? 'gap-1.25' : 'gap-1.75'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className={`${mobileShrink ? 'text-[13px]' : 'text-lg'} font-semibold text-white mt-0.5`}>
                      {eventName} #{scrambleIndex + 1}
                    </div>
                  </div>
                </div>
                <div
                  className={`rounded-2xl border border-white/10 bg-black/30 w-full ${mobileShrink ? 'px-1.25 py-0.75' : 'px-3 py-1.5'} text-left`}
                  style={{ wordBreak: 'break-word' }}
                >
                  <div
                    className={`${mobileShrink ? 'text-[13px]' : 'text-xl'} font-bold tracking-widest text-blue-100 leading-relaxed select-all break-words`}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {scramble || 'Chưa có scramble'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Bảng kết quả bên phải */}
        <div
          className={
            (mobileShrink
              ? "bg-gray-900 bg-opacity-90 shadow rounded p-1 m-0 min-w-[140px] max-w-[210px] w-[180px] flex-shrink-0 mr-0 mb-1"
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
                  <td className="py-1 border border-gray-700">{myResults[i] === null ? 'DNF' : (typeof myResults[i] === 'number' ? (() => {
                    const ms = myResults[i] as number;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : "")}</td>
                  <td className="py-1 border border-gray-700">{opponentResults[i] === null ? 'DNF' : (typeof opponentResults[i] === 'number' ? (() => {
                    const ms = opponentResults[i] as number;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : "")}</td>
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
            {/* Nút bật/tắt mic */}
            <button
              className={mobileShrink ? `absolute bottom-0.5 right-0.5 px-0.5 py-0.5 rounded text-[8px] ${micOn ? 'bg-gray-700' : 'bg-red-600'}` : `absolute bottom-3 right-3 px-3 py-1 rounded text-base ${micOn ? 'bg-gray-700' : 'bg-red-600'}`}
              style={mobileShrink ? { minWidth: 0, minHeight: 0, pointerEvents: 'auto', zIndex: 4 } : { pointerEvents: 'auto', zIndex: 4 }}
              onClick={() => {
                setMicOn(v => {
                  const newVal = !v;
                  // Gửi trạng thái micOn mới cho đối thủ qua socket, kèm userName
                  const socket = getSocket();
                  socket.emit('user-mic-toggle', { roomId, userId, micOn: newVal, userName });
                  return newVal;
                });
              }}
              type="button"
            >{micOn ? 'Tắt mic' : 'Bật mic'}</button>
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
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#aaa', fontWeight: 400, lineHeight: 1}}>Avg</div>
              <div style={{fontSize: (() => {
                if (myResults.length > 0) {
                  const stats = calcStats(myResults);
                  if (stats && typeof stats.mean === 'number' && !isNaN(stats.mean)) {
                    const ms = stats.mean;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    let timeStr = '';
                    
                    if (m > 0) {
                      timeStr = `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      timeStr = `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      timeStr = `0.${cs.toString().padStart(2, "0")}`;
                    }
                    
                    // Điều chỉnh cỡ chữ dựa trên độ dài
                    if (timeStr.length <= 4) return mobileShrink ? 11 : 18; // 0.05, 1.23
                    if (timeStr.length <= 6) return mobileShrink ? 10 : 16; // 12.34, 1:05.43
                    return mobileShrink ? 9 : 14; // 1:23.45, 12:34.56
                  }
                }
                return mobileShrink ? 11 : 18;
              })()}}>{(() => {
                if (myResults.length > 0) {
                  const stats = calcStats(myResults);
                  if (stats && typeof stats.mean === 'number' && !isNaN(stats.mean)) {
                    const ms = stats.mean;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  }
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
                <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 9 : 13, fontFamily: 'Digital7Mono' }}>
                  Chuẩn bị: {prepTime}s
                </span>
              ) : dnf ? (
                <span style={{ color: '#e53935', fontWeight: 700 }}>DNF</span>
              ) : (
                <>
                  <span style={{ 
                    fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace",
                    fontSize: (() => {
                      // Tự động điều chỉnh cỡ chữ dựa trên độ dài thời gian
                      const cs = Math.floor((timer % 1000) / 10);
                      const s = Math.floor((timer / 1000) % 60);
                      const m = Math.floor(timer / 60000);
                      let timeStr = '';
                      
                      if (m > 0) {
                        timeStr = `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                      } else if (s > 0) {
                        timeStr = `${s}.${cs.toString().padStart(2, "0")}`;
                      } else {
                        timeStr = `0.${cs.toString().padStart(2, "0")}`;
                      }
                      
                      // Điều chỉnh cỡ chữ dựa trên độ dài
                      if (timeStr.length <= 4) return mobileShrink ? 18 : 24; // 0.05, 1.23
                      if (timeStr.length <= 6) return mobileShrink ? 16 : 20; // 12.34, 1:05.43
                      return mobileShrink ? 14 : 18; // 1:23.45, 12:34.56
                    })()
                  }}>
                    {(() => {
                      const cs = Math.floor((timer % 1000) / 10);
                      const s = Math.floor((timer / 1000) % 60);
                      const m = Math.floor(timer / 60000);
                      
                      if (m > 0) {
                        return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                      } else if (s > 0) {
                        return `${s}.${cs.toString().padStart(2, "0")}`;
                      } else {
                        return `0.${cs.toString().padStart(2, "0")}`;
                      }
                    })()}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                </>
              )}
            </div>
            {/* Tên người chơi */}
            <div
              style={{
                background: '#fff',
                color: '#222',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: mobileShrink ? 'clamp(10px, 4vw, 15px)' : 'clamp(14px, 2vw, 22px)',
                padding: mobileShrink ? '4px 16px' : '4px 18px',
                minWidth: mobileShrink ? 100 : 60,
                maxWidth: mobileShrink ? 180 : 180,
                textAlign: 'center',
                border: '2px solid #bbb',
                marginLeft: mobileShrink ? 2 : 6,
                marginRight: mobileShrink ? 2 : 6,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {userName}
            </div>
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
          style={mobileShrink
            ? { flex: '0 1 20%', minWidth: 120, maxWidth: 200, marginTop: 8 }
            : { flex: '0 1 20%', minWidth: 180, maxWidth: 320, marginTop: isMobileLandscape ? 20 : 56 }}
  >
          
          {/* Nếu có pendingResult thì hiện 3 nút xác nhận sau 1s */}
          {pendingResult !== null && !running && !prep && showConfirmButtons && !isLockedDue2DNF ? (
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
          
          {/* Hiển thị thông báo khi bị khóa do 2 lần DNF và có pendingResult */}
          {pendingResult !== null && !running && !prep && isLockedDue2DNF ? (
            <div className="flex flex-col items-center justify-center gap-2 mb-2">
              <div className={`${mobileShrink ? "text-[10px]" : "text-sm"} text-red-400 font-bold text-center`}>
                🚫 KHÓA THAO TÁC DO 2 LẦN DNF!
              </div>
              <div className={`${mobileShrink ? "text-[8px]" : "text-xs"} text-gray-400 text-center`}>
                Không thể gửi kết quả. Chỉ có thể tái đấu để mở khóa.
              </div>
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
                    if (val === null) {
                      txt += `  Lượt ${i+1}: DNF\n`;
                    } else if (typeof val === 'number') {
                      const cs = Math.floor((val % 1000) / 10);
                      const s = Math.floor((val / 1000) % 60);
                      const m = Math.floor(val / 60000);
                      
                      if (m > 0) {
                        txt += `  Lượt ${i+1}: ${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}\n`;
                      } else if (s > 0) {
                        txt += `  Lượt ${i+1}: ${s}.${cs.toString().padStart(2, "0")}\n`;
                      } else {
                        txt += `  Lượt ${i+1}: 0.${cs.toString().padStart(2, "0")}\n`;
                      }
                    }
                  }
                  txt += `Thống kê:\n`;
                  txt += `  Best: ${myStats.best !== null ? (() => {
                    const ms = myStats.best;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `  Worst: ${myStats.worst !== null ? (() => {
                    const ms = myStats.worst;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `  Mean: ${myStats.mean !== null ? (() => {
                    const ms = myStats.mean;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `  Ao5: ${myStats.ao5 !== null ? (() => {
                    const ms = myStats.ao5;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `\n`;

                  // Người chơi 2
                  txt += `NGƯỜI CHƠI 2: ${opponentName}\n`;
                  txt += `Kết quả từng lượt:\n`;
                  for (let i = 0; i < 5; i++) {
                    const val = (opponentResults && opponentResults[i] !== undefined) ? opponentResults[i] : null;
                    if (val === null) {
                      txt += `  Lượt ${i+1}: DNF\n`;
                    } else if (typeof val === 'number') {
                      const cs = Math.floor((val % 1000) / 10);
                      const s = Math.floor((val / 1000) % 60);
                      const m = Math.floor(val / 60000);
                      
                      if (m > 0) {
                        txt += `  Lượt ${i+1}: ${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}\n`;
                      } else if (s > 0) {
                        txt += `  Lượt ${i+1}: ${s}.${cs.toString().padStart(2, "0")}\n`;
                      } else {
                        txt += `  Lượt ${i+1}: 0.${cs.toString().padStart(2, "0")}\n`;
                      }
                    }
                  }
                  txt += `Thống kê:\n`;
                  txt += `  Best: ${oppStats.best !== null ? (() => {
                    const ms = oppStats.best;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `  Worst: ${oppStats.worst !== null ? (() => {
                    const ms = oppStats.worst;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `  Mean: ${oppStats.mean !== null ? (() => {
                    const ms = oppStats.mean;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
                  txt += `  Ao5: ${oppStats.ao5 !== null ? (() => {
                    const ms = oppStats.ao5;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  })() : 'DNF'}\n`;
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
              <form onSubmit={handleTypingSubmit} className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={typingInput}
                  onChange={handleTypingInputChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    // Chặn phím Enter khi không phải lượt của mình
                    if (e.key === 'Enter' && userId !== turnUserId) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  placeholder={userId === turnUserId && !isLockedDue2DNF ? " " : (isLockedDue2DNF ? "🚫 Bị KHÓA" : "No send")}
                  disabled={userId !== turnUserId || isLockedDue2DNF}
                  className={`${mobileShrink ? "px-2 py-1 text-sm" : "px-4 py-3 text-2xl"} bg-gray-800 text-white border-2 rounded-lg focus:outline-none text-center font-mono ${
                    userId === turnUserId && !isLockedDue2DNF
                      ? 'border-blue-500 focus:border-blue-400' 
                      : 'border-gray-500 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{ 
                    width: mobileShrink ? '160px' : '280px',
                    fontSize: mobileShrink ? '14px' : '24px'
                  }}
                  maxLength={5}
                  autoFocus={userId === turnUserId}
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  disabled={userId !== turnUserId || isLockedDue2DNF}
                  className={`${mobileShrink ? "px-3 py-1 text-xs" : "px-6 py-3 text-lg"} rounded-lg font-bold transition-all duration-200 ${
                    userId === turnUserId && !isLockedDue2DNF
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                      : 'bg-gray-500 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {userId === turnUserId && !isLockedDue2DNF ? 'Gửi kết quả' : (isLockedDue2DNF ? '🚫 Bị KHÓA' : 'Không phải lượt của bạn')}
                </button>
              </form>
              <div className={`${mobileShrink ? "text-[10px]" : "text-sm"} text-gray-400 mt-1 text-center`}>
                {userId === turnUserId && !isLockedDue2DNF ? 'Để trống = DNF, Enter để gửi' : (isLockedDue2DNF ? '🚫 KHÓA DO 2 LẦN DNF - CHỈ CÓ THỂ TÁI ĐẤU' : 'Chờ đến lượt của bạn')}
              </div>
            </div>
          ) : (
            /* Chế độ timer: hiện timer bình thường */
            <>
              <div
                className={
                  mobileShrink
                    ? `text-3xl font-bold drop-shadow select-none px-3 py-3 rounded-xl ${timerColorClass}`
                    : `text-9xl font-['Digital-7'] font-bold drop-shadow-2xl select-none px-12 py-8 rounded-3xl ${timerColorClass}`
                }
                style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: 40, textAlign: 'center', fontSize: 40, padding: 6 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", minWidth: '220px', textAlign: 'center', fontSize: 110, padding: 18 }}
              >
                {prep ? (
                  <span className={mobileShrink ? "text-[20px]" : undefined}>
                    Chuẩn bị:
                    <span
                      style={{
                        fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace",
                        marginLeft: 6,
                        marginRight: 2,
                      }}
                    >
                      {prepTime}
                    </span>
                    <span style={{ fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif" }}>s</span>
                  </span>
                ) : dnf ? (
                  <span className={mobileShrink ? "text-[20px] text-red-400" : "text-red-400"}>DNF</span>
                ) : (
                  <>
                    <span style={mobileShrink ? { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 32 } : { fontFamily: "'Digital7Mono', 'Digital-7', 'Courier New', monospace", fontSize: 80 }}>
                      {(() => {
                        const cs = Math.floor((timer % 1000) / 10);
                        const s = Math.floor((timer / 1000) % 60);
                        const m = Math.floor(timer / 60000);
                        
                        if (m > 0) {
                          // Có phút: hiển thị m:ss.cs
                          return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                        } else if (s > 0) {
                          // Có giây: hiển thị s.cs (không có số 0 thừa)
                          return `${s}.${cs.toString().padStart(2, "0")}`;
                        } else {
                          // Chỉ có centiseconds: hiển thị 0.cs
                          return `0.${cs.toString().padStart(2, "0")}`;
                        }
                      })()}
                    </span>
                    <span className={mobileShrink ? "ml-1 align-bottom" : "ml-2 align-bottom"} style={mobileShrink ? { fontFamily: 'font-mono', fontWeight: 400, fontSize: 12, lineHeight: 1 } : { fontFamily: 'font-mono', fontWeight: 400, fontSize: 5, lineHeight: 1 }}>s</span>
                  </>
                )}
              </div>
              {running && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Chạm hoặc bấm phím bất kỳ để dừng</div>}
              {!running && ready && <div className={mobileShrink ? "text-[8px] text-green-400 mt-0.5" : "text-sm text-green-400 mt-1"}>Thả Space hoặc nhả tay để bắt đầu</div>}
              {prep && !spaceHeld && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Bấm và giữ Space hoặc chạm giữ để chuẩn bị</div>}
              {prep && spaceHeld && !ready && <div className={mobileShrink ? "text-[8px] text-yellow-400 mt-0.5" : "text-sm text-yellow-400 mt-1"}>Giữ &gt;=300ms để sẵn sàng</div>}
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
              Timer đối thủ: <span style={{ fontSize: (() => {
                const cs = Math.floor((opponentTimer % 1000) / 10);
                const s = Math.floor((opponentTimer / 1000) % 60);
                const m = Math.floor(opponentTimer / 60000);
                let timeStr = '';
                
                if (m > 0) {
                  timeStr = `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                } else if (s > 0) {
                  timeStr = `${s}.${cs.toString().padStart(2, "0")}`;
                } else {
                  timeStr = `0.${cs.toString().padStart(2, "0")}`;
                }
                
                // Điều chỉnh cỡ chữ dựa trên độ dài
                if (timeStr.length <= 4) return mobileShrink ? 10 : 20; // 0.05, 1.23
                if (timeStr.length <= 6) return mobileShrink ? 9 : 18; // 12.34, 1:05.43
                return mobileShrink ? 8 : 16; // 1:23.45, 12:34.56
              })() }}>
                {(() => {
                  const cs = Math.floor((opponentTimer % 1000) / 10);
                  const s = Math.floor((opponentTimer / 1000) % 60);
                  const m = Math.floor(opponentTimer / 60000);
                  
                  if (m > 0) {
                    // Có phút: hiển thị m:ss.cs
                    return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                  } else if (s > 0) {
                    // Có giây: hiển thị s.cs (không có số 0 thừa)
                    return `${s}.${cs.toString().padStart(2, "0")}`;
                  } else {
                    // Chỉ có centiseconds: hiển thị 0.cs
                    return `0.${cs.toString().padStart(2, "0")}`;
                  }
                })()}
              </span>s
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
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#aaa', fontWeight: 400, lineHeight: 1}}>Avg</div>
              <div style={{fontSize: (() => {
                if (opponentResults.length > 0) {
                  const stats = calcStats(opponentResults);
                  if (stats && typeof stats.mean === 'number' && !isNaN(stats.mean)) {
                    const ms = stats.mean;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    let timeStr = '';
                    
                    if (m > 0) {
                      timeStr = `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      timeStr = `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      timeStr = `0.${cs.toString().padStart(2, "0")}`;
                    }
                    
                    // Điều chỉnh cỡ chữ dựa trên độ dài
                    if (timeStr.length <= 4) return mobileShrink ? 11 : 18; // 0.05, 1.23
                    if (timeStr.length <= 6) return mobileShrink ? 10 : 16; // 12.34, 1:05.43
                    return mobileShrink ? 9 : 14; // 1:23.45, 12:34.56
                  }
                }
                return mobileShrink ? 11 : 18;
              })()}}>{(() => {
                if (opponentResults.length > 0) {
                  const stats = calcStats(opponentResults);
                  if (stats && typeof stats.mean === 'number' && !isNaN(stats.mean)) {
                    const ms = stats.mean;
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);
                    
                    if (m > 0) {
                      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    } else if (s > 0) {
                      return `${s}.${cs.toString().padStart(2, "0")}`;
                    } else {
                      return `0.${cs.toString().padStart(2, "0")}`;
                    }
                  }
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
                <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 9 : 13, fontFamily: 'Digital7Mono' }}>Chuẩn bị: {opponentPrepTime}s</span>
              ) : (
                <>
                  <span style={{ 
                    fontFamily: 'inherit',
                    fontSize: (() => {
                      // Tự động điều chỉnh cỡ chữ dựa trên độ dài thời gian
                      const cs = Math.floor((opponentTimer % 1000) / 10);
                      const s = Math.floor((opponentTimer / 1000) % 60);
                      const m = Math.floor(opponentTimer / 60000);
                      let timeStr = '';
                      
                      if (m > 0) {
                        timeStr = `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                      } else if (s > 0) {
                        timeStr = `${s}.${cs.toString().padStart(2, "0")}`;
                      } else {
                        timeStr = `0.${cs.toString().padStart(2, "0")}`;
                      }
                      
                      // Điều chỉnh cỡ chữ dựa trên độ dài
                      if (timeStr.length <= 4) return mobileShrink ? 18 : 24; // 0.05, 1.23
                      if (timeStr.length <= 6) return mobileShrink ? 16 : 20; // 12.34, 1:05.43
                      return mobileShrink ? 14 : 18; // 1:23.45, 12:34.56
                    })()
                  }}>
                    {(() => {
                      const cs = Math.floor((opponentTimer % 1000) / 10);
                      const s = Math.floor((opponentTimer / 1000) % 60);
                      const m = Math.floor(opponentTimer / 60000);
                      
                      if (m > 0) {
                        // Có phút: hiển thị m:ss.cs
                        return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                      } else if (s > 0) {
                        // Có giây: hiển thị s.cs (không có số 0 thừa)
                        return `${s}.${cs.toString().padStart(2, "0")}`;
                      } else {
                        // Chỉ có centiseconds: hiển thị 0.cs
                        return `0.${cs.toString().padStart(2, "0")}`;
                      }
                    })()}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                </>
              )}
            </div>
            {/* Tên đối thủ */}
            <div
              style={{
                background: '#fff',
                color: '#222',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: mobileShrink ? 'clamp(10px, 4vw, 15px)' : 'clamp(14px, 2vw, 22px)',
                padding: mobileShrink ? '4px 16px' : '4px 18px',
                minWidth: mobileShrink ? 100 : 60,
                maxWidth: mobileShrink ? 180 : 180,
                textAlign: 'center',
                border: '2px solid #bbb',
                marginLeft: mobileShrink ? 2 : 6,
                marginRight: mobileShrink ? 2 : 6,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {opponentName}
            </div>
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
        
        .chat-modal-surface {
          opacity: 0;
          transform: translateY(12px) scale(0.96);
          transition: opacity ${CHAT_MODAL_ANIMATION_MS}ms ease, transform ${CHAT_MODAL_ANIMATION_MS}ms ease;
        }

        .chat-modal-surface[data-chat-modal-state='enter'] {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .chat-modal-surface[data-chat-modal-state='exit'] {
          opacity: 0;
          transform: translateY(6px) scale(0.97);
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
        
        .name-marquee-container {
          position: relative;
          overflow: hidden;
        }

        .name-marquee-track {
          display: inline-flex;
          align-items: center;
          gap: 32px;
          min-width: 100%;
          white-space: nowrap;
          will-change: transform;
        }

        .name-marquee-track--animate {
          animation: room-name-marquee var(--marquee-duration, 12s) linear infinite;
        }

        .name-marquee-text {
          display: inline-block;
          white-space: nowrap;
        }

        @keyframes room-name-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
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