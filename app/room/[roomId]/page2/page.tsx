"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import React from "react";
import type { DailyParticipant } from '@daily-co/daily-js';
// import Peer from "simple-peer"; // REMOVED
// import DailyVideoCall from "@/components/DailyVideoCall"; // Sử dụng dynamic import thay thế
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



export default function RoomPage() {
  // Modal xác nhận rời phòng
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [insufficientModal, setInsufficientModal] = useState<{ show: boolean; message: string; forceClose: boolean }>({ show: false, message: '', forceClose: false });


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
  // State cho chat - Updated for 2vs2
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{from: string, text: string, team?: 'A'|'B', playerName?: string}[]>([]);
  const [hasNewChat, setHasNewChat] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  // Ref cho video local và remote để truyền vào DailyVideoCall
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Ref cho 2 video bổ sung trong 2vs2 mode
  const otherPerson1VideoRef = useRef<HTMLVideoElement>(null);
  const otherPerson2VideoRef = useRef<HTMLVideoElement>(null);
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
  const [users, setUsers] = useState<string[]>([]); // userId array
  const [userId, setUserId] = useState<string>("");
  const [opponentId, setOpponentId] = useState<string>("");
  const [waiting, setWaiting] = useState<boolean>(true);
  // turnUserId: userId của người được quyền giải (đồng bộ từ server)
  const [turnUserId, setTurnUserId] = useState<string>("");
  const [myResults, setMyResultsOld] = useState<(number|null)[]>([]);
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

  const waitingRef = useRef(waiting);
  const runningRef = useRef(running);
  const prepRef = useRef(prep);
  const pendingResultRef = useRef<number|null>(pendingResult);
  const typingModeRef = useRef(isTypingMode);
  const lockedDue2DNFRef = useRef(isLockedDue2DNF);
  const myResultsRef = useRef<(number|null)[]>([]);
  const userIdNormalizedRef = useRef<string>("");
  const canStartRef = useRef(canStart);
  
  // State cho điểm của từng đội theo vòng (Team A, Team B)
  const [teamAScores, setTeamAScores] = useState<number[]>([0, 0, 0, 0, 0]); // Điểm của Team A qua 5 vòng
  const [teamBScores, setTeamBScores] = useState<number[]>([0, 0, 0, 0, 0]); // Điểm của Team B qua 5 vòng
  
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  // Thêm khai báo biến roomUrl đúng chuẩn
  const [roomUrl, setRoomUrl] = useState<string>('');
  const [hostId, setHostId] = useState<string>('');

  // === TEAM MANAGEMENT STATES FOR 2VS2 ===
  // Team structure: { teamId: string, players: TeamPlayer[] }
  const [teamA, setTeamA] = useState<{ teamId: string, players: TeamPlayer[] }>({ teamId: 'A', players: [] });
  const [teamB, setTeamB] = useState<{ teamId: string, players: TeamPlayer[] }>({ teamId: 'B', players: [] });
  const [currentTeam, setCurrentTeam] = useState<'A' | 'B'>('A'); // Team đang có lượt chơi
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0); // Index của player trong team đang chơi
  const [myTeam, setMyTeam] = useState<'A' | 'B' | null>(null); // Team của tôi
  const [myTeamIndex, setMyTeamIndex] = useState<number>(-1); // Vị trí của tôi trong team
  
  // Team results: mỗi team có kết quả riêng
  const [teamAResults, setTeamAResults] = useState<(number|null)[][]>([]); // [playerIndex][solveIndex]
  const [teamBResults, setTeamBResults] = useState<(number|null)[][]>([]); // [playerIndex][solveIndex]

  const teamADnfCounts = React.useMemo(() => (
    teamAResults.map(results => Array.isArray(results) ? results.filter(time => time === null).length : 0)
  ), [teamAResults]);

  const teamBDnfCounts = React.useMemo(() => (
    teamBResults.map(results => Array.isArray(results) ? results.filter(time => time === null).length : 0)
  ), [teamBResults]);

  const teamAHasDoubleDNF = React.useMemo(() => teamADnfCounts.some(count => count >= 2), [teamADnfCounts]);
  const teamBHasDoubleDNF = React.useMemo(() => teamBDnfCounts.some(count => count >= 2), [teamBDnfCounts]);

  const teamAMaxDnf = React.useMemo(() => teamADnfCounts.reduce((max, count) => Math.max(max, count), 0), [teamADnfCounts]);
  const teamBMaxDnf = React.useMemo(() => teamBDnfCounts.reduce((max, count) => Math.max(max, count), 0), [teamBDnfCounts]);

  // Hàm tính điểm theo thứ hạng trong một vòng, chỉ cập nhật khi đủ 4 kết quả
  const calculateRoundScores = React.useCallback((roundIndex: number) => {
    if (roundIndex < 0 || roundIndex >= 5) return;

    const entries = [
      { team: 'A', player: 0, time: teamAResults[0]?.[roundIndex] },
      { team: 'A', player: 1, time: teamAResults[1]?.[roundIndex] },
      { team: 'B', player: 0, time: teamBResults[0]?.[roundIndex] },
      { team: 'B', player: 1, time: teamBResults[1]?.[roundIndex] }
    ];

    // Nếu bất kỳ người chơi nào chưa có kết quả (undefined) thì không cập nhật điểm
    const hasIncompleteResult = entries.some(entry => typeof entry.time === 'undefined');
    if (hasIncompleteResult) {
      return;
    }

    const sortedByTime = [...entries].sort((a, b) => {
      const aTime = a.time === null || typeof a.time === 'undefined' ? Number.POSITIVE_INFINITY : a.time;
      const bTime = b.time === null || typeof b.time === 'undefined' ? Number.POSITIVE_INFINITY : b.time;
      return aTime - bTime;
    });

    const basePoints = [3, 2, 1, 0];
    let teamAScore = 0;
    let teamBScore = 0;

    sortedByTime.forEach((entry, index) => {
      const rawPoints = basePoints[index] ?? 0;
      const awardedPoints = entry.time === null ? 0 : rawPoints;

      if (entry.team === 'A') {
        teamAScore += awardedPoints;
      } else {
        teamBScore += awardedPoints;
      }
    });

    setTeamAScores(prev => {
      const newScores = [...prev];
      newScores[roundIndex] = teamAScore;
      return newScores;
    });

    setTeamBScores(prev => {
      const newScores = [...prev];
      newScores[roundIndex] = teamBScore;
      return newScores;
    });
  }, [teamAResults, teamBResults]);
  
  // useEffect để tự động tính điểm khi có kết quả mới nhưng chỉ khi hoàn thành cả vòng
  useEffect(() => {
    for (let round = 0; round < 5; round++) {
      calculateRoundScores(round);
    }
  }, [calculateRoundScores]);

  const computeTeamAverage = React.useCallback((teamResults: (number|null)[][]) => {
    const validTimes = teamResults
      .flat()
      .filter((time): time is number => typeof time === 'number' && time > 0);
    if (validTimes.length === 0) return null;
    return validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
  }, []);
  
  // Current player info
  const [currentPlayerId, setCurrentPlayerId] = useState<string>("");
  const [currentPlayerName, setCurrentPlayerName] = useState<string>("");

  // --- Thêm logic lấy customBg và set background giống lobby ---
type User = {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  customBg?: string;
};

type RoomUser = {
  userId: string;
  userName: string;
  team?: 'team1' | 'team2' | null;
  position?: number | null;
  role?: 'creator' | 'player';
  isObserver?: boolean;
  isReady?: boolean;
};

type TeamPlayer = {
  userId: string;
  userName: string;
  position?: number | null;
};

type RematchParticipant = {
  userId: string;
  userName: string;
};

type RematchDialogState = {
  show: boolean;
  initiatorId: string | null;
  participants: RematchParticipant[];
  status: 'waiting' | 'confirmed';
};

const [user, setUser] = typeof window !== 'undefined' ? useState<User | null>(null) : [null, () => {}];
const [customBg, setCustomBg] = typeof window !== 'undefined' ? useState<string | null>(null) : [null, () => {}];

