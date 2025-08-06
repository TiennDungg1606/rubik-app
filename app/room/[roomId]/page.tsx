
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
  const [roomId, setRoomId] = useState<string>("");
  // State cho meta phòng
  const [roomMeta, setRoomMeta] = useState<{ displayName?: string; event?: string } | null>(null);
  // Fetch meta phòng từ API
  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/room-meta/${roomId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (data.displayName || data.event)) setRoomMeta(data);
      });
  }, [roomId]);
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

   // State cho tái đấu
  const [rematchModal, setRematchModal] = useState<{show: boolean, from: 'me'|'opponent'|null}>({show: false, from: null});
  const [rematchPending, setRematchPending] = useState(false); // Đang chờ đối phương đồng ý
  const [rematchDeclined, setRematchDeclined] = useState(false); // Đối phương đã từ chối
  const [rematchJustAccepted, setRematchJustAccepted] = useState(false);

// ... (các khai báo state khác)
// Lưu usersArr cuối cùng để xử lý khi userId đến sau
const [pendingUsers, setPendingUsers] = useState<{ userId: string, userName: string }[] | null>(null);
// Lắng nghe danh sách users trong phòng từ server
useEffect(() => {
  const socket = getSocket();
  const handleUsers = (usersArr: { userId: string, userName: string }[]) => {
    setUsers(usersArr.map(u => u.userId));
    setWaiting(usersArr.length < 2);
    setPendingUsers(usersArr); // luôn lưu lại usersArr cuối cùng
  };
  socket.on('room-users', handleUsers);
  return () => {
    socket.off('room-users', handleUsers);
  };
}, []);

// Khi userId hoặc pendingUsers thay đổi, luôn cập nhật opponentId/opponentName
useEffect(() => {
  if (!userId || !pendingUsers) return;
  const opp = pendingUsers.find(u => u.userId !== userId);
  if (opp) {
    setOpponentId(opp.userId);
    setOpponentName(opp.userName || 'Đối thủ');
  }
}, [userId, pendingUsers]);

// --- CubeNetModal component and scramble logic ---
type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
type CubeState = Record<Face, string[]>;

const solvedCubeStateTemplate: CubeState = {
  B: Array(9).fill('blue'),
  U: Array(9).fill('white'),
  D: Array(9).fill('yellow'),
  L: Array(9).fill('orange'),
  R: Array(9).fill('red'),
  F: Array(9).fill('green'),
};


function rotateFace(face: Face, cubeState: CubeState) {
  const faceColors = [...cubeState[face]];
  cubeState[face][0] = faceColors[6];
  cubeState[face][1] = faceColors[3];
  cubeState[face][2] = faceColors[0];
  cubeState[face][3] = faceColors[7];
  cubeState[face][5] = faceColors[1];
  cubeState[face][6] = faceColors[8];
  cubeState[face][7] = faceColors[5];
  cubeState[face][8] = faceColors[2];
  switch (face) {
    case 'F':
      [cubeState.U[6], cubeState.U[7], cubeState.U[8],
        cubeState.R[0], cubeState.R[3], cubeState.R[6],
        cubeState.D[2], cubeState.D[1], cubeState.D[0],
        cubeState.L[2], cubeState.L[5], cubeState.L[8]] =
        [cubeState.L[8], cubeState.L[5], cubeState.L[2],
          cubeState.U[6], cubeState.U[7], cubeState.U[8],
          cubeState.R[0], cubeState.R[3], cubeState.R[6],
          cubeState.D[0], cubeState.D[1], cubeState.D[2]];
      break;
    case 'U':
      [cubeState.F[0], cubeState.F[1], cubeState.F[2],
        cubeState.R[0], cubeState.R[1], cubeState.R[2],
        cubeState.B[0], cubeState.B[1], cubeState.B[2],
        cubeState.L[0], cubeState.L[1], cubeState.L[2]] =
        [cubeState.R[0], cubeState.R[1], cubeState.R[2],
          cubeState.B[0], cubeState.B[1], cubeState.B[2],
          cubeState.L[0], cubeState.L[1], cubeState.L[2],
          cubeState.F[0], cubeState.F[1], cubeState.F[2]];
      break;
    case 'D':
      [cubeState.F[6], cubeState.F[7], cubeState.F[8],
        cubeState.R[6], cubeState.R[7], cubeState.R[8],
        cubeState.B[6], cubeState.B[7], cubeState.B[8],
        cubeState.L[6], cubeState.L[7], cubeState.L[8]] =
        [cubeState.L[6], cubeState.L[7], cubeState.L[8],
          cubeState.F[6], cubeState.F[7], cubeState.F[8],
          cubeState.R[6], cubeState.R[7], cubeState.R[8],
          cubeState.B[6], cubeState.B[7], cubeState.B[8]];
      break;
    case 'R':
      [cubeState.U[2], cubeState.U[5], cubeState.U[8],
        cubeState.F[2], cubeState.F[5], cubeState.F[8],
        cubeState.D[2], cubeState.D[5], cubeState.D[8],
        cubeState.B[6], cubeState.B[3], cubeState.B[0]] =
        [cubeState.F[2], cubeState.F[5], cubeState.F[8],
          cubeState.D[2], cubeState.D[5], cubeState.D[8],
          cubeState.B[6], cubeState.B[3], cubeState.B[0],
          cubeState.U[2], cubeState.U[5], cubeState.U[8]];
      break;
    case 'L':
      [cubeState.U[0], cubeState.U[3], cubeState.U[6],
        cubeState.F[0], cubeState.F[3], cubeState.F[6],
        cubeState.D[0], cubeState.D[3], cubeState.D[6],
        cubeState.B[8], cubeState.B[5], cubeState.B[2]] =
        [cubeState.B[8], cubeState.B[5], cubeState.B[2],
          cubeState.U[0], cubeState.U[3], cubeState.U[6],
          cubeState.F[0], cubeState.F[3], cubeState.F[6],
          cubeState.D[0], cubeState.D[3], cubeState.D[6]];
      break;
    case 'B':
      [cubeState.U[0], cubeState.U[1], cubeState.U[2],
        cubeState.L[0], cubeState.L[3], cubeState.L[6],
        cubeState.D[8], cubeState.D[7], cubeState.D[6],
        cubeState.R[2], cubeState.R[5], cubeState.R[8]] =
        [cubeState.R[2], cubeState.R[5], cubeState.R[8],
          cubeState.U[2], cubeState.U[1], cubeState.U[0],
          cubeState.L[6], cubeState.L[3], cubeState.L[0],
          cubeState.D[8], cubeState.D[7], cubeState.D[6]];
      break;
  }
}

interface CubeNetModalProps {
  scramble: string;
  open: boolean;
  onClose: () => void;
  size: number; // 2 hoặc 3
}

function getSolvedCubeState(size: number): CubeState {
  if (size === 2) {
    return {
      B: Array(4).fill('blue'),
      U: Array(4).fill('white'),
      D: Array(4).fill('yellow'),
      L: Array(4).fill('orange'),
      R: Array(4).fill('red'),
      F: Array(4).fill('green'),
    };
  } else {
    return {
      B: Array(9).fill('blue'),
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
    };
  }
}

function applyScrambleToCubeState(scramble: string, size: number): CubeState {
  let cubeState = getSolvedCubeState(size);
  const moves = scramble.split(/\s+/);
  moves.forEach((move: string) => {
    if (!move) return;
    let face = move[0] as Face;
    let amount = move.includes("'") ? 3 : 1;
    if (move.includes("2")) amount = 2;
    for (let i = 0; i < amount; i++) {
      if (size === 2) rotateFace2x2(face, cubeState);
      else rotateFace(face, cubeState);
    }
  });
  return cubeState;
}