const mergeRoomUsers = (users: RoomUser[]): RoomUser[] => {
  const merged = new Map<string, RoomUser>();

  users.forEach(rawUser => {
    if (!rawUser) return;
    const normalizedId = typeof rawUser.userId === 'string'
      ? rawUser.userId
      : rawUser.userId != null
        ? String(rawUser.userId)
        : '';

    const normalizedUser: RoomUser = {
      ...rawUser,
      userId: normalizedId,
    };

    const keySuffix = normalizedId.slice(-6) || normalizedId;
    const key = `${normalizedUser.userName || ''}|${keySuffix}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, normalizedUser);
      return;
    }

    const preferNormalized = (
      (!!normalizedUser.team && !existing.team) ||
      (typeof normalizedUser.position === 'number' && typeof existing.position !== 'number') ||
      (normalizedId.length > (existing.userId?.length ?? 0))
    );

    const base = preferNormalized ? existing : normalizedUser;
    const overlay = preferNormalized ? normalizedUser : existing;

    const combined: RoomUser = {
      ...base,
      ...overlay,
      team: overlay.team ?? base.team ?? null,
      position: overlay.position ?? base.position ?? null,
      role: overlay.role ?? base.role,
      isObserver: overlay.isObserver ?? base.isObserver,
      isReady: overlay.isReady ?? base.isReady,
      userName: overlay.userName ?? base.userName,
      userId: preferNormalized ? normalizedId : base.userId,
    };

    merged.set(key, combined);
  });

  return Array.from(merged.values());
};

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
  const [pendingUsers, setPendingUsers] = useState<RoomUser[] | null>(null);
  // Thêm state để kiểm soát việc hiện nút xác nhận sau 1s
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);

  const [rematchDialog, setRematchDialog] = useState<RematchDialogState>({
    show: false,
    initiatorId: null,
    participants: [],
    status: 'waiting',
  });
  const [rematchAcceptedIds, setRematchAcceptedIds] = useState<string[]>([]);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchInfoMessage, setRematchInfoMessage] = useState<string | null>(null);

    // Ref cho khối chat để auto-scroll
  const chatListRef = useRef<HTMLDivElement>(null);

  const normalizeId = (value?: string | null) => (value ?? "").trim().toLowerCase();

  const normalizedUserId = React.useMemo(() => normalizeId(userId), [userId]);
  const normalizedHostId = React.useMemo(() => normalizeId(hostId), [hostId]);

  useEffect(() => {
    if (!normalizedUserId || !normalizedHostId) {
      setIsCreator(false);
      return;
    }
    setIsCreator(normalizedUserId === normalizedHostId);
  }, [normalizedUserId, normalizedHostId]);

  const totalActivePlayers = React.useMemo(() => {
    const collectIds = (team: { players: TeamPlayer[] }) =>
      team.players
        .map(player => normalizeId(player?.userId))
        .filter(id => id.length > 0);
    const unique = new Set<string>([...collectIds(teamA), ...collectIds(teamB)]);
    return unique.size;
  }, [teamA, teamB]);

  const rematchAcceptedNormalized = React.useMemo(
    () => rematchAcceptedIds.map(id => normalizeId(id)),
    [rematchAcceptedIds]
  );

  const isRematchParticipant = React.useMemo(
    () => rematchDialog.participants.some(participant => normalizeId(participant.userId) === normalizedUserId),
    [rematchDialog.participants, normalizedUserId]
  );

  const hasAcceptedRematch = React.useMemo(
    () => rematchAcceptedNormalized.includes(normalizedUserId),
    [rematchAcceptedNormalized, normalizedUserId]
  );

  const rematchInitiatorIsMe = React.useMemo(
    () => rematchDialog.initiatorId ? normalizeId(rematchDialog.initiatorId) === normalizedUserId : false,
    [rematchDialog.initiatorId, normalizedUserId]
  );

  const rematchAllAccepted = React.useMemo(
    () => rematchDialog.participants.length > 0 &&
      rematchDialog.participants.every(participant => rematchAcceptedNormalized.includes(normalizeId(participant.userId))),
    [rematchDialog.participants, rematchAcceptedNormalized]
  );

  const rematchParticipantsCount = rematchDialog.participants.length;
  const rematchAcceptedCount = rematchAcceptedNormalized.length;
  const rematchWaitingCount = Math.max(0, rematchParticipantsCount - rematchAcceptedCount);

  const rematchInitiatorName = (() => {
    if (!rematchDialog.initiatorId) return null;
    const normalizedInitiator = normalizeId(rematchDialog.initiatorId);
    const participantMatch = rematchDialog.participants.find(participant => normalizeId(participant.userId) === normalizedInitiator);
    if (participantMatch?.userName?.trim()) return participantMatch.userName.trim();
    const allPlayers = [...(teamA?.players ?? []), ...(teamB?.players ?? [])];
    const playerMatch = allPlayers.find(player => normalizeId(player.userId) === normalizedInitiator);
    if (playerMatch?.userName?.trim()) return playerMatch.userName.trim();
    if (normalizedInitiator === normalizedUserId && userName?.trim()) return userName.trim();
    return null;
  })();

  const rematchPrimaryMessage = (() => {
    if (rematchDialog.status === 'confirmed' || rematchAllAccepted) {
      return 'Tất cả thành viên đã đồng ý. Đang chuẩn bị trận đấu mới...';
    }
    if (rematchInitiatorIsMe) {
      return 'Bạn đã mở yêu cầu tái đấu. Cần sự đồng ý của tất cả thành viên.';
    }
    const baseLabel = rematchInitiatorName ? `Chủ phòng ${rematchInitiatorName}` : 'Chủ phòng';
    return `${baseLabel} muốn tái đấu. Vui lòng chọn "Đồng ý" để tham gia trận mới.`;
  })();

  const rematchProgressMessage = (() => {
    if (rematchParticipantsCount === 0) {
      return 'Đang tải danh sách thành viên...';
    }
    if (rematchDialog.status === 'confirmed' || rematchAllAccepted) {
      return 'Đã đủ 4/4 thành viên đồng ý. Hệ thống sẽ reset ngay.';
    }
    if (hasAcceptedRematch) {
      if (rematchWaitingCount > 0) {
        return `Bạn đã đồng ý. Đang chờ ${rematchWaitingCount} người nữa.`;
      }
      return 'Bạn đã đồng ý. Đang chờ hệ thống xử lý.';
    }
    return `Hiện có ${rematchAcceptedCount}/${rematchParticipantsCount} người đã đồng ý.`;
  })();

  const shouldShowRematchAcceptButton = !hasAcceptedRematch && rematchDialog.status !== 'confirmed';
  const shouldShowRematchCancelButton = rematchInitiatorIsMe && rematchDialog.status !== 'confirmed';
  const shouldShowRematchDeclineButton = !rematchInitiatorIsMe && rematchDialog.status !== 'confirmed';

  const getCurrentUserId = () => userIdNormalizedRef.current || normalizeId(userId);

  // === HELPER FUNCTIONS FOR 2VS2 ===
  const isMyTurn = () => {
    const currentUser = getCurrentUserId();
    const normalizedTurn = normalizeId(turnUserId);
    if (!currentUser || !normalizedTurn) return false;
    return currentUser === normalizedTurn;
  };

  // Enhanced IsMyTurn function for timer control
  const IsMyTurn = () => {
    const currentUser = getCurrentUserId();
    const normalizedTurn = normalizeId(turnUserId);
    if (!currentUser || !normalizedTurn) return false;
    return currentUser === normalizedTurn;
  };

  const isMyTurnRef = useRef<boolean>(false);
  const isMyTurnNow = isMyTurn();
  isMyTurnRef.current = isMyTurnNow;
  const myTurn = isMyTurnNow || prep || running || canStart;

  const mySolveCount = React.useMemo(() => {
    if (myTeam && myTeamIndex !== -1) {
      const teamResults = myTeam === 'A' ? teamAResults : teamBResults;
      const playerResults = teamResults[myTeamIndex];
      return Array.isArray(playerResults) ? playerResults.length : 0;
    }
    return myResults.length;
  }, [myTeam, myTeamIndex, myResults, teamAResults, teamBResults]);

  const getCurrentTeam = () => {
    return currentTeam === 'A' ? teamA : teamB;
  };

  const getMyTeam = () => {
    return myTeam === 'A' ? teamA : teamB;
  };

  const getMyResults = () => {
    if (!myTeam || myTeamIndex === -1) {
      return [...myResultsRef.current];
    }
    return myTeam === 'A' ? teamAResults[myTeamIndex] : teamBResults[myTeamIndex];
  };

  const setMyResults = (newResults: (number|null)[]) => {
    myResultsRef.current = [...newResults];
    setMyResultsOld(newResults);

    if (!myTeam || myTeamIndex === -1) {
      return;
    }

    if (myTeam === 'A') {
      setTeamAResults(prev => {
        const newTeamResults = prev.map(results => Array.isArray(results) ? [...results] : []);
        while (newTeamResults.length <= myTeamIndex) {
          newTeamResults.push([]);
        }
        newTeamResults[myTeamIndex] = [...newResults];
        return newTeamResults;
      });
    } else {
      setTeamBResults(prev => {
        const newTeamResults = prev.map(results => Array.isArray(results) ? [...results] : []);
        while (newTeamResults.length <= myTeamIndex) {
          newTeamResults.push([]);
        }
        newTeamResults[myTeamIndex] = [...newResults];
        return newTeamResults;
      });
    }
  };

  const serverTeamToLocal = (team?: string | null): 'A' | 'B' | null => {
    if (team === 'team1') return 'A';
    if (team === 'team2') return 'B';
    return null;
  };

  const fallbackPlayerName = (teamId: 'A' | 'B', index: number) => {
    const base = teamId === 'A' ? 1 : 3;
    return `Player ${base + index}`;
  };

  const pushTeamResult = useCallback(
    (teamId: 'A' | 'B', playerIndex: number, value: number | null) => {
      if (playerIndex < 0) return;

  const applyUpdate = (prev: (number | null)[][]) => {
        const next = prev.map(results => Array.isArray(results) ? [...results] : []);
        while (next.length <= playerIndex) {
          next.push([]);
        }
        const playerResults = Array.isArray(next[playerIndex]) ? [...next[playerIndex]] : [];
        if (playerResults.length >= 5) {
          next[playerIndex] = playerResults;
          return next;
        }
        playerResults.push(value);
        next[playerIndex] = playerResults;
        return next;
      };

      if (teamId === 'A') {
        setTeamAResults(prev => applyUpdate(prev));
      } else {
        setTeamBResults(prev => applyUpdate(prev));
      }
    },
    [setTeamAResults, setTeamBResults]
  );

  const ensureTeamPlayerSlot = useCallback(
    (teamId: 'A' | 'B', playerIndex: number, resolvedUserId: string, playerName?: string | null, position?: number | null) => {
      if (playerIndex < 0) return;

      const updater = teamId === 'A' ? setTeamA : setTeamB;

      updater(prev => {
        const players = [...prev.players];
        let changed = false;
        while (players.length <= playerIndex) {
          players.push({ userId: '', userName: '', position: undefined });
          changed = true;
        }

        const existing = players[playerIndex];
        const normalizedName = playerName && playerName.trim().length > 0
          ? playerName.trim()
          : existing?.userName || fallbackPlayerName(teamId, playerIndex);
        const normalizedPosition = typeof position === 'number'
          ? position
          : (existing?.position ?? null);

        if (!existing || existing.userId !== resolvedUserId || existing.userName !== normalizedName || existing.position !== normalizedPosition) {
          players[playerIndex] = {
            userId: resolvedUserId,
            userName: normalizedName,
            position: typeof normalizedPosition === 'number' ? normalizedPosition : undefined,
          };
          changed = true;
        }

        return changed ? { ...prev, players } : prev;
      });
    },
    [setTeamA, setTeamB]
  );
  useEffect(() => { waitingRef.current = waiting; }, [waiting]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { prepRef.current = prep; }, [prep]);
  useEffect(() => { canStartRef.current = canStart; }, [canStart]);
  useEffect(() => { pendingResultRef.current = pendingResult; }, [pendingResult]);
  useEffect(() => { typingModeRef.current = isTypingMode; }, [isTypingMode]);
  useEffect(() => { lockedDue2DNFRef.current = isLockedDue2DNF; }, [isLockedDue2DNF]);
  // Cập nhật isMyTurnRef ngay lập tức khi lượt chơi thay đổi
  useEffect(() => {
    isMyTurnRef.current = isMyTurnNow;
  }, [isMyTurnNow]);
  useEffect(() => {
    userIdNormalizedRef.current = normalizeId(userId);
  }, [userId]);
  useEffect(() => {
    if (!myTeam || myTeamIndex === -1) {
      myResultsRef.current = [];
      return;
    }
    const source = myTeam === 'A' ? teamAResults[myTeamIndex] : teamBResults[myTeamIndex];
    myResultsRef.current = Array.isArray(source) ? [...source] : [];
  }, [teamAResults, teamBResults, myTeam, myTeamIndex]);

  // Auto-scroll xuống cuối khi mở chat hoặc có tin nhắn mới
  useEffect(() => {
    if (showChat && chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [showChat, chatMessages]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    const handleChat = (payload: { roomId?: string; userId?: string; userName?: string; message?: string }) => {
      if (!payload || !payload.message) return;
      const senderIdNormalized = normalizeId(payload.userId);
      if (senderIdNormalized && senderIdNormalized === normalizedUserId) return;

      const roomUpper = roomId.toUpperCase();
      if (payload.roomId && payload.roomId.toUpperCase() !== roomUpper) return;

      const withTeam = () => {
        const enriched = [
          ...(Array.isArray(teamA?.players) ? teamA.players.map(player => ({ ...player, teamId: 'A' as const })) : []),
          ...(Array.isArray(teamB?.players) ? teamB.players.map(player => ({ ...player, teamId: 'B' as const })) : []),
        ];
        const found = enriched.find(player => normalizeId(player.userId) === senderIdNormalized);
        if (!found) return { team: undefined, name: undefined } as { team: 'A' | 'B' | undefined; name: string | undefined };
        return { team: found.teamId, name: found.userName };
      };

      const { team, name } = withTeam();
      const resolvedName = payload.userName?.trim() || name?.trim() || 'Người chơi khác';

      setChatMessages(prev => [...prev, { from: 'opponent', text: payload.message!, team, playerName: resolvedName }]);
      if (!showChat) {
        setHasNewChat(true);
      }
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          void audioRef.current.play();
        } catch (err) {
          // ignore autoplay restrictions
        }
      }
    };

    socket.on('chat', handleChat);
    return () => {
      socket.off('chat', handleChat);
    };
  }, [roomId, normalizedUserId, teamA, teamB, showChat]);

  useEffect(() => {
    if (!rematchInfoMessage) return;
    const timeout = setTimeout(() => setRematchInfoMessage(null), 8000);
    return () => clearTimeout(timeout);
  }, [rematchInfoMessage]);

  useEffect(() => {
    if (pendingResult !== null && !running && !prep) {
      setShowConfirmButtons(false);
  const timer = setTimeout(() => setShowConfirmButtons(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowConfirmButtons(false);
    }
  }, [pendingResult, running, prep]);
  // Lắng nghe danh sách users và hostId từ server
  useEffect(() => {
    const socket = getSocket();
    const handleUsers = (data: { users: RoomUser[]; hostId?: string }) => {
      const normalizedUsers = mergeRoomUsers(data.users);
      setUsers(normalizedUsers.map(u => u.userId));
      setWaiting(normalizedUsers.length < 2);
      setPendingUsers(normalizedUsers);

      const creatorUser = normalizedUsers.find(user => user.role === 'creator');
      if (creatorUser?.userId) {
        setHostId(creatorUser.userId);
      } else if (data.hostId) {
        setHostId(data.hostId);
      } else {
        setHostId('');
      }

      if (normalizedUsers.length !== users.length) {
        setIsLockedDue2DNF(false);
        // setShowLockedDNFModal(false); // ĐÃ HỦY
        setLockDNFInfo(null);
      }
    };
    socket.on('room-users', handleUsers);
    return () => {
      socket.off('room-users', handleUsers);
    };
  }, [userId]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    const normalizedRoom = roomId.toUpperCase();
    const handleInsufficient = (payload: { roomId?: string }) => {
      if (payload.roomId && payload.roomId.toUpperCase() !== normalizedRoom) return;
      setInsufficientModal({
        show: true,
        message: 'Phòng thiếu người nên trận đấu bị hủy. Vui lòng rời phòng để quay lại sảnh.',
        forceClose: false,
      });
    };

    const handleRestored = (payload: { roomId?: string }) => {
      if (payload.roomId && payload.roomId.toUpperCase() !== normalizedRoom) return;
      setInsufficientModal({ show: false, message: '', forceClose: false });
    };

    const handleForceClose = (payload: { roomId?: string; reason?: string }) => {
      if (payload.roomId && payload.roomId.toUpperCase() !== normalizedRoom) return;
      setInsufficientModal({
        show: true,
        message: payload.reason === 'empty'
          ? 'Phòng đã bị đóng vì không còn người chơi. Bạn sẽ được chuyển về sảnh.'
          : 'Phòng đã bị đóng do không đủ người chơi trong 5 phút. Bạn sẽ được chuyển về sảnh.',
        forceClose: true,
      });

      setTimeout(() => {
        const socketRef = getSocket();
        if (roomId && userId) {
          socketRef.emit('leave-room', { roomId, userId });
        }
        router.push('/lobby');
      }, 1500);
    };

    socket.on('room-insufficient-players', handleInsufficient);
    socket.on('room-players-restored', handleRestored);
    socket.on('room-force-close', handleForceClose);
    socket.on('room-deleted', handleForceClose);

    return () => {
      socket.off('room-insufficient-players', handleInsufficient);
      socket.off('room-players-restored', handleRestored);
      socket.off('room-force-close', handleForceClose);
      socket.off('room-deleted', handleForceClose);
    };
  }, [roomId, userId, router]);

  // === TEAM ASSIGNMENT LOGIC FOR 2VS2 ===
  useEffect(() => {
    if (!pendingUsers || pendingUsers.length < 4) {
      return;
    }

    const activePlayers = pendingUsers.filter(player => !player.isObserver);
    if (activePlayers.length < 4) {
      return;
    }
  const hasTeamMetadata = activePlayers.every(player => player.team === 'team1' || player.team === 'team2');
  const normalizedUserId = normalizeId(userId);

    if (hasTeamMetadata) {
      const team1Players = activePlayers.filter(player => player.team === 'team1');
      const team2Players = activePlayers.filter(player => player.team === 'team2');

      if (team1Players.length === 2 && team2Players.length === 2) {
        const mapToTeamPlayers = (players: RoomUser[]): TeamPlayer[] =>
          [...players]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map(player => ({
              userId: player.userId,
              userName: player.userName,
              position: player.position ?? undefined
            }));

        const formattedTeamA = mapToTeamPlayers(team1Players);
        const formattedTeamB = mapToTeamPlayers(team2Players);

        setTeamA({ teamId: 'A', players: formattedTeamA });
        setTeamB({ teamId: 'B', players: formattedTeamB });

        setTeamAResults(Array.from({ length: formattedTeamA.length }, () => [] as (number | null)[]));
        setTeamBResults(Array.from({ length: formattedTeamB.length }, () => [] as (number | null)[]));

        const myPlayer = activePlayers.find(player => normalizeId(player.userId) === normalizedUserId);
        if (myPlayer) {
          const myTeamId = myPlayer.team === 'team1' ? 'A' : 'B';
          const myTeamPlayers = myTeamId === 'A' ? formattedTeamA : formattedTeamB;
          const myIndex = myTeamPlayers.findIndex(player => normalizeId(player.userId) === normalizedUserId);
          setMyTeam(myTeamId);
          setMyTeamIndex(myIndex);
        }

        setCurrentTeam('A');
        setCurrentPlayerIndex(0);
        if (formattedTeamA[0]) {
          setCurrentPlayerId(formattedTeamA[0].userId);
          setCurrentPlayerName(formattedTeamA[0].userName);
        }
        return;
      }
    }

    // Fallback: nếu chưa có metadata team từ server, phân chia tạm thời
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const newTeamA = {
      teamId: 'A',
      players: shuffled.slice(0, 2)
    };
    const newTeamB = {
      teamId: 'B',
      players: shuffled.slice(2, 4)
    };

    setTeamA({
      teamId: 'A',
      players: newTeamA.players.map(player => ({ userId: player.userId, userName: player.userName }))
    });
    setTeamB({
      teamId: 'B',
      players: newTeamB.players.map(player => ({ userId: player.userId, userName: player.userName }))
    });

    const myPlayer = shuffled.find(player => normalizeId(player.userId) === normalizedUserId);
    if (myPlayer) {
      const myTeamId = newTeamA.players.some(player => normalizeId(player.userId) === normalizedUserId) ? 'A' : 'B';
      const myTeamPlayers = myTeamId === 'A' ? newTeamA.players : newTeamB.players;
      const myIndex = myTeamPlayers.findIndex(player => normalizeId(player.userId) === normalizedUserId);
      setMyTeam(myTeamId);
      setMyTeamIndex(myIndex);
    }

    setTeamAResults([[] as (number | null)[], [] as (number | null)[]]);
    setTeamBResults([[] as (number | null)[], [] as (number | null)[]]);
    setCurrentTeam('A');
    setCurrentPlayerIndex(0);
    setCurrentPlayerId(newTeamA.players[0].userId);
    setCurrentPlayerName(newTeamA.players[0].userName);
  }, [pendingUsers, userId]);


// Khi userId hoặc pendingUsers thay đổi, luôn cập nhật opponentId/opponentName

  // Reset trạng thái khi có sự thay đổi người dùng (ra/vào phòng)
  useEffect(() => {
    if (!userId || !pendingUsers) return;
    const opp = pendingUsers.find(u => u.userId !== userId);
    if (opp) {
      setOpponentId(opp.userId);
      setOpponentName(opp.userName || 'Đối thủ');
    }

    // Luôn mở khóa khi có thay đổi người chơi
    setIsLockedDue2DNF(false);
    // setShowLockedDNFModal(false); // ĐÃ HỦY
    setLockDNFInfo(null);
  }, [userId, pendingUsers]);



  // State cho timer và chuẩn bị của đối thủ
  const [opponentPrep, setOpponentPrep] = useState(false);
  const [opponentPrepTime, setOpponentPrepTime] = useState(15);
  const [opponentRunning, setOpponentRunning] = useState(false);
  const [opponentTimer, setOpponentTimer] = useState(0);
  const [activeRemoteUserId, setActiveRemoteUserId] = useState<string>("");
  const opponentTimerRef = useRef(0);
  const opponentPrepIntervalRef = useRef<NodeJS.Timeout|null>(null);
  const opponentAnimIdRef = useRef<number| null>(null);
  const opponentBaseMsRef = useRef<number>(0);
  const opponentLastTsRef = useRef<number>(0);

  // Khóa các nút chức năng khi bất kỳ lượt giải nào đang chuẩn bị hoặc chạy
  const isSolveLocked = prep || running || canStart || pendingResult !== null || opponentPrep || opponentRunning;

  const rematchButtonDisabled = !isCreator || isSolveLocked || rematchPending || totalActivePlayers < 4;
  const rematchButtonTooltip = !isCreator
    ? "Chỉ chủ phòng mới có thể mở tái đấu"
    : isSolveLocked
      ? "Không thể tái đấu khi đang xử lý lượt hiện tại"
      : rematchPending
        ? "Đang chờ tất cả thành viên đồng ý tái đấu"
        : totalActivePlayers < 4
          ? "Cần đủ 4 người chơi để tái đấu"
          : "Tái đấu";

  // Lắng nghe socket để đồng bộ timer-prep và timer-update từ đối thủ (2vs2)
  useEffect(() => {
    // Đảm bảo roomId, userId đã được khai báo trước khi dùng
    if (!roomId || !userId) return;
    const socket = getSocket();
    // Nhận sự kiện đối thủ bắt đầu hoặc đang đếm ngược chuẩn bị
    type PrepPayload = { roomId: string; userId: string; remaining: number };
    const handleOpponentPrep = ({ roomId: rid, userId: uid, remaining }: PrepPayload) => {
      if (rid !== roomId || uid === userId) return;
      setActiveRemoteUserId(uid);
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
    const handleOpponentTimer = ({ roomId: rid, userId: uid, ms, running, finished }: TimerPayload) => {
      if (rid !== roomId || uid === userId) return;
      setActiveRemoteUserId(uid);
      
      if (running) {
        // Khi đối thủ bắt đầu timer, tắt chuẩn bị và bắt đầu timer
        setOpponentPrep(false);
        setOpponentPrepTime(15);
        if (opponentPrepIntervalRef.current) clearInterval(opponentPrepIntervalRef.current);
        
        setOpponentRunning(true);
        opponentBaseMsRef.current = ms;
        opponentLastTsRef.current = performance.now();
        setOpponentTimer(ms);
        opponentTimerRef.current = ms;
      } else {
        // Khi đối thủ dừng timer
        setOpponentRunning(false);
        setOpponentTimer(ms);
        opponentTimerRef.current = ms;
      }
    };
  socket.on('timer-prep-2vs2', handleOpponentPrep);
  socket.on('timer-update-2vs2', handleOpponentTimer);
    return () => {
  socket.off('timer-prep-2vs2', handleOpponentPrep);
  socket.off('timer-update-2vs2', handleOpponentTimer);
      if (opponentPrepIntervalRef.current) clearInterval(opponentPrepIntervalRef.current);
    };
  }, [roomId, userId]);

  // Smooth opponent timer UI with a single rAF loop
  useEffect(() => {
    if (!opponentRunning) {
      if (opponentAnimIdRef.current != null) {
        cancelAnimationFrame(opponentAnimIdRef.current);
        opponentAnimIdRef.current = null;
      }
      return;
    }
    const tick = () => {
      const now = performance.now();
      const elapsed = now - opponentLastTsRef.current;
      const ms = opponentBaseMsRef.current + Math.round(elapsed);
      setOpponentTimer(ms);
      opponentTimerRef.current = ms;
      opponentAnimIdRef.current = requestAnimationFrame(tick);
    };
    opponentAnimIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (opponentAnimIdRef.current != null) {
        cancelAnimationFrame(opponentAnimIdRef.current);
        opponentAnimIdRef.current = null;
      }
    };
  }, [opponentRunning]);



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
  return open ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-pink-100 rounded-xl p-4 shadow-lg relative modal-content" style={{ minWidth: 320, minHeight: 320 }}>
        <button onClick={onClose} className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Đóng</button>
        <div className="mb-2 text-center font-bold text-lg text-gray-700"></div>
        <div id="net-view" style={{ 
          display: size === 'pyraminx' ? 'flex' : 'grid', 
          flexDirection: size === 'pyraminx' ? 'column' : 'row',
          alignItems: size === 'pyraminx' ? 'center' : 'stretch',
          justifyContent: size === 'pyraminx' ? 'center' : 'stretch',
          gridTemplateColumns: size === 'pyraminx' ? 'none' : `repeat(4, ${faceSize}px)`, 
          gridTemplateRows: size === 'pyraminx' ? 'none' : `repeat(3, ${faceSize}px)`, 
          gap: size === 'pyraminx' ? 0 : 2, 
          background: 'none' 
        }}>
          {size === 'pyraminx' ? (
            // Pyraminx: hiển thị 4 tam giác với cấu trúc 1-3-5
            <div className="flex flex-col items-center gap-1">
              {/* Hàng trên: 2 tam giác hướng xuống + 1 tam giác hướng lên */}
              <div className="flex items-center gap-1">
                {/* Tam giác đỏ bên trái (mặt L) - dịch sang phải */}
                <div style={{ marginRight: '-35px' }}>
                  <PyraminxTriangleLeft faceSize={80} faceArray={cubeState.L || []} />
                </div>
                {/* Tam giác xanh lá giữa (mặt F) */}
                <PyraminxTriangle faceSize={80} faceArray={cubeState.F || []} />
                {/* Tam giác xanh biển bên phải (mặt R) - dịch sang trái */}
                <div style={{ marginLeft: '-35px' }}>
                  <PyraminxTriangleRight faceSize={80} faceArray={cubeState.R || []} />
                </div>
              </div>
              {/* Hàng dưới: 1 tam giác hướng xuống */}
              <div className="flex justify-center">
                {/* Tam giác vàng dưới (mặt D) */}
                <PyraminxTriangleDown faceSize={80} faceArray={cubeState.D || []} />
              </div>
            </div>
          ) : (
            // Các loại khác: grid layout bình thường
            layoutGrid.flatMap((row, rowIdx) =>
              row.map((faceKey, colIdx) => {
                if (faceKey === '') {
                  return <div key={`blank-${rowIdx}-${colIdx}`} className="net-face-empty" style={{ width: faceSize, height: faceSize, background: 'none' }}></div>;
                } else {
                  return (
                    <React.Fragment key={faceKey}>{renderStickers(faceKey as Face)}</React.Fragment>
                  );
                }
              })
            )
          )}
        </div>
        <div className="mt-3 text-gray-700 text-sm text-center font-mono">Scramble: <span className="font-bold">{scramble}</span></div>
      </div>
    </div>
  ) : null;
}
// --- End CubeNetModal ---
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
}, [roomId]);

// Lắng nghe kết quả từ tất cả người chơi (bao gồm bản thân trong 2vs2)
useEffect(() => {
  const socket = getSocket();
  const handlePlayerSolve = (data: { userId: string; userName?: string; time: number | null; team?: string | null; position?: number | null }) => {
    const solvedUserId = data.userId;
    const solvedUserName = data.userName;
    const normalizedTime = typeof data.time === 'number' ? data.time : null;
    const localTeam = serverTeamToLocal(data.team);

    if (localTeam) {
      const players = localTeam === 'A' ? teamA.players : teamB.players;
      let playerIndex = players.findIndex(player => player.userId === solvedUserId);

      if (playerIndex === -1 && typeof data.position === 'number') {
        playerIndex = Math.max(0, data.position - 1);
      }

      if (playerIndex === -1) {
        playerIndex = 0;
      }

      ensureTeamPlayerSlot(localTeam, playerIndex, solvedUserId, solvedUserName ?? null, data.position ?? null);

      if (solvedUserId !== userId) {
        pushTeamResult(localTeam, playerIndex, normalizedTime);
      }

      return;
    }

    if (solvedUserId === userId) {
      return;
    }

    setOpponentResults(prev => {
      const arr = [...prev];
      if (arr.length >= 5) return arr;
      arr.push(normalizedTime);
      return arr;
    });

    if (solvedUserName && solvedUserName !== opponentName) {
      setOpponentName(solvedUserName);
    }
  };

  socket.on('player-solve', handlePlayerSolve);
  return () => {
    socket.off('player-solve', handlePlayerSolve);
  };
}, [ensureTeamPlayerSlot, opponentName, pushTeamResult, teamA, teamB, userId]);

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
  }, [roomId, userId]);

  useEffect(() => {
    if (!turnUserId) return;

    const normalizedTurnUserId = normalizeId(turnUserId);

    const teamAIndex = teamA.players.findIndex(player => normalizeId(player.userId) === normalizedTurnUserId);
    if (teamAIndex !== -1) {
      setCurrentTeam('A');
      setCurrentPlayerIndex(teamAIndex);
      setCurrentPlayerId(turnUserId);
      setCurrentPlayerName(teamA.players[teamAIndex]?.userName || fallbackPlayerName('A', teamAIndex));
      return;
    }

    const teamBIndex = teamB.players.findIndex(player => normalizeId(player.userId) === normalizedTurnUserId);
    if (teamBIndex !== -1) {
      setCurrentTeam('B');
      setCurrentPlayerIndex(teamBIndex);
      setCurrentPlayerId(turnUserId);
      setCurrentPlayerName(teamB.players[teamBIndex]?.userName || fallbackPlayerName('B', teamBIndex));
      return;
    }

    setCurrentPlayerId(turnUserId);
    setCurrentPlayerName('');
  }, [teamA, teamB, turnUserId]);

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

      
  // Lắng nghe sự kiện khóa do 2 lần DNF từ server
  useEffect(() => {
    const socket = getSocket();
    const handleLockDue2DNF = (data: { 
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

  useEffect(() => {
    const socket = getSocket();

    const handleRematchOpen = (data: {
      initiatorId?: string;
      participants?: RematchParticipant[];
      acceptedIds?: string[];
    }) => {
      const participants = Array.isArray(data.participants) ? data.participants : [];
      const acceptedIds = Array.isArray(data.acceptedIds) ? data.acceptedIds : [];

      const isParticipant = participants.some(participant => normalizeId(participant.userId) === normalizedUserId);

      setRematchDialog({
        show: isParticipant,
        initiatorId: data.initiatorId || null,
        participants,
        status: 'waiting',
      });
      setRematchAcceptedIds(acceptedIds);
      setRematchPending(true);
      setRematchInfoMessage(null);

      if (data.initiatorId && normalizeId(data.initiatorId) === normalizedUserId && roomId && userId) {
        socket.emit('rematch2v2-respond', { roomId, userId });
      }
    };

    const handleRematchUpdate = (data: { acceptedIds?: string[] }) => {
      setRematchAcceptedIds(Array.isArray(data.acceptedIds) ? data.acceptedIds : []);
    };

    const handleRematchConfirmed = (data: { acceptedIds?: string[] }) => {
      setRematchAcceptedIds(Array.isArray(data.acceptedIds) ? data.acceptedIds : []);
      setRematchDialog(prev => ({ ...prev, status: 'confirmed' }));
      setRematchInfoMessage('Tất cả thành viên đã đồng ý. Đang chuẩn bị trận đấu mới...');
    };

    const handleRematchCancelled = (payload?: { cancelledBy?: string; reason?: string }) => {
      setRematchDialog({ show: false, initiatorId: null, participants: [], status: 'waiting' });
      setRematchAcceptedIds([]);
      setRematchPending(false);

      const cancelledByNormalized = normalizeId(payload?.cancelledBy);
      let infoMessage = 'Yêu cầu tái đấu đã bị hủy.';

      if (payload?.reason === 'declined') {
        infoMessage = cancelledByNormalized && cancelledByNormalized === normalizedUserId
          ? 'Bạn đã từ chối tái đấu.'
          : 'Một thành viên đã từ chối tái đấu.';
      } else if (payload?.reason === 'host-cancelled') {
        infoMessage = cancelledByNormalized && cancelledByNormalized === normalizedUserId
          ? 'Bạn đã hủy yêu cầu tái đấu.'
          : 'Chủ phòng đã hủy yêu cầu tái đấu.';
      } else if (!payload?.reason && cancelledByNormalized && cancelledByNormalized === normalizedHostId) {
        infoMessage = cancelledByNormalized === normalizedUserId
          ? 'Bạn đã hủy yêu cầu tái đấu.'
          : 'Chủ phòng đã hủy yêu cầu tái đấu.';
      }

      setRematchInfoMessage(infoMessage);
    };

    const handleRematchAccepted = () => {
      setRematchPending(false);
      setRematchDialog({ show: false, initiatorId: null, participants: [], status: 'waiting' });
      setRematchAcceptedIds([]);
      setRematchInfoMessage('Đã reset trận đấu. Chúc bạn may mắn!');

  setTeamAResults(() => teamA.players.map(() => [] as (number | null)[]));
  setTeamBResults(() => teamB.players.map(() => [] as (number | null)[]));
      setTeamAScores([0, 0, 0, 0, 0]);
      setTeamBScores([0, 0, 0, 0, 0]);
      setMyResults([]);
      setOpponentResults([]);
      setPendingResult(null);
      setPendingType('normal');
      setTimer(0);
      setDnf(false);
      setPrep(false);
      setCanStart(false);
      setSpaceHeld(false);
      setScramble('');
      setScrambleIndex(0);
      setScrambles([]);
      setShowScrambleMsg(false);
      setOpponentTime(null);
      setOpponentPrep(false);
      setOpponentRunning(false);
      setOpponentTimer(0);
      setOpponentPrepTime(15);
      setShowConfirmButtons(false);
      setTypingInput('');
      setIsTypingMode(false);
      setIsLockedDue2DNF(false);
      setLockDNFInfo(null);
    };

    socket.on('rematch2v2-open', handleRematchOpen);
    socket.on('rematch2v2-update', handleRematchUpdate);
    socket.on('rematch2v2-confirmed', handleRematchConfirmed);
  socket.on('rematch2v2-cancelled', handleRematchCancelled);
    socket.on('rematch-accepted', handleRematchAccepted);

    return () => {
      socket.off('rematch2v2-open', handleRematchOpen);
      socket.off('rematch2v2-update', handleRematchUpdate);
      socket.off('rematch2v2-confirmed', handleRematchConfirmed);
  socket.off('rematch2v2-cancelled', handleRematchCancelled);
      socket.off('rematch-accepted', handleRematchAccepted);
    };
  }, [normalizedUserId, normalizedHostId, roomId, userId, setMyResults, teamA, teamB]);

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
  // Lấy daily.co room URL khi vào phòng
  useEffect(() => {
    if (!roomId) return;
    if (roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0) return;
    
    // Lấy room URL từ sessionStorage (đã được tạo khi tạo phòng)
    const savedRoomUrl = sessionStorage.getItem(`dailyRoomUrl_${roomId}`);
    if (savedRoomUrl) {
      setRoomUrl(savedRoomUrl);
        } else {
      // Fallback: tạo room URL mặc định
      const dailyRoomUrl = `https://rubik-app.daily.co/${roomId}`;
      setRoomUrl(dailyRoomUrl);
    }
  }, [roomId, roomUrl]);


  // ...giữ nguyên toàn bộ logic và return JSX phía sau...

  // --- Effects and logic below ---

  // Hàm rời phòng: emit leave-room trước khi chuyển hướng về lobby
  function handleLeaveRoom() {
    if (isSolveLocked) return;
    setShowLeaveModal(true);
  }

  function confirmLeaveRoom() {
    const socket = getSocket();
    if (roomId && userId) {
      socket.emit('leave-room', { roomId, userId });
    }
    setInsufficientModal({ show: false, message: '', forceClose: false });
    window.location.href = '/lobby';
    setTimeout(() => {
      window.location.reload();
    }, 1300);
  }

  function handleRematch2v2Request() {
    if (!isCreator || !roomId || !userId || rematchButtonDisabled) return;
    const socket = getSocket();
    setRematchPending(true);
    setRematchInfoMessage('Đã gửi yêu cầu tái đấu tới tất cả thành viên...');
    socket.emit('rematch2v2-request', { roomId, userId });
  }

  function handleRematch2v2Respond() {
    if (!roomId || !userId || hasAcceptedRematch || rematchDialog.status === 'confirmed') return;
    const socket = getSocket();
    socket.emit('rematch2v2-respond', { roomId, userId });
  }

  function handleRematch2v2Decline() {
    if (!roomId || !userId || rematchDialog.status === 'confirmed') return;
    const socket = getSocket();
    socket.emit('rematch2v2-decline', { roomId, userId });
    setRematchDialog({ show: false, initiatorId: null, participants: [], status: 'waiting' });
    setRematchAcceptedIds([]);
    setRematchPending(false);
    setRematchInfoMessage('Bạn đã từ chối tái đấu.');
  }

  function handleRematch2v2Cancel() {
    if (!isCreator || !roomId || !userId) return;
    const socket = getSocket();
    socket.emit('rematch2v2-cancel', { roomId, userId });
  }

  // Hàm xử lý chế độ typing
  function handleTypingMode() {
    if (users.length < 2 || isLockedDue2DNF || !isMyTurnNow || isSolveLocked) return; // Chỉ hoạt động khi đủ điều kiện và không có lượt giải đang chạy
    setIsTypingMode(!isTypingMode);
    setTypingInput("");
  }

  // Hàm xử lý nhập thời gian
  function handleTypingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (users.length < 2 || isLockedDue2DNF || !isMyTurnNow) return;
    
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
      const currentResults = getMyResults();
      setMyResults([...currentResults, time]);
      socket.emit("solve", { roomId, userId, userName, time });
    } else {
      const currentResults = getMyResults();
      setMyResults([...currentResults, null]);
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
      // Hàm kiểm tra trạng thái toàn màn hình
      const checkFullscreenStatus = () => {
        const fullscreenElement = 
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement;
        
        const wasFullscreen = isFullscreen;
        setIsFullscreen(!!fullscreenElement);
        
        if (fullscreenElement && !wasFullscreen) {
          // Vừa vào chế độ toàn màn hình - dừng interval
          if (interval) {
            clearInterval(interval);
            interval = undefined;
          }
        } else if (!fullscreenElement && wasFullscreen && isMobile) {
          // Vừa thoát khỏi chế độ toàn màn hình - khởi động lại interval
          startInterval();
          // Và ngay lập tức yêu cầu lại
          requestFullscreen();
        } else if (!fullscreenElement && isMobile) {
          // Không ở chế độ toàn màn hình và đang dùng điện thoại
          requestFullscreen();
        }
      };

      // Hàm yêu cầu chế độ toàn màn hình
      const requestFullscreen = () => {
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
      };

      // Kiểm tra trạng thái ban đầu
      checkFullscreenStatus();

      // Thêm event listeners để theo dõi thay đổi trạng thái toàn màn hình
      const fullscreenChangeEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      fullscreenChangeEvents.forEach(event => {
        document.addEventListener(event, checkFullscreenStatus);
      });

      // Tự động yêu cầu chế độ toàn màn hình sau 1 giây
      const initialTimeout = setTimeout(requestFullscreen, 1000);

      // Chỉ kiểm tra định kỳ khi KHÔNG ở chế độ toàn màn hình
      let interval: NodeJS.Timeout | undefined;
      
      const startInterval = () => {
        if (!isFullscreen && !interval) {
          interval = setInterval(() => {
            if (isMobile && !isFullscreen) {
              requestFullscreen();
            } else {
              // Nếu đã ở chế độ toàn màn hình, dừng interval
              if (interval) {
                clearInterval(interval);
                interval = undefined;
              }
            }
          }, 3000);
        }
      };

      // Bắt đầu interval ban đầu
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

  useEffect(() => {
    if (!roomId) return;
    if (typeof window === 'undefined') return;
    const storedTeams = sessionStorage.getItem(`roomTeams_${roomId}`);
    if (storedTeams) {
      try {
  const parsed: RoomUser[] = JSON.parse(storedTeams);
  setPendingUsers(mergeRoomUsers(parsed));
      } catch {
        // Ignore malformed cache
      } finally {
        sessionStorage.removeItem(`roomTeams_${roomId}`);
      }
    }
  }, [roomId]);

  // Khi đã có roomId, join-room với password nếu có (hỗ trợ cả 1vs1 và 2vs2)
  useEffect(() => {
    if (!roomId || !userName || !userId) return;
    const socket = getSocket();
    
    // Detect 2vs2 mode từ sessionStorage hoặc URL params
    let is2vs2Mode = false;
    let password = "";
    let event = undefined;
    let displayName = undefined;
    
    if (typeof window !== "undefined") {
      // Check if this is from 2vs2 waiting room
  const gameMode = sessionStorage.getItem(`gameMode_${roomId}`);
  is2vs2Mode = gameMode === '2vs2';
      
      // Ưu tiên lấy meta nếu là người tạo phòng
      const metaStr = sessionStorage.getItem(`roomMeta_${roomId}`);
      if (metaStr) {
        try {
          const meta = JSON.parse(metaStr);
          event = meta.event;
          displayName = meta.displayName;
          // Do NOT carry over waiting-room passwords into active room joins from page2.
          // password is intentionally left empty here so active matches are not gated client-side.
        } catch {}
        sessionStorage.removeItem(`roomMeta_${roomId}`);
      } else {
        // Intentionally ignore roomPassword session entry here to avoid client-side password checks.
        password = "";
      }
      
      // Clean up sessionStorage for game mode
      if (gameMode) {
        sessionStorage.removeItem(`gameMode_${roomId}`);
      }
    }
    
    if (is2vs2Mode) {
      // Join room cho 2vs2 mode - sử dụng join-room thường nhưng với roomId đặc biệt
      socket.emit("join-room", { roomId, userId, userName, event, displayName, password, gameMode: '2vs2' });
    } else {
      // Join room cho 1vs1 mode (logic cũ)
      socket.emit("join-room", { roomId, userId, userName, event, displayName, password });
    }
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

  // Chặn hành vi cuộn trang bằng phím Space trên toàn bộ trang khi không nhập liệu
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSpacePrevent = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;

      const target = event.target as HTMLElement | null;
      const isEditableTarget = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if (isEditableTarget) return;

      event.preventDefault();
    };

    window.addEventListener('keydown', handleSpacePrevent, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleSpacePrevent);
    };
  }, []);


  // Desktop: Nhấn Space để vào chuẩn bị, giữ >=300ms rồi thả ra để bắt đầu chạy
  useEffect(() => {
    if (isMobile) return;
    // Use IsMyTurn function to check if current user can use timer
    if (waiting || running || !IsMyTurn() || mySolveCount >= 5 || pendingResult !== null || isLockedDue2DNF) return;
    let localSpaceHeld = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (pendingResult !== null) return;
      if (isTypingMode) return;

      const activeElement = document.activeElement;
      const isInModal = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('.modal-content') ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('[data-modal]')
      );
      if (isInModal) return;

      // Check if it's my turn before allowing timer operations
      if (!IsMyTurn()) return;

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
        // Changed from 500ms to 300ms as requested
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
  }, [isMobile, waiting, running, prep, mySolveCount, pendingResult, isLockedDue2DNF, isTypingMode, isMyTurnNow, turnUserId]);

  // Đảm bảo reset trạng thái chuẩn bị khi chắc chắn không còn lượt của mình
  useEffect(() => {
    const stillInControl = isMyTurnRef.current || prepRef.current || runningRef.current || canStartRef.current;
    if (stillInControl) return;

    setPrep(false);
    setCanStart(false);
    setRunning(false);
    setSpaceHeld(false);
    setTimer(0);
    setDnf(false);
    setPrepTime(15);
    pressStartRef.current = null;
    if (prepIntervalRef.current) {
      clearInterval(prepIntervalRef.current);
      prepIntervalRef.current = null;
    }
  }, [turnUserId]);

      // Đếm ngược 15s chuẩn bị
  useEffect(() => {
    // Kiểm tra tất cả các điều kiện để chạy đếm ngược
    if (!prep || waiting || isLockedDue2DNF || !IsMyTurn()) return;
    setCanStart(false);
    setSpaceHeld(false);
    setDnf(false);
    
    // Gửi timer-prep event để đối thủ biết mình đang chuẩn bị
    const socket = getSocket();
    // Use 2vs2 specific event for 2vs2 rooms
    socket.emit("timer-prep-2vs2", { roomId, userId, remaining: 15 });
    
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
          socket.emit("timer-update-2vs2", { roomId, userId, ms: 0, running: false, finished: true });
          
          // Lưu kết quả DNF và gửi lên server, server sẽ tự chuyển lượt
          const updatedResults = [...getMyResults(), null];
          setMyResults(updatedResults);
          socket.emit("solve", { roomId, userId, userName, time: null });
          // Không tự setTurn nữa
          setTimeout(() => setOpponentTime(12345 + Math.floor(Math.random()*2000)), 1000);
          return 0;
        }
        
        // Gửi timer-prep update mỗi giây
        socket.emit("timer-prep-2vs2", { roomId, userId, remaining: t - 1 });
        return t - 1;
      });
    }, 1000);
    return () => {
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, [prep, waiting, roomId, userId, isLockedDue2DNF, isMyTurnNow, turnUserId]);


  // Khi canStart=true, bắt đầu timer, dừng khi bấm phím bất kỳ (desktop, không nhận chuột) hoặc chạm (mobile)
  useEffect(() => {
    // Kiểm tra các điều kiện để bắt đầu timer
    if (!canStart || waiting || isLockedDue2DNF || !IsMyTurn()) return;
    setRunning(true);
    setTimer(0);
    timerRef.current = 0;
    startTimeRef.current = performance.now(); // Lưu thời gian bắt đầu chính xác
    
    // Gửi timer-update event để đối thủ biết mình bắt đầu timer
    const socket = getSocket();
    socket.emit("timer-update-2vs2", { roomId, userId, ms: 0, running: true, finished: false });
    
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
      socket.emit("timer-update-2vs2", { roomId, userId, ms: currentTime, running: false, finished: false });
      
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
  }, [canStart, waiting, roomId, userId, userName, isMobile, isLockedDue2DNF, isTypingMode, isMyTurnNow, turnUserId]);

  // Không còn random bot, chỉ nhận kết quả đối thủ qua socket

  // Lưu kết quả vào localStorage mỗi khi thay đổi - Updated for 2vs2
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`teamAResults_${roomId}`, JSON.stringify(teamAResults));
      localStorage.setItem(`teamBResults_${roomId}`, JSON.stringify(teamBResults));
    }
  }, [teamAResults, teamBResults, roomId]);

  // Reset cho lần giải tiếp theo - Updated for 2vs2 with new timer logic
  useEffect(() => {
  // Tính tổng số lượt giải của cả 2 team
  const teamATotalSolves = teamAResults.reduce((sum, playerResults) => sum + playerResults.length, 0);
  const teamBTotalSolves = teamBResults.reduce((sum, playerResults) => sum + playerResults.length, 0);
  const totalSolves = teamATotalSolves + teamBTotalSolves;
  
  if (totalSolves === 0) return;
  
  // Kiểm tra điều kiện kết thúc sớm khi có 2 lần DNF
  const myTeamHasDoubleDNF = myTeam === 'A' ? teamAHasDoubleDNF : myTeam === 'B' ? teamBHasDoubleDNF : false;
  const oppTeamHasDoubleDNF = myTeam === 'A' ? teamBHasDoubleDNF : myTeam === 'B' ? teamAHasDoubleDNF : false;
  const anyTeamHasDoubleDNF = teamAHasDoubleDNF || teamBHasDoubleDNF;
  
  // Chỉ kiểm tra khi cả 2 đều xong lượt giải đó (totalSolves chẵn)
  if (totalSolves % 2 === 0 && anyTeamHasDoubleDNF) {
    // KHÓA THAO TÁC CHO CẢ HAI BÊN khi có người bị 2 lần DNF
    // Lý do: Khi trận đấu kết thúc sớm, cả hai bên đều không thể tiếp tục
    setIsLockedDue2DNF(true);
    
    // GỬI SỰ KIỆN LÊN SERVER để server broadcast modal cho cả hai bên
    const socket = getSocket();
    const payload = myTeam
      ? {
          roomId,
          myDnfCount: myTeam === 'A' ? teamAMaxDnf : teamBMaxDnf,
          oppDnfCount: myTeam === 'A' ? teamBMaxDnf : teamAMaxDnf
        }
      : {
          roomId,
          myDnfCount: teamAMaxDnf,
          oppDnfCount: teamBMaxDnf
        };
    socket.emit('lock-due-2dnf', payload);
    
    // Cập nhật trạng thái hiển thị (modal kết thúc sớm đã bị hủy)
    setShowEarlyEndMsg({ show: false, message: '', type: 'draw' });
    
    // KHÔNG reset timer state khi có 2 lần DNF - giữ nguyên để hiển thị trạng thái cuối
    
    // KHÔNG cần yêu cầu scramble mới khi có 2 lần DNF
    // Lý do: 
    // 1. Trận đấu kết thúc sớm, không cần scramble mới
    // 2. Khi tái đấu, server sẽ tự động gửi scramble mới
    // 3. Tránh gọi server không cần thiết
    
    // KHÓA THAO TÁC MÃI MÃI - chỉ mở khóa khi tái đấu
    // Không cần setTimeout để mở khóa
    
    return; // Kết thúc sớm, không cần xử lý logic khác
  }
  
  // Chỉ xử lý reset khi cả 2 team đều xong lượt giải
  const myTeamTotalSolves = getMyResults().length;
  const oppTeamTotalSolves = (myTeam === 'A' ? teamBResults : teamAResults).reduce((sum, playerResults) => sum + playerResults.length, 0);
  if (myTeamTotalSolves > 0 && myTeamTotalSolves > oppTeamTotalSolves) return; // chờ team đối thủ
  
  // Khi kết thúc trận đấu (đủ 5 lượt mỗi team), chỉ hiển thị thống kê - không cộng set trong chế độ 2vs2
  if (myTeamTotalSolves === 5 && oppTeamTotalSolves === 5) {
    // Có thể khai thác thống kê Ao5 ở khu vực hiển thị kết quả nếu cần
    // nhưng không còn cộng điểm set trong chế độ 2vs2
  }
  
  // Chỉ đổi scramble khi tổng số lượt giải là số chẵn (sau mỗi vòng)
  if (totalSolves % 2 === 0 && totalSolves < 10) {
    // ...
  }
}, [teamAResults, teamBResults, roomId, myTeam, getMyResults, teamAHasDoubleDNF, teamBHasDoubleDNF, teamAMaxDnf, teamBMaxDnf]);

  // Tính toán thống kê - Updated for 2vs2
  const myStats = calcStats(getMyResults());
  const oppStats = calcStats((myTeam === 'A' ? teamBResults : teamAResults).flat());

function formatTime(ms: number|null, showDNF: boolean = false) {
  if (ms === null) return showDNF ? 'DNF' : '';
  return (ms/1000).toFixed(2);
}

function formatStat(val: number|null, showDNF: boolean = false) {
  if (val === null) return showDNF ? 'DNF' : '';
  return (val/1000).toFixed(2);
}

function formatSolveCell(value: number | null | undefined) {
  if (value === null) return 'DNF';
  if (typeof value !== 'number') return '-';

  const centiseconds = Math.floor((value % 1000) / 10);
  const seconds = Math.floor((value / 1000) % 60);
  const minutes = Math.floor(value / 60000);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  }
  if (seconds > 0) {
    return `${seconds}.${centiseconds.toString().padStart(2, "0")}`;
  }
  return `0.${centiseconds.toString().padStart(2, "0")}`;
}

const clampPlayerIndex = (idx: number) => {
  if (idx < 0) return 0;
  if (idx > 1) return 1;
  return idx;
};

  const normalizedCurrentPlayerId = normalizeId(currentPlayerId || turnUserId || "");
  const isCurrentPlayerId = (candidate?: string | null) => {
    if (!candidate) return false;
    if (!normalizedCurrentPlayerId) return false;
    return normalizeId(candidate) === normalizedCurrentPlayerId;
  };

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
        {/* Video loading đã được comment lại - 1 tuần sau sẽ gỡ comment */}
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

  const displayMyTeamId: 'A' | 'B' = myTeam ?? 'A';
  const displayOpponentTeamId: 'A' | 'B' = displayMyTeamId === 'A' ? 'B' : 'A';
  const displayMyTeamData = displayMyTeamId === 'A' ? teamA : teamB;
  const displayOpponentTeamData = displayOpponentTeamId === 'A' ? teamA : teamB;
  const displayMyTeamResults = displayMyTeamId === 'A' ? teamAResults : teamBResults;
  const displayOpponentResults = displayOpponentTeamId === 'A' ? teamAResults : teamBResults;
  const effectiveMyIndex = myTeam !== null && myTeamIndex >= 0 ? clampPlayerIndex(myTeamIndex) : 0;
  const teammateIndex = effectiveMyIndex === 0 ? 1 : 0;
  const opponentIndexForMe = myTeam !== null && myTeamIndex >= 0 ? clampPlayerIndex(myTeamIndex) : 0;
  const opponentIndexForTeammate = myTeam !== null && myTeamIndex >= 0 ? clampPlayerIndex(teammateIndex) : 1;
  const myPlayerLabel = (() => {
    const players = displayMyTeamData.players;
    const player = players[effectiveMyIndex];
    if (player?.userName) return player.userName;
    if (myTeam !== null && userName) return userName;
    return fallbackPlayerName(displayMyTeamId, effectiveMyIndex);
  })();
  const teammateLabel = (() => {
    const players = displayMyTeamData.players;
    const teammate = players[teammateIndex];
    if (teammate?.userName) return teammate.userName;
    return fallbackPlayerName(displayMyTeamId, teammateIndex);
  })();
  const opponentLabel1 = (() => {
    const players = displayOpponentTeamData.players;
    const player = players[opponentIndexForMe];
    if (player?.userName) return player.userName;
    return fallbackPlayerName(displayOpponentTeamId, opponentIndexForMe);
  })();
  const opponentLabel2 = (() => {
    const players = displayOpponentTeamData.players;
    const player = players[opponentIndexForTeammate];
    if (player?.userName) return player.userName;
    return fallbackPlayerName(displayOpponentTeamId, opponentIndexForTeammate);
  })();
  const mySlotUserId = displayMyTeamData.players[effectiveMyIndex]?.userId || (myTeam ? userId : "");
  const teammateUserId = displayMyTeamData.players[teammateIndex]?.userId;
  const opponentUserId1 = displayOpponentTeamData.players[opponentIndexForMe]?.userId;
  const opponentUserId2 = displayOpponentTeamData.players[opponentIndexForTeammate]?.userId;
  const normalizedTeammateUserId = normalizeId(teammateUserId);
  const normalizedOpponentUserId1 = normalizeId(opponentUserId1);
  const normalizedOpponentUserId2 = normalizeId(opponentUserId2);
  const normalizedTeammateName = normalizeId(teammateLabel);
  const normalizedOpponentLabel1 = normalizeId(opponentLabel1);
  const normalizedOpponentLabel2 = normalizeId(opponentLabel2);
  const dailySelfUserData = userId
    ? {
        userId,
        teamId: myTeam ?? null,
        teamIndex: myTeamIndex,
      }
    : null;
  const resolveDailyParticipantSlot = (participant: DailyParticipant) => {
    const userData = (participant.userData ?? {}) as {
      userId?: string | null;
      teamId?: string | null;
      teamIndex?: number | null;
    };
    const candidateRaw =
      typeof userData.userId === 'string'
        ? userData.userId
        : typeof participant.user_id === 'string'
          ? participant.user_id
          : null;
    const candidateNormalized = normalizeId(candidateRaw);
    const candidateTeam = typeof userData.teamId === 'string' ? userData.teamId : null;
    const candidateIndex = typeof userData.teamIndex === 'number' ? userData.teamIndex : null;

    if (candidateTeam && candidateIndex !== null) {
      if (candidateTeam === displayMyTeamId) {
        if (candidateIndex === teammateIndex) {
          return 1;
        }
      } else if (candidateTeam === displayOpponentTeamId) {
        if (candidateIndex === opponentIndexForMe) {
          return 0;
        }
        if (candidateIndex === opponentIndexForTeammate) {
          return 2;
        }
      }
    }

    if (candidateNormalized && normalizedOpponentUserId1 && candidateNormalized === normalizedOpponentUserId1) {
      return 0;
    }
    if (candidateNormalized && normalizedTeammateUserId && candidateNormalized === normalizedTeammateUserId) {
      return 1;
    }
    if (candidateNormalized && normalizedOpponentUserId2 && candidateNormalized === normalizedOpponentUserId2) {
      return 2;
    }

    const candidateNameNormalized = normalizeId(participant.user_name);
    if (candidateNameNormalized && normalizedOpponentLabel1 && candidateNameNormalized === normalizedOpponentLabel1) {
      return 0;
    }
    if (candidateNameNormalized && normalizedTeammateName && candidateNameNormalized === normalizedTeammateName) {
      return 1;
    }
    if (candidateNameNormalized && normalizedOpponentLabel2 && candidateNameNormalized === normalizedOpponentLabel2) {
      return 2;
    }
    return null;
  };
  const isMySlotActive = isCurrentPlayerId(mySlotUserId);
  const isTeammateActive = isCurrentPlayerId(teammateUserId);
  const isOpponent1Active = isCurrentPlayerId(opponentUserId1);
  const isOpponent2Active = isCurrentPlayerId(opponentUserId2);
  const myTeamColor = displayMyTeamId === 'A' ? '#60a5fa' : '#10b981';
  const opponentTeamColor = displayOpponentTeamId === 'A' ? '#60a5fa' : '#10b981';
  const teamCompletedAllRounds = (results: (number|null)[][]) => results.length > 0 && results.every(playerResults => Array.isArray(playerResults) && playerResults.length >= 5);
  const hasCompleted1v1Match = !myTeam && myResults.length >= 5 && opponentResults.length >= 5;
  const hasCompleted2v2Match = !!myTeam && teamCompletedAllRounds(teamAResults) && teamCompletedAllRounds(teamBResults);
  const canExportResults = hasCompleted1v1Match || hasCompleted2v2Match;

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

  const buildMedianDisplay = (results?: (number|null)[]) => {
    const thresholds = mobileShrink
      ? { base: 11, medium: 10, small: 9 }
      : { base: 18, medium: 16, small: 14 };

    if (!Array.isArray(results) || results.length === 0) {
      return { text: '-', fontSize: thresholds.base };
    }

    const stats = calcStats(results);
    const meanMs = stats?.mean;

    if (typeof meanMs !== 'number' || Number.isNaN(meanMs)) {
      return { text: '-', fontSize: thresholds.base };
    }

    const formatted = formatSolveCell(Math.round(meanMs));
    const length = formatted.length;

    let fontSize = thresholds.small;
    if (length <= 4) {
      fontSize = thresholds.base;
    } else if (length <= 6) {
      fontSize = thresholds.medium;
    }

    return { text: formatted, fontSize };
  };

  const teammateMedianDisplay = buildMedianDisplay(displayMyTeamResults[teammateIndex]);
  const opponentSecondaryMedianDisplay = buildMedianDisplay(displayOpponentResults[opponentIndexForTeammate]);

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
      {rematchInfoMessage && (
        <div
          className={
            mobileShrink
              ? "mt-1 px-2 py-1 bg-green-800/70 text-[11px] text-green-100 rounded-lg shadow"
              : "mt-2 px-4 py-2 bg-green-800/70 text-sm text-green-100 rounded-lg shadow"
          }
          style={{ maxWidth: mobileShrink ? '90vw' : '420px', textAlign: 'center' }}
        >
          {rematchInfoMessage}
        </div>
      )}
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
          disabled={isSolveLocked}
          className={
            `${mobileShrink
              ? "bg-red-600 hover:bg-red-700 text-[9px] rounded-full font-bold shadow-lg flex items-center justify-center"
              : "bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg flex items-center justify-center"
            } transition-transform duration-200 hover:scale-110 active:scale-95 ${isSolveLocked ? 'opacity-60 cursor-not-allowed' : ''}`
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
                {/* Nút typing và nút lưới scramble */}
        <div className="flex items-center gap-1">
          {/* Nút tái đấu 2v2 */}
          <button
            onClick={handleRematch2v2Request}
            disabled={rematchButtonDisabled}
            className={
              (mobileShrink
                ? `px-1 py-0.5 ${rematchPending ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${rematchButtonDisabled ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 ${rematchPending ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${rematchButtonDisabled ? 'opacity-60 cursor-not-allowed' : ''}`)
              + ` transition-transform duration-200 ${rematchPending && !rematchButtonDisabled ? 'animate-pulse' : 'hover:scale-110'} active:scale-95 function-button`
            }
            style={mobileShrink ? { fontSize: 18, minWidth: 0, minHeight: 0, padding: 1, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Tái đấu 2v2"
            title={rematchButtonTooltip}
          >
            <span style={{fontSize: mobileShrink ? 18 : 28, display: 'block', lineHeight: 1}}>⟳</span>
          </button>
          {/* Nút Typing */}
          <button
            onClick={handleTypingMode}
            disabled={users.length < 2 || !myTurn || isLockedDue2DNF || isSolveLocked}
            className={
              (mobileShrink
                ? `px-1 py-0.5 ${isTypingMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center ${users.length < 2 || !myTurn || isLockedDue2DNF || isSolveLocked ? 'opacity-60 cursor-not-allowed' : ''}`
                : `px-4 py-2 ${isTypingMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center ${users.length < 2 || !myTurn || isLockedDue2DNF || isSolveLocked ? 'opacity-60 cursor-not-allowed' : ''}`)
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
            disabled={isSolveLocked}
            className={
              `${mobileShrink
                ? "bg-gray-500 hover:bg-gray-700 text-[13px] rounded-full font-bold shadow-lg flex items-center justify-center"
                : "bg-gray-500 hover:bg-gray-700 text-white rounded-full font-bold shadow-lg flex items-center justify-center"
              } transition-transform duration-200 hover:scale-110 active:scale-95 function-button ${isSolveLocked ? 'opacity-60 cursor-not-allowed' : ''}`
            }
            style={mobileShrink ? { fontSize: 18, width: 32, height: 32, lineHeight: '32px' } : { fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Lưới scramble"
            title="Lưới scramble"
            onClick={() => {
              if (isSolveLocked) return;
              setShowCubeNet(true);
            }}
          >
            <span role="img" aria-label="cross" style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>✟</span>
          </button>
          {/* Modal lưới Rubik */}
          <CubeNetModal key={`${scramble}-${String(cubeSize)}`} scramble={scramble} open={showCubeNet} onClose={() => setShowCubeNet(false)} size={cubeSize} />
        </div>

        <div className="flex items-center relative">
          <button
            onClick={() => {
              if (isSolveLocked) return;
              setShowChat(true);
              setHasNewChat(false);
            }}
            disabled={isSolveLocked}
            className={
              `${mobileShrink
                ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
                : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center"
              } transition-transform duration-200 hover:scale-110 active:scale-95 function-button ${isSolveLocked ? 'opacity-60 cursor-not-allowed' : ''}`
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
              {chatMessages.map((msg, idx) => {
                const displayName = msg.playerName?.trim()
                  ? msg.playerName.trim()
                  : (msg.from === 'me'
                      ? (userName?.trim() ? userName : 'Bạn')
                      : 'Người chơi khác');
                const nameClass = [
                  mobileShrink ? 'text-[8px]' : 'text-xs',
                  msg.from === 'me' ? 'text-blue-100 text-right' : 'text-gray-300 text-left',
                ].join(' ');
                const bubbleClass = msg.from === 'me'
                  ? (mobileShrink ? "bg-blue-500 text-white px-2 py-1 rounded-lg text-[10px]" : "bg-blue-500 text-white px-3 py-2 rounded-lg text-base")
                  : (mobileShrink ? "bg-gray-700 text-white px-2 py-1 rounded-lg text-[10px]" : "bg-gray-700 text-white px-3 py-2 rounded-lg text-base");

                return (
                  <div
                    key={idx}
                    className={`${
                      msg.from === 'me'
                        ? (mobileShrink ? 'flex justify-end mb-1' : 'flex justify-end mb-2')
                        : (mobileShrink ? 'flex justify-start mb-1' : 'flex justify-start mb-2')
                    } chat-message ${idx === chatMessages.length - 1 ? 'new-message' : ''}`}
                  >
                    <div className="flex flex-col max-w-[70%]" style={{ wordBreak: 'break-word' }}>
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
                  const senderName = userName?.trim() ? userName : 'Bạn';
                  setChatMessages(msgs => [...msgs, { from: 'me', text: chatInput, playerName: senderName }]);
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
      {/* Modal tái đấu 2v2 */}
      {rematchDialog.show && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-transparent modal-backdrop"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className={`${mobileShrink ? "bg-gray-900 rounded p-3 w-[92vw] max-w-[300px] border-2 border-green-400 flex flex-col gap-2" : "bg-gray-900 rounded-2xl p-6 w-[440px] max-w-[95vw] border-4 border-green-400 flex flex-col gap-4"} modal-content`}
            style={mobileShrink ? { maxHeight: '85vh', overflowY: 'auto' } : { maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div className={mobileShrink ? "text-base font-bold text-green-300 text-center" : "text-2xl font-bold text-green-300 text-center"}>
              Tái đấu 2v2
            </div>
            <div className={mobileShrink ? "text-[11px] text-gray-200 text-center leading-snug" : "text-sm text-gray-200 text-center leading-relaxed"}>
              {rematchPrimaryMessage}
            </div>
            <div className={mobileShrink ? "mt-2 flex flex-col gap-1" : "mt-4 flex flex-col gap-2"}>
              {rematchDialog.participants.map(participant => {
                const normalizedParticipantId = normalizeId(participant.userId);
                const accepted = rematchAcceptedNormalized.includes(normalizedParticipantId);
                const isMe = normalizedParticipantId === normalizedUserId;
                const playerMatch = [...(teamA?.players ?? []), ...(teamB?.players ?? [])].find(player => normalizeId(player.userId) === normalizedParticipantId);
                const nameFromParticipant = participant.userName?.trim();
                const nameFromPlayer = playerMatch?.userName?.trim();
                const displayName = isMe
                  ? (userName?.trim() || nameFromParticipant || nameFromPlayer || 'Bạn')
                  : (nameFromParticipant || nameFromPlayer || 'Người chơi');
                return (
                  <div
                    key={`${participant.userId}-${participant.userName ?? ''}`}
                    className={mobileShrink ? "flex items-center justify-between px-2 py-1 rounded bg-gray-800/70" : "flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/70"}
                  >
                    <span className={mobileShrink ? "text-[11px] font-semibold text-gray-100" : "text-sm font-semibold text-gray-100"}>
                      {accepted ? '✅' : '⏳'} {displayName}{isMe ? ' (Bạn)' : ''}
                    </span>
                    <span
                      className={mobileShrink ? "text-[10px] font-medium" : "text-xs font-medium"}
                      style={{ color: accepted ? '#86efac' : '#facc15' }}
                    >
                      {accepted ? 'Đã đồng ý' : 'Đang chờ'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={mobileShrink ? "text-[11px] text-gray-300 text-center mt-2" : "text-sm text-gray-300 text-center mt-2"}>
              {rematchProgressMessage}
            </div>
            <div className={mobileShrink ? "flex flex-col gap-2 mt-2" : "flex flex-col gap-3 mt-4"}>
              {shouldShowRematchAcceptButton ? (
                <button
                  onClick={handleRematch2v2Respond}
                  className={mobileShrink ? "px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-[12px] rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95" : "px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-base rounded-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95"}
                  type="button"
                >
                  Đồng ý tái đấu
                </button>
              ) : (
                <div className={mobileShrink ? "text-[11px] text-green-300 text-center font-semibold" : "text-sm text-green-300 text-center font-semibold"}>
                  {hasAcceptedRematch ? 'Đã ghi nhận đồng ý của bạn.' : 'Đang chờ tất cả thành viên xác nhận.'}
                </div>
              )}
              {shouldShowRematchDeclineButton && (
                <button
                  onClick={handleRematch2v2Decline}
                  className={mobileShrink ? "px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[12px] rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95" : "px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-base rounded-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95"}
                  type="button"
                >
                  Không đồng ý
                </button>
              )}
              {shouldShowRematchCancelButton && (
                <button
                  onClick={handleRematch2v2Cancel}
                  className={mobileShrink ? "px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-[12px] rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95" : "px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white text-base rounded-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95"}
                  type="button"
                >
                  Hủy yêu cầu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        {/* Nút luật thi đấu */}
        <div className="flex items-center">
          <button
            onClick={() => {
              if (isSolveLocked) return;
              setShowRules(true);
            }}
            disabled={isSolveLocked}
            className={
              `${mobileShrink
                ? "px-1 py-0.5 bg-blue-700 hover:bg-blue-800 text-[18px] rounded-full font-bold shadow-lg min-w-0 min-h-0 flex items-center justify-center"
                : "px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center"
              } transition-transform duration-200 hover:scale-110 active:scale-95 function-button ${isSolveLocked ? 'opacity-60 cursor-not-allowed' : ''}`
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
        {mobileShrink ? (
          <div className="flex justify-center w-full">
            <div className="mb-1 px-2 py-1 bg-gray-800 rounded text-[16px] font-mono font-bold tracking-widest select-all min-w-[60vw] max-w-[90vw] overflow-x-auto whitespace-normal inline-block"
              style={{ fontSize: 16, minWidth: '60vw', maxWidth: '90vw', overflowX: 'auto', whiteSpace: 'normal', width: 'fit-content' }}>
              {scramble}
            </div>
          </div>
        ) : (
          <div className="mb-2 px-2 py-1 bg-gray-800 rounded-xl text-2xl font-mono font-bold tracking-widest select-all max-w-4xl overflow-x-auto"
            style={{ maxWidth: '56rem', overflowX: 'auto' }}>
            {scramble}
          </div>
        )}
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
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Team</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">1</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">2</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">3</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">4</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">5</th>
                <th className="px-1 py-0.5 border border-gray-700 font-bold">Tổng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#60a5fa' }}>Đội A</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamAScores[0]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamAScores[1]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamAScores[2]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamAScores[3]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamAScores[4]}</td>
                <td className="px-1 py-0.5 border border-gray-700 font-bold text-green-300">{teamAScores.reduce((sum, score) => sum + score, 0)}</td>
              </tr>
              <tr>
                <td className="px-1 py-0.5 border border-gray-700 font-bold" style={{ color: '#10b981' }}>Đội B</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamBScores[0]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamBScores[1]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamBScores[2]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamBScores[3]}</td>
                <td className="px-1 py-0.5 border border-gray-700">{teamBScores[4]}</td>
                <td className="px-1 py-0.5 border border-gray-700 font-bold text-green-300">{teamBScores.reduce((sum, score) => sum + score, 0)}</td>
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
                
                // Ưu tiên hiển thị thông báo 2 lần DNF - ĐÃ HỦY
                if (showEarlyEndMsg.show) {
                  return null; // KHÔNG HIỆN MODAL
                }
                
                // Hiển thị thông báo kết quả khi bị khóa do 2 lần DNF (nếu không có showEarlyEndMsg)
                // Đảm bảo cả hai bên đều thấy thông báo về team thắng/thua/hòa
                if (isLockedDue2DNF && !showEarlyEndMsg.show) {
                  const baseClass = mobileShrink ? "text-[10px] font-semibold" : "text-2xl font-semibold";
                  if (teamAHasDoubleDNF && teamBHasDoubleDNF) {
                    return (
                      <span className={`${baseClass} text-yellow-400`}>
                        Team A và Team B đều có người bị 2 lần DNF. Trận đấu hòa.
                      </span>
                    );
                  }

                  if (teamAHasDoubleDNF || teamBHasDoubleDNF) {
                    const losingTeam = teamAHasDoubleDNF ? 'A' : 'B';
                    const winningTeam = losingTeam === 'A' ? 'B' : 'A';
                    const viewerPerspective = myTeam ?? null;
                    const viewerLost = viewerPerspective === losingTeam;
                    const viewerWon = viewerPerspective === winningTeam;
                    const toneClass = viewerLost ? 'text-orange-400' : viewerWon ? 'text-green-400' : 'text-green-400';
                    const message = viewerLost
                      ? `Team ${losingTeam} thua - có người bị 2 lần DNF. Team ${winningTeam} thắng.`
                      : `Team ${winningTeam} thắng - Team ${losingTeam} có người bị 2 lần DNF.`;
                    return (
                      <span className={`${baseClass} ${toneClass}`}>
                        {message}
                      </span>
                    );
                  }
                }
                
                // Nếu cả 2 team đã đủ 5 lượt thì thông báo kết quả
                const myTeamTotalSolves = getMyResults().length;
                const oppTeamTotalSolves = (myTeam === 'A' ? teamBResults : teamAResults).reduce((sum, playerResults) => sum + playerResults.length, 0);
                const bothDone = myTeamTotalSolves >= 5 && oppTeamTotalSolves >= 5;
                if (bothDone) {
                  const baseClass = mobileShrink ? "text-[10px] font-semibold" : "text-2xl font-semibold";
                  const totalScoreA = teamAScores.reduce((sum, score) => sum + (typeof score === 'number' ? score : 0), 0);
                  const totalScoreB = teamBScores.reduce((sum, score) => sum + (typeof score === 'number' ? score : 0), 0);
                  const averageA = computeTeamAverage(teamAResults);
                  const averageB = computeTeamAverage(teamBResults);
                  let winnerTeam: 'A' | 'B' | null = null;
                  let decidedByAverage = false;

                  if (totalScoreA > totalScoreB) {
                    winnerTeam = 'A';
                  } else if (totalScoreB > totalScoreA) {
                    winnerTeam = 'B';
                  } else {
                    if (averageA === null && averageB === null) {
                      winnerTeam = null;
                    } else if (averageA === null) {
                      winnerTeam = 'B';
                      decidedByAverage = true;
                    } else if (averageB === null) {
                      winnerTeam = 'A';
                      decidedByAverage = true;
                    } else if (averageA < averageB) {
                      winnerTeam = 'A';
                      decidedByAverage = true;
                    } else if (averageB < averageA) {
                      winnerTeam = 'B';
                      decidedByAverage = true;
                    } else {
                      winnerTeam = null;
                    }
                  }

                  if (!winnerTeam) {
                    return <span className={`${baseClass} text-yellow-400`}>Trận đấu kết thúc, hòa</span>;
                  }

                  const pointsSummary = `${totalScoreA} - ${totalScoreB}`;
                  const isViewerWinner = myTeam === winnerTeam;
                  const isViewerLoser = myTeam && myTeam !== winnerTeam;
                  const toneClass = isViewerWinner ? 'text-green-400' : isViewerLoser ? 'text-orange-400' : 'text-green-400';
                  const winnerLabel = `Team ${winnerTeam}`;

                  if (decidedByAverage) {
                    const winnerAvg = winnerTeam === 'A' ? averageA : averageB;
                    const loserAvg = winnerTeam === 'A' ? averageB : averageA;
                    const prettifyAverage = (value: number|null) => {
                      if (value === null) return 'DNF';
                      const formatted = (value / 1000).toFixed(2);
                      return `${formatted}s`;
                    };
                    return (
                      <span className={`${baseClass} ${toneClass}`}>
                        Trận đấu kết thúc, {winnerLabel} thắng nhờ trung bình {prettifyAverage(winnerAvg)} tốt hơn {prettifyAverage(loserAvg)} (điểm {pointsSummary}).
                      </span>
                    );
                  }

                  return (
                    <span className={`${baseClass} ${toneClass}`}>
                      Trận đấu kết thúc, {winnerLabel} thắng với tổng điểm {pointsSummary}.
                    </span>
                  );
                }
                
                // Đang trong trận - chỉ hiển thị khi không bị khóa do 2 lần DNF
                if (!isLockedDue2DNF) {
                  let msg = "";
                  let name = isMyTurn() ? userName : currentPlayerName;
                  if (prep) {
                    msg = `${name} (Team ${currentTeam}) đang chuẩn bị`;
                  } else if (running) {
                    msg = `${name} (Team ${currentTeam}) đang giải`;
                  } else {
                    msg = `Đến lượt ${name} (Team ${currentTeam}) thi đấu`;
                  }
                  
                  // Thêm thông báo rõ ràng về lượt chơi
                
                  
                  return (
                    <>
                      <span className={mobileShrink ? "text-[10px] font-semibold text-green-300" : "text-xl font-semibold text-green-300"}>{msg}</span>
                      {showScrambleMsg && (
                        <span className={mobileShrink ? "text-[10px] font-semibold text-yellow-300 block mt-1" : "text-2xl font-semibold text-yellow-300 block mt-2"}>
                          Các cuber hãy tráo scramble
                        </span>
                      )}
                    </>
                  );
                }
                
                // Hiển thị thông báo khi bị khóa do 2 lần DNF
                return (
                  <span className={`${mobileShrink ? "text-[10px] font-semibold" : "text-xl font-semibold"} text-red-400`}>
                    ⚠️ KHÓA THAO TÁC DO 2 LẦN DNF! 
                    <br />
                    {(() => {
                      const myDnfCount = getMyResults().filter(r => r === null).length;
                      const oppDnfCount = myTeam
                        ? (myTeam === 'A' ? teamBResults : teamAResults).reduce((sum, playerResults) => sum + playerResults.filter(r => r === null).length, 0)
                        : opponentResults.filter(r => r === null).length;
                      
                      if (myDnfCount >= 2 && oppDnfCount >= 2) {
                        return `Cả hai đều có 2 lần DNF. Tái đấu để mở khóa.`;
                      } else if (myDnfCount >= 2) {
                        return `Bạn có 2 lần DNF. Tái đấu để mở khóa.`;
                      } else {
                        return `Đối thủ có 2 lần DNF. Tái đấu để mở khóa.`;
                      }
                    })()}
                  </span>
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
                <th className="py-2 border border-gray-700" style={{ color: myTeamColor }}>
                  {myPlayerLabel}
                </th>
                <th className="py-2 border border-gray-700" style={{ color: myTeamColor }}>
                  {teammateLabel}
                </th>
                <th className="py-2 border border-gray-700" style={{ color: opponentTeamColor }}>
                  {opponentLabel1}
                </th>
                <th className="py-2 border border-gray-700" style={{ color: opponentTeamColor }}>
                  {opponentLabel2}
                </th>
              </tr>
            </thead>
            <tbody>
              {[0,1,2,3,4].map(i => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="py-1 border border-gray-700">{i+1}</td>
                  {/* Cột 1: Kết quả của bản thân */}
                  <td className="py-1 border border-gray-700">
                    {formatSolveCell(displayMyTeamResults[effectiveMyIndex]?.[i])}
                  </td>
                  {/* Cột 2: Kết quả của đồng đội */}
                  <td className="py-1 border border-gray-700">
                    {formatSolveCell(displayMyTeamResults[teammateIndex]?.[i])}
                  </td>
                  {/* Cột 3: Kết quả của đối thủ 1 */}
                  <td className="py-1 border border-gray-700">
                    {formatSolveCell(displayOpponentResults[opponentIndexForMe]?.[i])}
                  </td>
                  {/* Cột 4: Kết quả của đối thủ 2 */}
                  <td className="py-1 border border-gray-700">
                    {formatSolveCell(displayOpponentResults[opponentIndexForTeammate]?.[i])}
                  </td>
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
            className={mobileShrink ? `rounded flex items-center justify-center mb-0.5 relative shadow border ${myTeam === 'A' ? 'border-blue-400' : 'border-green-400'}` : `rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl border-4 ${myTeam === 'A' ? 'border-blue-400' : 'border-green-400'}`}
            style={mobileShrink
              ? { width: 160, height: 120, minWidth: 100, minHeight: 80, maxWidth: 180, maxHeight: 140 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 360, height: 270 }}
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
              <div style={{fontSize: mobileShrink ? 8 : 13, color: '#aaa', fontWeight: 400, lineHeight: 1}}>MEDIAN</div>
              <div style={{fontSize: (() => {
                const myResults = getMyResults();
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
                const myResults = getMyResults();
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
                <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 13 : 16 }}>
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
            }}>{myPlayerLabel}</div>
          </div>
        </div>
        {/* Timer ở giữa - cột 2 */}
        <div
          className={mobileShrink ? "flex flex-col items-center justify-start timer-area" : "flex flex-col items-center justify-start timer-area"}
          style={
            mobileShrink
              ? {
                  flex: '0 1 20%',
                  minWidth: 120,
                  maxWidth: 220,
                  paddingTop: 36,
                  ...(isMobile ? {} : { cursor: 'default' }),
                }
              : {
                  flex: '0 1 20%',
                  minWidth: 200,
                  maxWidth: 360,
                  paddingTop: isMobileLandscape ? 72 : 160,
                  ...(isMobile ? {} : { cursor: 'default' }),
                }
          }
        {...(isMobile ? {
            onTouchStart: (e) => {
              if (pendingResult !== null || isLockedDue2DNF || !isMyTurn()) return;
              if (isTypingMode) return; // Chặn touch khi đang ở chế độ typing
              // Nếu chạm vào webcam thì bỏ qua
              const webcamEls = document.querySelectorAll('.webcam-area');
              for (let i = 0; i < webcamEls.length; i++) {
                if (webcamEls[i].contains(e.target as Node)) return;
              }
              const myCurrentResults = getMyResults();
              if (waiting || myCurrentResults.length >= 5) return;
              // Đánh dấu touch bắt đầu
              pressStartRef.current = Date.now();
              setSpaceHeld(true); // Đang giữ tay
            },
                          onTouchEnd: (e) => {
                if (pendingResult !== null || isLockedDue2DNF || !isMyTurn()) return;
                if (isTypingMode) return; // Chặn touch khi đang ở chế độ typing
                // Nếu chạm vào webcam thì bỏ qua
                const webcamEls = document.querySelectorAll('.webcam-area');
                for (let i = 0; i < webcamEls.length; i++) {
                  if (webcamEls[i].contains(e.target as Node)) return;
                }
                const myCurrentResults = getMyResults();
                if (waiting || myCurrentResults.length >= 5) return;
              const now = Date.now();
              const start = pressStartRef.current;
              pressStartRef.current = null;
              setSpaceHeld(false); // Thả tay
              // 1. Tap and release to enter prep
              if (!prep && !running && isMyTurn()) {
                setPrep(true);
                setPrepTime(15);
                setDnf(false);
                // Gửi timer-prep event chỉ cho 2vs2
                const socket = getSocket();
                socket.emit("timer-prep-2vs2", { roomId, userId, remaining: 15 });
                return;
              }
              // 2. In prep, giữ >=0.5s rồi thả ra để start timer
              if (prep && !running) {
                if (start && now - start >= 300) {
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
                
                // Lấy thời gian chính xác từ performance.now()
                const currentTime = Math.round(performance.now() - startTimeRef.current);
                setTimer(currentTime);
                timerRef.current = currentTime;
                
                // Gửi timer-update event
                const socket = getSocket();
                socket.emit("timer-update-2vs2", { roomId, userId, ms: currentTime, running: false, finished: false });
                setPendingResult(currentTime);
                setPendingType('normal');
                setCanStart(false);
                return;
              }
            }
          } : {})}
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
                  socket.emit("timer-update-2vs2", { roomId, userId, ms: result === null ? 0 : result, running: false, finished: true });
                  
                  setMyResults([...getMyResults(), result]);
                  socket.emit("solve", { roomId, userId, userName, time: result === null ? null : result });
                  setPendingResult(null);
                  setPendingType('normal');
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
                  socket.emit("timer-update-2vs2", { roomId, userId, ms: result, running: false, finished: true });
                  
                  setMyResults([...getMyResults(), result]);
                  socket.emit("solve", { roomId, userId, userName, time: result });
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
                  socket.emit("timer-update-2vs2", { roomId, userId, ms: 0, running: false, finished: true });
                  
                  setMyResults([...getMyResults(), null]);
                  socket.emit("solve", { roomId, userId, userName, time: null });
                  setPendingResult(null);
                  setPendingType('normal');
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


          {/* Nút Xuất kết quả sau khi trận đấu kết thúc */}
          {canExportResults && (
            <div className="flex flex-row items-center justify-center gap-2 mb-2">
              <button
                className={`${mobileShrink ? "px-2 py-1 text-[10px] rounded bg-blue-600 hover:bg-blue-700 font-bold text-white" : "px-4 py-2 text-base rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white"} transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg result-button`}
                onClick={() => {
                  // Lấy ngày và thời gian hiện tại
                  const now = new Date();
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
                  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

                  const formatMs = (ms: number) => {
                    const cs = Math.floor((ms % 1000) / 10);
                    const s = Math.floor((ms / 1000) % 60);
                    const m = Math.floor(ms / 60000);

                    if (m > 0) return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
                    if (s > 0) return `${s}.${cs.toString().padStart(2, "0")}`;
                    return `0.${cs.toString().padStart(2, "0")}`;
                  };

                  const formatResult = (value: number | null | undefined) => {
                    if (value === null) return 'DNF';
                    if (typeof value === 'number') return formatMs(value);
                    return '';
                  };

                  const formatStats = (stats: ReturnType<typeof calcStats>) => ({
                    best: stats.best !== null ? formatMs(stats.best) : 'DNF',
                    worst: stats.worst !== null ? formatMs(stats.worst) : 'DNF',
                    mean: stats.mean !== null ? formatMs(stats.mean) : 'DNF',
                    ao5: stats.ao5 !== null ? formatMs(stats.ao5) : 'DNF',
                  });

                  const summarizePlayer = (playerName: string, results: (number|null)[]) => {
                    let section = `NGƯỜI CHƠI: ${playerName}\n`;
                    section += `Kết quả từng lượt:\n`;
                    for (let i = 0; i < 5; i++) {
                      section += `  Lượt ${i+1}: ${formatResult(results?.[i])}\n`;
                    }
                    const stats = formatStats(calcStats(results));
                    section += `Thống kê:\n`;
                    section += `  Best: ${stats.best}\n`;
                    section += `  Worst: ${stats.worst}\n`;
                    section += `  Mean: ${stats.mean}\n`;
                    section += `  Ao5: ${stats.ao5}\n`;
                    section += `\n`;
                    return section;
                  };

                  const computeTeamScore = (scores: number[]) => scores.reduce((sum, score) => sum + (typeof score === 'number' ? score : 0), 0);
                  const totalScoreA = computeTeamScore(teamAScores);
                  const totalScoreB = computeTeamScore(teamBScores);
                  const averageA = computeTeamAverage(teamAResults);
                  const averageB = computeTeamAverage(teamBResults);

                  const determineWinnerLabel = () => {
                    if (hasCompleted1v1Match) {
                      const myStats = calcStats(myResults);
                      const oppStats = calcStats(opponentResults);

                      if (myStats.ao5 !== null && oppStats.ao5 !== null) {
                        if (myStats.ao5 < oppStats.ao5) return userName;
                        if (myStats.ao5 > oppStats.ao5) return opponentName;
                        return 'Hòa';
                      }
                      if (myStats.ao5 !== null) return userName;
                      if (oppStats.ao5 !== null) return opponentName;
                      return 'Không xác định';
                    }

                    if (hasCompleted2v2Match) {
                      if (totalScoreA > totalScoreB) return 'Team A';
                      if (totalScoreB > totalScoreA) return 'Team B';
                      if (averageA === null && averageB === null) return 'Hòa';
                      if (averageA === null) return 'Team B (hệ số trung bình)';
                      if (averageB === null) return 'Team A (hệ số trung bình)';
                      if (averageA < averageB) return 'Team A (hệ số trung bình)';
                      if (averageB < averageA) return 'Team B (hệ số trung bình)';
                      return 'Hòa';
                    }

                    return 'Không xác định';
                  };

                  const getTeamSummary = (teamLabel: 'Team A' | 'Team B', teamData: { teamId: string; players: TeamPlayer[] }, teamResults: (number|null)[][], roundScores: number[]) => {
                    const playerDisplay = teamData.players.map(player => player?.userName || '').filter(name => name && name.trim().length > 0).join(' & ');
                    const participantLine = playerDisplay.length > 0 ? playerDisplay : 'Chưa xác định';
                    let section = `${teamLabel.toUpperCase()}: ${participantLine}\n`;
                    section += `Thành viên: ${teamData.players.map((player, idx) => {
                      const name = player?.userName || `Player ${idx + 1}`;
                      const idSuffix = typeof player?.userId === 'string' && player.userId.length >= 4
                        ? player.userId.slice(-4)
                        : '';
                      return idSuffix ? `${name} (#${idSuffix})` : name;
                    }).join(', ')}\n`;
                    section += `Điểm từng vòng: ${roundScores.map((score, index) => `V${index+1}:${score}`).join(', ')}\n`;
                    section += `Tổng điểm: ${computeTeamScore(roundScores)}\n`;
                    const avg = computeTeamAverage(teamResults);
                    section += `Hệ số trung bình toàn đội: ${avg !== null ? formatMs(avg) : 'DNF'}\n`;
                    section += `\n`;

                    teamResults.forEach((playerResults, idx) => {
                      const playerName = teamData.players[idx]?.userName || `Player ${idx + 1}`;
                      section += summarizePlayer(`${teamLabel} - ${playerName}`, playerResults ?? []);
                    });

                    return section;
                  };

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

                  if (Array.isArray(scrambles) && scrambles.length >= 5) {
                    txt += `SCRAMBLE ĐÃ SỬ DỤNG:\n`;
                    for (let i = 0; i < 5; i++) {
                      txt += `  Lượt ${i+1}: ${scrambles[i] || ''}\n`;
                    }
                    txt += `\n`;
                  }

                  if (hasCompleted1v1Match) {
                    txt += summarizePlayer(userName, myResults);
                    txt += summarizePlayer(opponentName, opponentResults);
                  }

                  if (hasCompleted2v2Match) {
                    txt += getTeamSummary('Team A', teamA, teamAResults, teamAScores);
                    txt += getTeamSummary('Team B', teamB, teamBResults, teamBScores);
                  }

                  txt += `KẾT QUẢ CUỐI CÙNG:\n`;
                  txt += `Đội/người thắng: ${determineWinnerLabel()}\n`;

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
                    if (e.key === 'Enter' && !IsMyTurn()) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  placeholder={IsMyTurn() && !isLockedDue2DNF ? " " : (isLockedDue2DNF ? "🚫 Bị KHÓA" : "No send")}
                  disabled={!IsMyTurn() || isLockedDue2DNF}
                  className={`${mobileShrink ? "px-2 py-1 text-sm" : "px-4 py-3 text-2xl"} bg-gray-800 text-white border-2 rounded-lg focus:outline-none text-center font-mono ${
                    IsMyTurn() && !isLockedDue2DNF
                      ? 'border-blue-500 focus:border-blue-400' 
                      : 'border-gray-500 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{ 
                    width: mobileShrink ? '160px' : '280px',
                    fontSize: mobileShrink ? '14px' : '24px'
                  }}
                  maxLength={5}
                  autoFocus={IsMyTurn()}
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  disabled={!IsMyTurn() || isLockedDue2DNF}
                  className={`${mobileShrink ? "px-3 py-1 text-xs" : "px-6 py-3 text-lg"} rounded-lg font-bold transition-all duration-200 ${
                    IsMyTurn() && !isLockedDue2DNF
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                      : 'bg-gray-500 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {IsMyTurn() && !isLockedDue2DNF ? 'Gửi kết quả' : (isLockedDue2DNF ? '🚫 Bị KHÓA' : 'Không phải lượt của bạn')}
                </button>
              </form>
              <div className={`${mobileShrink ? "text-[10px]" : "text-sm"} text-gray-400 mt-1 text-center`}>
                {IsMyTurn() && !isLockedDue2DNF ? 'Để trống = DNF, Enter để gửi' : (isLockedDue2DNF ? '🚫 KHÓA DO 2 LẦN DNF - CHỈ CÓ THỂ TÁI ĐẤU' : 'Chờ đến lượt của bạn')}
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
                  <span className={mobileShrink ? "text-[20px]" : "text-[56px] leading-tight"}>
                    Chuẩn bị: {prepTime}s
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
              {prep && !spaceHeld && <div className={mobileShrink ? "text-[8px] text-gray-400 mt-0.5" : "text-sm text-gray-400 mt-1"}>Bấm và giữ Space để chuẩn bị</div>}
              {prep && spaceHeld && <div className={mobileShrink ? "text-[8px] text-green-400 mt-0.5" : "text-sm text-green-400 mt-1"}>Giữ Space &gt;=300ms rồi thả để bắt đầu</div>}
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
            className={mobileShrink ? `rounded flex items-center justify-center mb-0.5 relative shadow border ${myTeam === 'A' ? 'border-green-400' : 'border-blue-400'}` : `rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl border-4 ${myTeam === 'A' ? 'border-green-400' : 'border-blue-400'}`}
            style={mobileShrink
              ? { width: 160, height: 120, minWidth: 100, minHeight: 80, maxWidth: 180, maxHeight: 140 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 360, height: 270 }}
          >
            {/* Video element for remote webcam */}
            <video
              id="opponent-video"
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', background: '#111', display: 'block' }}
            />
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
              <div style={{fontSize: (() => {
                const oppTeamResults = myTeam === 'A' ? teamBResults : teamAResults;
                const allOppResults = oppTeamResults.flat();
                if (allOppResults.length > 0) {
                  const stats = calcStats(allOppResults);
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
                const oppTeamResults = myTeam === 'A' ? teamBResults : teamAResults;
                const allOppResults = oppTeamResults.flat();
                if (allOppResults.length > 0) {
                  const stats = calcStats(allOppResults);
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
              {(() => {
                const targetId = opponentUserId1;
                const isTargetActive = targetId && normalizeId(activeRemoteUserId) === normalizeId(targetId);
                if (isTargetActive && opponentPrep) {
                  return <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 13 : 16, fontFamily: 'inherit' }}>Chuẩn bị: {opponentPrepTime}s</span>;
                }
                if (isTargetActive) {
                  const cs = Math.floor((opponentTimer % 1000) / 10);
                  const s = Math.floor((opponentTimer / 1000) % 60);
                  const m = Math.floor(opponentTimer / 60000);
                  const timeStr = m > 0 ? `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}` : (s > 0 ? `${s}.${cs.toString().padStart(2, "0")}` : `0.${cs.toString().padStart(2, "0")}`);
                  const fontSize = timeStr.length <= 4 ? (mobileShrink ? 18 : 24) : (timeStr.length <= 6 ? (mobileShrink ? 16 : 20) : (mobileShrink ? 14 : 18));
                  return (
                    <>
                      <span style={{ fontFamily: 'inherit', fontSize: fontSize }}>{timeStr}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                    </>
                  );
                }
                return (
                  <>
                    <span style={{ fontFamily: 'inherit', fontSize: mobileShrink ? 18 : 24 }}>0.00</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                  </>
                );
              })()}
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
            }}>{opponentLabel1}</div>
          </div>
        </div>
      </div>

      {/* Hàng thứ 2: Webcam của người khác (người quan sát/người chơi khác) */}
      <div
        className={mobileShrink ? "w-full flex flex-row justify-center items-center gap-2 box-border mb-2" : "w-full flex flex-row justify-center items-center gap-4 box-border mb-4"}
        style={mobileShrink ? { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' } : { maxWidth: '100vw', minHeight: 0, minWidth: 0, height: 'auto' }}
      >
        {/* Webcam người khác 1 - cột 1 */}
        <div
          className={mobileShrink ? "flex flex-col items-center webcam-area flex-shrink-0" : "flex flex-col items-center webcam-area flex-shrink-0"}
          style={mobileShrink ? { flex: '0 1 40%', maxWidth: 180, minWidth: 100 } : { flex: '0 1 40%', maxWidth: 420, minWidth: 180 }}
        >
          <div
            className={mobileShrink ? `rounded flex items-center justify-center mb-0.5 relative shadow border ${myTeam === 'A' ? 'border-blue-400' : 'border-green-400'}` : `rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl border-4 ${myTeam === 'A' ? 'border-blue-400' : 'border-green-400'}`}
            style={mobileShrink
              ? { width: 160, height: 120, minWidth: 100, minHeight: 80, maxWidth: 180, maxHeight: 140 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 360, height: 270 }}
          >
            {/* Video element for other person 1 */}
            <video
              id="other-person-1-video"
              ref={otherPerson1VideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', background: '#111', display: 'block' }}
            />
          </div>
          {/* Thông tin người khác 1 */}
          <div className="flex flex-row items-center gap-1 mb-1">
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
              <div style={{fontSize: teammateMedianDisplay.fontSize}}>{teammateMedianDisplay.text}</div>
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
              {(() => {
                const targetId = teammateUserId;
                const isTargetActive = targetId && normalizeId(activeRemoteUserId) === normalizeId(targetId);
                if (isTargetActive && opponentPrep) {
                  return <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 13 : 16, fontFamily: 'inherit' }}>Chuẩn bị: {opponentPrepTime}s</span>;
                }
                if (isTargetActive) {
                  const cs = Math.floor((opponentTimer % 1000) / 10);
                  const s = Math.floor((opponentTimer / 1000) % 60);
                  const m = Math.floor(opponentTimer / 60000);
                  const timeStr = m > 0 ? `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}` : (s > 0 ? `${s}.${cs.toString().padStart(2, "0")}` : `0.${cs.toString().padStart(2, "0")}`);
                  const fontSize = timeStr.length <= 4 ? (mobileShrink ? 18 : 24) : (timeStr.length <= 6 ? (mobileShrink ? 16 : 20) : (mobileShrink ? 14 : 18));
                  return (
                    <>
                      <span style={{ fontFamily: 'inherit', fontSize: fontSize }}>{timeStr}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                    </>
                  );
                }
                return (
                  <>
                    <span style={{ fontFamily: 'inherit', fontSize: mobileShrink ? 18 : 24 }}>0.00</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                  </>
                );
              })()}
            </div>
            {/* Tên người khác 1 */}
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
            }}>{teammateLabel}</div>
          </div>
        </div>

        {/* Khoảng trống ở giữa - cột 2 */}
        <div
          className={mobileShrink ? "flex flex-col items-center justify-center" : "flex flex-col items-center justify-center"}
          style={mobileShrink ? { flex: '0 1 20%', minWidth: 120, maxWidth: 200 } : { flex: '0 1 20%', minWidth: 180, maxWidth: 320 }}
        >
          {/* Có thể thêm thông tin khác ở đây nếu cần */}
        </div>

        {/* Webcam người khác 2 - cột 3 */}
        <div
          className={mobileShrink ? "flex flex-col items-center webcam-area flex-shrink-0" : "flex flex-col items-center webcam-area flex-shrink-0"}
          style={mobileShrink ? { flex: '0 1 40%', maxWidth: 180, minWidth: 100 } : { flex: '0 1 40%', maxWidth: 420, minWidth: 180 }}
        >
          <div
            className={mobileShrink ? `rounded flex items-center justify-center mb-0.5 relative shadow border ${myTeam === 'A' ? 'border-green-400' : 'border-blue-400'}` : `rounded-2xl flex items-center justify-center mb-2 relative shadow-2xl border-4 ${myTeam === 'A' ? 'border-green-400' : 'border-blue-400'}`}
            style={mobileShrink
              ? { width: 160, height: 120, minWidth: 100, minHeight: 80, maxWidth: 180, maxHeight: 140 }
              : isMobile && !isPortrait
                ? { width: '28vw', height: '20vw', minWidth: 0, minHeight: 0, maxWidth: 180, maxHeight: 120 }
                : isMobile ? { width: '95vw', maxWidth: 420, height: '38vw', maxHeight: 240, minHeight: 120 } : { width: 360, height: 270 }}
          >
            {/* Video element for other person 2 */}
            <video
              id="other-person-2-video"
              ref={otherPerson2VideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', background: '#111', display: 'block' }}
            />
          </div>
          {/* Thông tin người khác 2 */}
          <div className="flex flex-row items-center gap-1 mb-1">
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
              <div style={{fontSize: opponentSecondaryMedianDisplay.fontSize}}>{opponentSecondaryMedianDisplay.text}</div>
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
              {(() => {
                const targetId = opponentUserId2;
                const isTargetActive = targetId && normalizeId(activeRemoteUserId) === normalizeId(targetId);
                if (isTargetActive && opponentPrep) {
                  return <span style={{ color: '#fbc02d', fontSize: mobileShrink ? 13 : 16, fontFamily: 'inherit' }}>Chuẩn bị: {opponentPrepTime}s</span>;
                }
                if (isTargetActive) {
                  const cs = Math.floor((opponentTimer % 1000) / 10);
                  const s = Math.floor((opponentTimer / 1000) % 60);
                  const m = Math.floor(opponentTimer / 60000);
                  const timeStr = m > 0 ? `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}` : (s > 0 ? `${s}.${cs.toString().padStart(2, "0")}` : `0.${cs.toString().padStart(2, "0")}`);
                  const fontSize = timeStr.length <= 4 ? (mobileShrink ? 18 : 24) : (timeStr.length <= 6 ? (mobileShrink ? 16 : 20) : (mobileShrink ? 14 : 18));
                  return (
                    <>
                      <span style={{ fontFamily: 'inherit', fontSize: fontSize }}>{timeStr}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                    </>
                  );
                }
                return (
                  <>
                    <span style={{ fontFamily: 'inherit', fontSize: mobileShrink ? 18 : 24 }}>0.00</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: mobileShrink ? 10 : 13, marginLeft: 2 }}>s</span>
                  </>
                );
              })()}
            </div>
            {/* Tên người khác 2 */}
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
            }}>{opponentLabel2}</div>
          </div>
        </div>
      </div>

      {/* Mount DailyVideoCall (Daily.co) sau webcam row để quản lý stream */}
      {roomUrl && typeof roomUrl === 'string' && roomUrl.length > 0 ? (
        <DailyVideoCall
          key={roomUrl}
          roomUrl={roomUrl}
          camOn={camOn}
          micOn={micOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          otherPerson1VideoRef={otherPerson1VideoRef}
          otherPerson2VideoRef={otherPerson2VideoRef}
          is2vs2={true}
          participantSlotResolver={resolveDailyParticipantSlot}
          selfUserData={dailySelfUserData}
          selfUserName={userName}
        />
      ) : null}

      {insufficientModal.show && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 modal-backdrop">
          <div className="modal-content bg-[#1f2430] text-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md border border-[#343b4d]">
            <h2 className="text-2xl font-bold mb-3">
              {insufficientModal.forceClose ? 'Phòng đã bị đóng' : 'Phòng thiếu người chơi'}
            </h2>
            <p className="text-sm md:text-base text-gray-200 leading-relaxed mb-5">
              {insufficientModal.message || 'Phòng thiếu người nên trận đấu bị hủy. Vui lòng rời phòng để quay lại sảnh.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLeaveRoom}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all duration-200"
              >
                Rời phòng
              </button>
            </div>
          </div>
        </div>
      )}

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

// Dynamic import cho DailyVideoCall tránh lỗi SSR, không cần generic
const DailyVideoCall = dynamic(() => import('@/components/DailyVideoCall'), { ssr: false });