function rotateFace2x2(face: Face, cubeState: CubeState) {
  // Xoay mặt 2x2 (4 sticker)
  const c = [...cubeState[face]];
  cubeState[face][0] = c[2];
  cubeState[face][1] = c[0];
  cubeState[face][2] = c[3];
  cubeState[face][3] = c[1];
  // Xoay các cạnh xung quanh mặt
  switch (face) {
    case 'F': {
      const temp = [cubeState.U[2], cubeState.U[3]];
      [cubeState.U[2], cubeState.U[3]] = [cubeState.L[1], cubeState.L[3]];
      [cubeState.L[1], cubeState.L[3]] = [cubeState.D[0], cubeState.D[1]];
      [cubeState.D[0], cubeState.D[1]] = [cubeState.R[0], cubeState.R[2]];
      [cubeState.R[0], cubeState.R[2]] = temp;
      break;
    }
    case 'B': {
      const temp = [cubeState.U[0], cubeState.U[1]];
      [cubeState.U[0], cubeState.U[1]] = [cubeState.R[1], cubeState.R[3]];
      [cubeState.R[1], cubeState.R[3]] = [cubeState.D[2], cubeState.D[3]];
      [cubeState.D[2], cubeState.D[3]] = [cubeState.L[0], cubeState.L[2]];
      [cubeState.L[0], cubeState.L[2]] = temp;
      break;
    }
    case 'U': {
      const temp = [cubeState.B[0], cubeState.B[1]];
      [cubeState.B[0], cubeState.B[1]] = [cubeState.R[0], cubeState.R[1]];
      [cubeState.R[0], cubeState.R[1]] = [cubeState.F[0], cubeState.F[1]];
      [cubeState.F[0], cubeState.F[1]] = [cubeState.L[0], cubeState.L[1]];
      [cubeState.L[0], cubeState.L[1]] = temp;
      break;
    }
    case 'D': {
      const temp = [cubeState.B[2], cubeState.B[3]];
      [cubeState.B[2], cubeState.B[3]] = [cubeState.L[2], cubeState.L[3]];
      [cubeState.L[2], cubeState.L[3]] = [cubeState.F[2], cubeState.F[3]];
      [cubeState.F[2], cubeState.F[3]] = [cubeState.R[2], cubeState.R[3]];
      [cubeState.R[2], cubeState.R[3]] = temp;
      break;
    }
    case 'L': {
      const temp = [cubeState.U[0], cubeState.U[2]];
      [cubeState.U[0], cubeState.U[2]] = [cubeState.B[3], cubeState.B[1]];
      [cubeState.B[3], cubeState.B[1]] = [cubeState.D[0], cubeState.D[2]];
      [cubeState.D[0], cubeState.D[2]] = [cubeState.F[0], cubeState.F[2]];
      [cubeState.F[0], cubeState.F[2]] = temp;
      break;
    }
    case 'R': {
      const temp = [cubeState.U[1], cubeState.U[3]];
      [cubeState.U[1], cubeState.U[3]] = [cubeState.F[1], cubeState.F[3]];
      [cubeState.F[1], cubeState.F[3]] = [cubeState.D[1], cubeState.D[3]];
      [cubeState.D[1], cubeState.D[3]] = [cubeState.B[0], cubeState.B[2]];
      [cubeState.B[0], cubeState.B[2]] = temp;
      break;
    }
  }
}

function CubeNetModal({ scramble, open, onClose, size }: CubeNetModalProps) {
  const [cubeState, setCubeState] = useState<CubeState>(() => applyScrambleToCubeState(scramble || '', size));
  useEffect(() => {
    setCubeState(applyScrambleToCubeState(scramble || '', size));
  }, [scramble, size]);
  const layoutGrid: (Face | '')[][] = [
    ['', 'U', '', ''],
    ['L', 'F', 'R', 'B'],
    ['', 'D', '', ''],
  ];
  const faceSize = 70;
  // Helper để render sticker cho từng mặt
  function renderStickers(faceKey: Face) {
    if (size === 2) {
      // 2x2: 4 sticker, grid 2x2
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    } else {
      // 3x3: 9 sticker, grid 3x3
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    }
  }
  return open ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black bg-opacity-60" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-pink-100 rounded-xl p-4 shadow-lg relative" style={{ minWidth: 320, minHeight: 320 }}>
        <button onClick={onClose} className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-700 text-white rounded font-bold">Đóng</button>
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
  // Xác định loại cube (2x2 hoặc 3x3) dựa vào roomMeta.event
  let cubeSize = 3;
  if (roomMeta && roomMeta.event) {
    if (typeof roomMeta.event === 'string' && roomMeta.event.includes('2x2')) cubeSize = 2;
    else cubeSize = 3;
  }


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
    setTurn('me'); // Chủ phòng luôn được chơi trước
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
    setTurn(isCreator ? 'me' : 'opponent');
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
      setTurn(isCreator ? 'me' : 'opponent');
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
    // Lắng nghe sai mật khẩu
    const handleWrongPassword = (data: { message?: string }) => {
      alert(data?.message || "Sai mật khẩu phòng!");
      window.location.href = "/lobby";
    };
    socket.on("wrong-password", handleWrongPassword);
    return () => {
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





  // ĐÃ LOẠI BỎ effect thừa join-room không truyền password, event, displayName


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
    if (waiting || running || turn !== 'me' || myResults.length >= 5 || pendingResult !== null) return;
    let localSpaceHeld = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (pendingResult !== null) return; // Không cho vào prep khi đang chờ xác nhận kết quả
      if (prep) {
        if (!localSpaceHeld) {
          pressStartRef.current = Date.now();
          localSpaceHeld = true;
          setSpaceHeld(true); // Đang giữ phím
        }
      } else if (!prep && !running) {
        setPrep(true);
        setPrepTime(15);
        setDnf(false);
        pressStartRef.current = Date.now();
        localSpaceHeld = true;
        setSpaceHeld(true); // Đang giữ phím
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (prep && localSpaceHeld) {
        const now = Date.now();
        const start = pressStartRef.current;
        pressStartRef.current = null;
        localSpaceHeld = false;
        setSpaceHeld(false); // Thả phím
        if (start && now - start >= 50) {
          setPrep(false);
          setCanStart(true);
        }
      } else {
        setSpaceHeld(false); // Thả phím
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
  return (ms/1000).toFixed(2);
}

function formatStat(val: number|null, showDNF: boolean = false) {
  if (val === null) return showDNF ? 'DNF' : '';
  return (val/1000).toFixed(2);
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
      {/* Hiển thị meta phòng */}
      <div className="w-full flex flex-col items-center justify-center mt-2 mb-1">
        {roomMeta && (
          <div className={mobileShrink ? "text-[13px] font-semibold text-center mb-1" : "text-xl font-semibold text-center mb-2"}>
            <span className="text-blue-300">Tên phòng:</span> <span className="text-white">{roomMeta.displayName || roomId}</span>
            {roomMeta.event && (
              <span className="ml-3 text-pink-300">Thể loại: <span className="font-bold">{roomMeta.event}</span></span>
            )}
          </div>
        )}
      </div>
      {/* Nút rời phòng và nút 🧊 */}
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
            mobileShrink
              ? "px-1 py-0.5 bg-red-600 hover:bg-red-700 text-[9px] rounded font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
              : "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center"
          }
          style={mobileShrink ? { fontSize: 9, minWidth: 0, minHeight: 0, padding: 1 } : {}}
          type="button"
          aria-label="Rời phòng"
          title="Rời phòng"
        >
          {/* Icon logout/exit SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" width={mobileShrink ? 18 : 28} height={mobileShrink ? 18 : 28} style={{ display: 'block' }}>
            <rect x="10" y="8" width="28" height="32" rx="3" stroke="white" strokeWidth="3" fill="none"/>
            <path d="M34 24H18" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M24 16l-8 8 8 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className={
            mobileShrink
              ? "px-1 py-0.5 bg-gray-500 hover:bg-gray-700 text-[13px] rounded font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
              : "px-4 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center"
          }
          style={mobileShrink ? { fontSize: 13, minWidth: 0, minHeight: 0, padding: 1 } : { fontSize: 20 }}
          type="button"
          aria-label="Lưới scramble"
          title="Lưới scramble"
          onClick={() => setShowCubeNet(true)}
        >
          <span role="img" aria-label="cross" style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>✟</span>
        </button>
      {/* Modal lưới Rubik */}
        <CubeNetModal scramble={scramble} open={showCubeNet} onClose={() => setShowCubeNet(false)} size={cubeSize} />
      </div>
      {/* Nút Chat, nút tái đấu và nút luật thi đấu ở góc trên bên phải */}
      <div
        className={
          mobileShrink
            ? "absolute top-0.5 right-0.5 z-50 flex flex-row items-center gap-1"
            : "fixed top-4 right-4 z-50 flex flex-row items-center gap-2"
        }
        style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
      >
        {/* Nút Chat */}
        {/* Nút tái đấu */}
        <div className="flex items-center">
          <button
            onClick={handleRematch}
            disabled={rematchPending || users.length < 2}
            className={
              mobileShrink
                ? `px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${rematchPending ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 bg-gray-600 hover:bg-gray-700 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${rematchPending ? 'opacity-60 cursor-not-allowed' : ''}`
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
        </div>
      {/* Modal xác nhận tái đấu khi nhận được yêu cầu từ đối phương */}
      {rematchModal.show && rematchModal.from === 'opponent' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-60" style={{ backdropFilter: 'blur(2px)' }}>
          <div className={mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[260px] h-[160px] border-2 border-green-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] h-[200px] border-4 border-green-400 flex flex-col items-center justify-center"}>
            <div className="text-lg font-bold text-green-300 mb-4 text-center">Đối thủ muốn tái đấu. Bạn có đồng ý không?</div>
            <div className="flex flex-row gap-4 mt-2">
              <button onClick={() => respondRematch(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">Đồng ý</button>
              <button onClick={() => respondRematch(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold">Từ chối</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal đang chờ đối phương đồng ý tái đấu */}
      {rematchPending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-40" style={{ backdropFilter: 'blur(1px)' }}>
          <div className={mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[220px] h-[100px] border-2 border-green-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[320px] max-w-[95vw] h-[120px] border-4 border-green-400 flex flex-col items-center justify-center"}>
            <div className="text-base font-semibold text-green-200 text-center">Đang chờ đối phương xác nhận tái đấu...</div>
          </div>
        </div>
      )}
      {/* Modal thông báo đối phương đã từ chối tái đấu */}
      {rematchDeclined && (
        <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black bg-opacity-40" style={{ backdropFilter: 'blur(1px)' }}>
          <div className={mobileShrink ? "bg-gray-900 rounded p-2 w-[80vw] max-w-[200px] h-[80px] border-2 border-red-400 flex flex-col items-center justify-center" : "bg-gray-900 rounded-2xl p-6 w-[300px] max-w-[90vw] h-[100px] border-4 border-red-400 flex flex-col items-center justify-center"}>
            <div className="text-base font-semibold text-red-300 text-center">Đối thủ đã từ chối tái đấu</div>
          </div>
        </div>
      )}
        <div className="flex items-center relative">
          <button
            onClick={() => { setShowChat(true); setHasNewChat(false); }}
            className={
              mobileShrink
                ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
                : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center"
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className={mobileShrink ? "bg-gray-900 rounded p-2 w-[90vw] max-w-[260px] h-[320px] border-2 border-blue-400 relative flex flex-col" : "bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] h-[420px] border-4 border-blue-400 relative flex flex-col"}
            style={mobileShrink ? { fontSize: 10, overflow: 'hidden' } : { overflow: 'hidden' }}
          >
            <button
              onClick={() => setShowChat(false)}
              className={mobileShrink ? "absolute top-1 right-1 px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold" : "absolute top-3 right-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-base rounded-lg font-bold"}
              style={mobileShrink ? { minWidth: 0, minHeight: 0 } : {}}
              type="button"
            >Đóng</button>
            <div className={mobileShrink ? "text-[11px] font-bold text-blue-300 mb-1 text-center" : "text-xl font-bold text-blue-300 mb-3 text-center"}>
              Chat phòng
            </div>
            <div
              className={mobileShrink ? "flex-1 overflow-y-auto pr-1 mb-1" : "flex-1 overflow-y-auto pr-2 mb-2"}
              style={mobileShrink ? { maxHeight: 200 } : { maxHeight: 300 }}
            >
              {chatMessages.length === 0 && (
                <div className="text-gray-400 text-center mt-4">Chưa có tin nhắn nào</div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={
                    msg.from === 'me'
                      ? (mobileShrink ? "flex justify-end mb-1" : "flex justify-end mb-2")
                      : (mobileShrink ? "flex justify-start mb-1" : "flex justify-start mb-2")
                  }
                >
                  <div
                    className={
                      msg.from === 'me'
                        ? (mobileShrink ? "bg-blue-500 text-white px-2 py-1 rounded-lg max-w-[70%] text-[10px]" : "bg-blue-500 text-white px-3 py-2 rounded-lg max-w-[70%] text-base")
                        : (mobileShrink ? "bg-gray-700 text-white px-2 py-1 rounded-lg max-w-[70%] text-[10px]" : "bg-gray-700 text-white px-3 py-2 rounded-lg max-w-[70%] text-base")
                    }
                    style={{ wordBreak: 'break-word' }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form
              className={mobileShrink ? "flex flex-row items-center gap-1 mt-1" : "flex flex-row items-center gap-2 mt-2"}
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
                className={mobileShrink ? "px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center justify-center" : "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-bold flex items-center justify-center"}
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
        </div>
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
              setSpaceHeld(true); // Đang giữ tay
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
              setSpaceHeld(false); // Thả tay
              // 1. Tap and release to enter prep
              if (!prep && !running && turn === 'me') {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
                return;
              }
              // 2. In prep, giữ >=0.5s rồi thả ra để start timer
              if (prep && !running) {
                if (start && now - start >= 50) {
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
              if (waiting || myResults.length >= 5 || pendingResult !== null) return;
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
            <div className="flex flex-row items-center justify-center gap-2 mb-2">
              <button
                className={mobileShrink ? "px-2 py-1 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 font-bold text-white" : "px-5 py-2 text-xl rounded-2xl bg-green-600 hover:bg-green-700 font-bold text-white"}
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
                className={mobileShrink ? `px-2 py-1 text-[13px] rounded-lg bg-yellow-500 font-bold text-white` : `px-5 py-2 text-xl rounded-2xl bg-yellow-500 font-bold text-white`}
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
                className={mobileShrink ? `px-2 py-1 text-[13px] rounded-lg bg-red-600 font-bold text-white` : `px-5 py-2 text-xl rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-white`}
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

          {/* Nút Xuất kết quả và Tái đấu sau khi trận đấu kết thúc */}
          {myResults.length >= 5 && opponentResults.length >= 5 && (
            <div className="flex flex-row items-center justify-center gap-2 mb-2">
              <button
                className={mobileShrink ? "px-2 py-1 text-[10px] rounded bg-blue-600 hover:bg-blue-700 font-bold text-white" : "px-4 py-2 text-base rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white"}
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
          <span className={mobileShrink ? "font-semibold text-[8px] text-pink-300" : "font-semibold text-lg text-pink-300"}>{opponentName}</span>
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
    </div>
  );
}

// Dynamic import cho VideoCall tránh lỗi SSR, không cần generic
const VideoCall = dynamic(() => import('@/components/VideoCall'), { ssr: false });