'use client';

// Khai báo window._roomPassword và _roomDisplayName để tránh lỗi TS
declare global {
  interface Window { 
    _roomPassword?: string;
    _roomDisplayName?: string;
  }
}

import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';

// Dynamic import để tránh SSR issues
const DailyVideoCall = dynamic(() => import('@/components/DailyVideoCall'), { ssr: false });

interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isObserver: boolean;
  team?: 'team1' | 'team2';
  position?: number;
  role?: 'creator' | 'player' | 'observer';
}

interface WaitingRoomState {
  roomId: string;
  players: Player[];
  roomCreator: string;
  gameStarted: boolean;
  displayName?: string; // Thêm displayName
  password?: string; // Thêm password
}

type ModalTransitionStage = "enter" | "exit" | "idle";
const MODAL_TRANSITION_MS = 240;

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

const AuroraModalBackdrop = ({ open, children, disableAnimation }: { open: boolean; children: ReactNode; disableAnimation?: boolean }) => {
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

export default function WaitingRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  
  const [socket, setSocket] = useState<any>(null);
  const [roomState, setRoomState] = useState<WaitingRoomState>({
    roomId: '',
    players: [],
    roomCreator: '',
    gameStarted: false
  });

  // State cho device detection và fullscreen
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomUrl, setRoomUrl] = useState('');
  const [customBg, setCustomBg] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isRoomFullModalVisible, setIsRoomFullModalVisible] = useState(false);
  const roomFullTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{from: 'me'|'opponent', text: string, userName?: string}[]>([]);
  const [hasNewChat, setHasNewChat] = useState(false);
  const chatListRef = useRef<HTMLDivElement|null>(null);

  // Swap seat states
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapRequest, setSwapRequest] = useState<{
    fromPlayer: Player;
    toPlayer: Player;
    fromPosition: number;
    toPosition: number;
    status: 'pending' | 'accepted' | 'rejected';
  } | null>(null);
  const [pendingSwapRequest, setPendingSwapRequest] = useState<{
    fromPlayer: Player;
    toPlayer: Player;
    fromPosition: number;
    toPosition: number;
  } | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      currentUserIdRef.current = currentUser.id;
      return;
    }

    if (user?.firstName || user?.lastName) {
      const candidateName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      if (candidateName.length > 0) {
        const found = roomState.players.find(p => p.name === candidateName);
        if (found) {
          currentUserIdRef.current = found.id;
          return;
        }
      }
    }

    currentUserIdRef.current = null;
  }, [currentUser, roomState.players, user?.firstName, user?.lastName]);

  // Load user từ API giống như lobby
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user/me", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          setCustomBg(data.user.customBg || '');
        } else {
        }
      } catch (err) {
        console.error("❌ Error fetching user:", err);
      } finally {
        setIsUserLoaded(true);
      }
    };
    fetchUser();
  }, []);

  // Device detection và orientation check
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  
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
        if (!interval) {
          interval = setInterval(() => {
            checkFullscreenStatus();
            if (!isFullscreen) {
              requestFullscreen();
            }
          }, 2000);
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
      const intervalTimeout = setTimeout(startInterval, 2000);

      return () => {
        clearTimeout(initialTimeout);
        clearTimeout(intervalTimeout);
        if (interval) {
          clearInterval(interval);
        }
        fullscreenChangeEvents.forEach(event => {
          document.removeEventListener(event, checkFullscreenStatus);
        });
      };
    }
  }, [isMobile, isFullscreen]);

  useEffect(() => {
    // Lấy room URL từ sessionStorage
    const dailyRoomUrl = sessionStorage.getItem(`dailyRoomUrl_${roomId}`);
    if (dailyRoomUrl) {
      setRoomUrl(dailyRoomUrl);
    }

    // Kết nối socket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://rubik-socket-server-production-3b21.up.railway.app';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      
      // Lấy thông tin user từ API thay vì sessionStorage
      const fetchUserAndJoin = async () => {
        try {
          const res = await fetch("/api/user/me", { credentials: "include", cache: "no-store" });
          const data = await res.json();
          
          if (data && data.user) {
            const user = data.user;
            const userId = user._id || user.id || Date.now().toString();
            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player';
            
            // Cập nhật currentUser state
            setCurrentUser({
              id: userId,
              name: userName,
              isReady: false,
              isObserver: false
            });
            
            newSocket.emit('join-waiting-room', {
              roomId,
              userId,
              userName,
              displayName: window._roomDisplayName || roomId, // Sẽ được cập nhật từ server
              password: window._roomPassword || null
            });
          }
        } catch (error) {
          console.error('=== DEBUG: Error fetching user data for socket join ===', error);
        }
      };
      
      fetchUserAndJoin();
    });

    newSocket.on('waiting-room-updated', (data: WaitingRoomState) => {
      
      // Cập nhật currentUser role từ server data
      // Tìm player data dựa trên userId đã gửi lên server
      const playerData = data.players.find(p => {
        // Tìm theo ID hiện tại hoặc theo tên nếu ID chưa match
        const matchById = p.id === currentUser?.id;
        const matchByName = currentUser?.name && p.name === currentUser.name;
        return matchById || matchByName;
      });
      
      if (playerData) {
        setCurrentUser(prev => {
          const updated = prev ? {
            ...prev,
            id: playerData.id, // Đảm bảo ID được cập nhật
            role: playerData.role,
            isObserver: playerData.isObserver,
            isReady: playerData.isReady,
            team: playerData.team,
            position: playerData.position
          } : {
            id: playerData.id,
            name: playerData.name,
            isReady: playerData.isReady,
            isObserver: playerData.isObserver,
            role: playerData.role,
            team: playerData.team,
            position: playerData.position
          };
          return updated;
        });
      } else if (currentUser?.id && data.roomCreator === currentUser.id) {
        // Fallback: nếu không tìm thấy playerData nhưng là roomCreator, set role creator và ready
        setCurrentUser(prev => prev ? {
          ...prev,
          role: 'creator' as const,
          isReady: true
        } : {
          id: currentUser.id,
          name: currentUser.name,
          role: 'creator' as const,
          isReady: true,
          isObserver: false,
          team: 'team1' as const,
          position: 1
        });
      } else {
        // Fallback: Tìm player theo tên nếu có currentUser.name
        if (currentUser?.name) {
          const playerByName = data.players.find(p => p.name === currentUser.name);
          if (playerByName) {
            setCurrentUser(prev => prev ? {
              ...prev,
              id: playerByName.id,
              role: playerByName.role,
              isObserver: playerByName.isObserver,
              isReady: playerByName.isReady,
              team: playerByName.team,
              position: playerByName.position
            } : {
              id: playerByName.id,
              name: playerByName.name,
              isReady: playerByName.isReady,
              isObserver: playerByName.isObserver,
              role: playerByName.role,
              team: playerByName.team,
              position: playerByName.position
            });
          }
        }
      }
      
      setRoomState(data);
      
      // Fallback cuối cùng: Nếu currentUser vẫn null sau khi cập nhật roomState
      // Tìm player có tên trùng với user hiện tại (từ user state)
      if (!currentUser && data.players.length > 0 && user?.firstName && user?.lastName) {
        const currentUserName = `${user.firstName} ${user.lastName}`.trim();
        const playerByName = data.players.find(p => p.name === currentUserName);
        if (playerByName) {
          setCurrentUser({
            id: playerByName.id,
            name: playerByName.name,
            isReady: playerByName.isReady,
            isObserver: playerByName.isObserver,
            role: playerByName.role,
            team: playerByName.team,
            position: playerByName.position
          });
        }
      }
      
      // Fallback bổ sung: Nếu vẫn không tìm thấy, tìm theo ID từ user data
      if (!currentUser && data.players.length > 0 && user?._id) {
        const playerById = data.players.find(p => p.id === user._id);
        if (playerById) {
          setCurrentUser({
            id: playerById.id,
            name: playerById.name,
            isReady: playerById.isReady,
            isObserver: playerById.isObserver,
            role: playerById.role,
            team: playerById.team,
            position: playerById.position
          });
        }
      }
    });

    newSocket.on('game-started', (data: { roomId: string, gameMode: string }) => {
      // Set sessionStorage để page2 biết đây là 2vs2 mode
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`gameMode_${data.roomId}`, data.gameMode);
        
        // Set lại roomMeta với displayName từ roomState để page2 có thể sử dụng
        if (roomState.displayName) {
          sessionStorage.setItem(`roomMeta_${data.roomId}`, JSON.stringify({
            event: '3x3', // default event
            displayName: roomState.displayName,
            password: roomState.password || '',
            gameMode: '2vs2'
          }));
        }

        // Lưu snapshot team/position để page2 khởi tạo chính xác
        if (roomState.players && roomState.players.length > 0) {
          const serializedPlayers = roomState.players.map(player => ({
            userId: player.id,
            userName: player.name,
            team: player.team || null,
            position: typeof player.position === 'number' ? player.position : null,
            role: player.role,
            isObserver: !!player.isObserver,
            isReady: !!player.isReady
          }));
          sessionStorage.setItem(`roomTeams_${data.roomId}`, JSON.stringify(serializedPlayers));
        }
      }
      router.push(`/room/${data.roomId}/page2`);
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    // Chat handlers
    newSocket.on('chat', (data: { from: string; userName: string; message: string; userId: string }) => {
      // Tin nhắn từ người khác (server đã không gửi cho chính người gửi)
      setChatMessages(msgs => [...msgs, { from: 'opponent', text: data.message, userName: data.userName }]);
      setHasNewChat(true);
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        }
      }, 100);
    });

    // Swap seat handlers
    newSocket.on('swap-seat-request', (data: {
      fromPlayer: Player;
      toPlayer: Player;
      fromPosition: number;
      toPosition: number;
      targetUserId: string;
    }) => {
      const currentUserId = currentUserIdRef.current;

      // Chỉ hiện modal cho người được yêu cầu đổi chỗ
      if (data.targetUserId === currentUserId) {
        setPendingSwapRequest(data);
        setShowSwapModal(true);
      } else {
      }
    });

    newSocket.on('swap-seat-response', (data: {
      accepted: boolean;
      fromUserId: string;
      toUserId: string;
      fromPosition: number;
      toPosition: number;
      targetUserId: string;
    }) => {
      const currentUserId = currentUserIdRef.current;

      // Chỉ xử lý phản hồi cho người yêu cầu
      if (data.targetUserId === currentUserId) {
        setSwapRequest(prev => {
          if (!prev) return prev;
          if (prev.toPlayer.id !== data.toUserId) return prev;
          return { ...prev, status: data.accepted ? 'accepted' : 'rejected' };
        });
      }

      setShowSwapModal(false);
      setPendingSwapRequest(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, router]);

  // Set background giống như lobby
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (customBg) {
      // Luôn sử dụng customBg từ server (đã là base64)
      document.body.style.backgroundImage = `url('${customBg}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundColor = 'transparent';
    } else {
      // Default background - sử dụng images.jpg
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundColor = 'transparent';
    }
    
    // Cleanup khi component unmount
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundColor = '';
    };
  }, [customBg]);

  // Prevent additional players from entering a full 2vs2 room.
  useEffect(() => {
    if (!isUserLoaded || isRoomFullModalVisible) return;

    const nonObserverPlayers = roomState.players.filter(player => !player.isObserver);
    if (nonObserverPlayers.length < 4) return;

    const normalize = (value?: string | null) => (value ? value.trim().toLowerCase() : '');

    const idCandidates = new Set<string>();
    const nameCandidates = new Set<string>();

    if (currentUser?.id) idCandidates.add(currentUser.id);
    if (user?._id) idCandidates.add(user._id);
    if (user?.id) idCandidates.add(user.id);

    if (currentUser?.name) nameCandidates.add(normalize(currentUser.name));
    if (user?.firstName || user?.lastName) {
      const combinedName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      if (combinedName) nameCandidates.add(normalize(combinedName));
    }

    const isMember = roomState.players.some(player => {
      const normalizedName = normalize(player.name);
      return idCandidates.has(player.id) || (normalizedName && nameCandidates.has(normalizedName));
    });

    if (isMember) return;

    setIsRoomFullModalVisible(true);

    const userIdForLeave = currentUser?.id || user?._id || user?.id || null;
    if (socket && userIdForLeave) {
      socket.emit('leave-waiting-room', {
        roomId,
        userId: userIdForLeave
      });
    }

    if (roomFullTimeoutRef.current) {
      clearTimeout(roomFullTimeoutRef.current);
    }

    roomFullTimeoutRef.current = setTimeout(() => {
      setIsRoomFullModalVisible(false);
      router.push('/lobby');
    }, 5000);
  }, [
    currentUser?.id,
    currentUser?.name,
    isRoomFullModalVisible,
    isUserLoaded,
    roomId,
    roomState.players,
    router,
    socket,
    user?._id,
    user?.firstName,
    user?.id,
    user?.lastName
  ]);

  useEffect(() => {
    return () => {
      if (roomFullTimeoutRef.current) {
        clearTimeout(roomFullTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleReady = () => {
    if (!socket) return;
    
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    socket.emit('toggle-ready', {
      roomId,
      userId: currentPlayer.id
    });
  };

  const handleToggleObserver = () => {
    if (!socket) return;
    
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    socket.emit('toggle-observer', {
      roomId,
      userId: currentPlayer.id
    });
  };

  const handleStartGame = () => {
    if (!socket) return;
    
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    socket.emit('start-game', {
      roomId,
      userId: currentPlayer.id
    });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave-waiting-room', {
        roomId,
        userId: currentUser?.id
      });
    }
    router.push('/lobby');
  };

  // Swap seat handlers
  const handleSwapSeatRequest = (targetPlayer: Player, targetPosition: number) => {
    if (!socket) return;

    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;

    currentUserIdRef.current = currentPlayer.id;

    const fromPosition = typeof currentPlayer.position === 'number' ? currentPlayer.position : targetPosition;

    setSwapRequest({
      fromPlayer: currentPlayer,
      toPlayer: targetPlayer,
      fromPosition,
      toPosition: targetPosition,
      status: 'pending'
    });
    
    socket.emit('swap-seat-request', {
      roomId,
      fromUserId: currentPlayer.id,
      toUserId: targetPlayer.id,
      fromPosition,
      toPosition: targetPosition
    });
  };

  const handleSwapSeatAccept = () => {
    if (!socket || !pendingSwapRequest) return;
    
    socket.emit('swap-seat-response', {
      roomId,
      accepted: true,
      fromUserId: pendingSwapRequest.fromPlayer.id,
      toUserId: pendingSwapRequest.toPlayer.id,
      fromPosition: pendingSwapRequest.fromPosition,
      toPosition: pendingSwapRequest.toPosition
    });

    setShowSwapModal(false);
    setPendingSwapRequest(null);
  };

  const handleSwapSeatReject = () => {
    if (!socket || !pendingSwapRequest) return;
    
    socket.emit('swap-seat-response', {
      roomId,
      accepted: false,
      fromUserId: pendingSwapRequest.fromPlayer.id,
      toUserId: pendingSwapRequest.toPlayer.id,
      fromPosition: pendingSwapRequest.fromPosition,
      toPosition: pendingSwapRequest.toPosition
    });

    setShowSwapModal(false);
    setPendingSwapRequest(null);
  };

  useEffect(() => {
    if (!swapRequest) return;
    if (swapRequest.status === 'pending') return;

    const timeoutId = setTimeout(() => {
      setSwapRequest(null);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [swapRequest]);

  // Kiểm tra điều kiện bắt đầu game
  const canStartGame = () => {
    // Kiểm tra xem có phải creator không (theo role, roomCreator, hoặc thứ tự join)
    const isCreatorByRole = currentUser?.role === 'creator';
    const isCreatorByRoomCreator = currentUser?.id && roomState.roomCreator === currentUser.id;
    const isCreatorByOrder = currentUser?.id && roomState.players.length > 0 && 
                           roomState.players[0].id === currentUser.id;
    
    // Fallback: nếu không có roomCreator và không có players, coi như creator
    const isCreatorByFallback = currentUser?.id && !roomState.roomCreator && roomState.players.length === 0;
    
    const isCreator = isCreatorByRole || isCreatorByRoomCreator || isCreatorByOrder || isCreatorByFallback;
    
    if (!currentUser || !isCreator) return false;
    
    const team1Players = roomState.players.filter(p => p.team === 'team1' && !p.isObserver);
    const team2Players = roomState.players.filter(p => p.team === 'team2' && !p.isObserver);
    
    return team1Players.length === 2 && 
           team2Players.length === 2 && 
           team1Players.every(p => p.isReady) && 
           team2Players.every(p => p.isReady);
  };

  // Lấy danh sách players theo team và position (ẩn observers)
  const team1Players = roomState.players
    .filter(p => p.team === 'team1' && !p.isObserver)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const team2Players = roomState.players
    .filter(p => p.team === 'team2' && !p.isObserver)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  

  // Helper function để tìm player hiện tại từ roomState
  const getCurrentPlayer = () => {
    if (currentUser?.id) {
      const byId = roomState.players.find(p => p.id === currentUser.id);
      if (byId) return byId;
    }

    if (currentUser?.name) {
      const byName = roomState.players.find(p => p.name === currentUser.name);
      if (byName) return byName;
    }

    if (user?.firstName || user?.lastName) {
      const currentUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      if (currentUserName.length > 0) {
        const byDisplayName = roomState.players.find(p => p.name === currentUserName);
        if (byDisplayName) return byDisplayName;
      }
    }

    return null;
  };

  const formatSeatLabel = (player: Player | null | undefined) => {
    if (!player) return 'Chưa xác định';

    const teamLabel = player.team === 'team1'
      ? 'Đội 1'
      : player.team === 'team2'
        ? 'Đội 2'
        : 'Chưa phân đội';

    const positionLabel = typeof player.position === 'number' && player.position > 0
      ? `Vị trí ${player.position}`
      : 'Chưa có vị trí';

    return `${teamLabel} · ${positionLabel}`;
  };

  // Handler để yêu cầu fullscreen khi chạm vào màn hình
  const handleScreenTap = () => {
    if (isMobile && !isFullscreen) {
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
        // Fullscreen request failed
      }
    }
  };

  // Kiểm tra mobile orientation giống lobby
  if (isMobile && isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4 text-center">VUI LÒNG XOAY NGANG MÀN HÌNH ĐỂ SỬ DỤNG ỨNG DỤNG!</div>
        <div className="text-lg text-red-300 mb-2 text-center">Nhớ tắt chế độ khóa xoay màn hình ở bảng điều khiển của thiết bị.</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      onClick={handleScreenTap}
    >
      

      {/* Nút Rời phòng ở góc trên bên trái */}
      <div className="fixed top-4 left-4 z-50 flex flex-row gap-2">
        <button
          onClick={handleLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
          style={{ fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
          type="button"
          aria-label="Rời phòng"
          title="Rời phòng"
        >
          {/* Icon logout/exit SVG */}
          <span style={{fontSize: 28, display: 'block', lineHeight: 1}}>↩</span>
        </button>
      </div>

      {/* Nút Chat ở góc trên bên phải */}
      <div className="fixed top-4 right-4 z-50 flex flex-row gap-2">
        <div className="flex items-center relative">
          <button
            onClick={() => { setShowChat(true); setHasNewChat(false); }}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-[28px] text-white rounded-full font-bold shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
            style={{ fontSize: 28, width: 48, height: 48, lineHeight: '48px' }}
            type="button"
            aria-label="Chat"
            title="Chat"
          >
            <span role="img" aria-label="Chat">💬</span>
            {/* Chấm đỏ báo tin nhắn mới */}
            {hasNewChat && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, background: '#f00', borderRadius: '50%', display: 'inline-block', border: '2px solid white', zIndex: 10 }}></span>
            )}
          </button>
        </div>
      </div>

        {swapRequest && (
          <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
            <div
              className={`px-4 py-2 rounded-lg shadow-lg text-sm font-semibold transition-colors duration-200 ${
                swapRequest.status === 'pending'
                  ? 'bg-blue-600/90 text-white'
                  : swapRequest.status === 'accepted'
                    ? 'bg-green-600/90 text-white'
                    : 'bg-red-600/90 text-white'
              }`}
            >
              {swapRequest.status === 'pending' && (
                <span>Đã gửi yêu cầu đổi chỗ cho {swapRequest.toPlayer.name}. Đang chờ phản hồi...</span>
              )}
              {swapRequest.status === 'accepted' && (
                <span>{swapRequest.toPlayer.name} đã chấp nhận yêu cầu đổi chỗ của bạn.</span>
              )}
              {swapRequest.status === 'rejected' && (
                <span>{swapRequest.toPlayer.name} đã từ chối yêu cầu đổi chỗ của bạn.</span>
              )}
            </div>
          </div>
        )}

      {/* Overlay để text dễ đọc hơn */}
      <div className="w-full max-w-7xl p-15 mt-2 mb-4 rounded-xl bg-neutral-900/30 shadow-xl border border-neutral-700 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Phòng chờ 2vs2</h1>
          <div className="text-lg text-gray-200">
            Tên phòng: <span className="font-mono bg-white/20 px-3 py-1 rounded text-white">{window._roomDisplayName || roomId}</span>
          </div>
        </div>


        {/* Teams Section */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Team 1 */}
          <div className="bg-blue-500/20 rounded-xl p-6 border border-blue-400/30">
            <h3 className="text-xl font-bold text-blue-200 mb-4 text-center">Đội 1</h3>
            <div className="space-y-3">
              {Array.from({ length: 2 }, (_, index) => {
                const player = team1Players.find(p => p.position === index + 1);
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      player 
                        ? player.isReady 
                          ? 'border-green-500 bg-green-500/20' 
                          : 'border-yellow-500 bg-yellow-500/20'
                        : 'border-gray-300 bg-gray-500/20'
                    }`}
                  >
                    {player ? (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{player.name}</span>
                        <div className="flex items-center space-x-2">
                          {player.isReady ? (
                            <span className="text-green-300 text-sm"> Sẵn sàng</span>
                          ) : (
                            <span className="text-yellow-300 text-sm"> Chưa sẵn sàng</span>
                          )}
                          {/* Nút swap - chỉ hiện khi không phải chính mình */}
                          {currentUser && player.id !== currentUser.id && (
                            <button
                              onClick={() => handleSwapSeatRequest(player, index + 1)}
                              className="ml-2 p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              title="Đổi chỗ với người này"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Chỗ trống</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team 2 */}
          <div className="bg-red-500/20 rounded-xl p-6 border border-red-400/30">
            <h3 className="text-xl font-bold text-red-200 mb-4 text-center">Đội 2</h3>
            <div className="space-y-3">
              {Array.from({ length: 2 }, (_, index) => {
                const player = team2Players.find(p => p.position === index + 1);
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      player 
                        ? player.isReady 
                          ? 'border-green-500 bg-green-500/20' 
                          : 'border-yellow-500 bg-yellow-500/20'
                        : 'border-gray-300 bg-gray-500/20'
                    }`}
                  >
                    {player ? (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{player.name}</span>
                        <div className="flex items-center space-x-2">
                          {player.isReady ? (
                            <span className="text-green-300 text-sm"> Sẵn sàng</span>
                          ) : (
                            <span className="text-yellow-300 text-sm"> Chưa sẵn sàng</span>
                          )}
                          {/* Nút swap - chỉ hiện khi không phải chính mình */}
                          {currentUser && player.id !== currentUser.id && (
                            <button
                              onClick={() => handleSwapSeatRequest(player, index + 1)}
                              className="ml-2 p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              title="Đổi chỗ với người này"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Chỗ trống</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center">
          {/* Observer controls temporarily hidden until server capacity is upgraded */}
          {/* Ready/Start Button - sát bên phải */}
          {(() => {
            // Kiểm tra xem có phải creator không (theo role, roomCreator, hoặc thứ tự join)
            const isCreatorByRole = currentUser?.role === 'creator';
            const isCreatorByRoomCreator = currentUser?.id && roomState.roomCreator === currentUser.id;
            const isCreatorByOrder = currentUser?.id && roomState.players.length > 0 && 
                                   roomState.players[0].id === currentUser.id;
            
            // Fallback: nếu không có roomCreator và không có players, coi như creator
            const isCreatorByFallback = currentUser?.id && !roomState.roomCreator && roomState.players.length === 0;
            
            const isCreator = isCreatorByRole || isCreatorByRoomCreator || isCreatorByOrder || isCreatorByFallback;
            
            if (isCreator) {
              return (
                <button
                  onClick={handleStartGame}
                  disabled={!canStartGame()}
                  className={`px-8 py-3 rounded-lg font-medium transition-all ${
                    canStartGame()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                   Bắt đầu
                </button>
              );
            } else {
              const currentPlayer = getCurrentPlayer();
              
              // Nếu đang quan sát, không hiển thị nút Ready/Start
              if (currentPlayer?.isObserver) {
                return null; // Ẩn hoàn toàn
              }
              
              return (
                <button
                  onClick={handleToggleReady}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    getCurrentPlayer()?.isReady
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  {getCurrentPlayer()?.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                </button>
              );
            }
          })()}
          
          
        </div>

        {/* Status Info */}
        <div className="mt-6 text-center text-sm text-gray-300">
          {(() => {
            // Kiểm tra xem có phải creator không (theo role, roomCreator, hoặc thứ tự join)
            const isCreatorByRole = currentUser?.role === 'creator';
            const isCreatorByRoomCreator = currentUser?.id && roomState.roomCreator === currentUser.id;
            const isCreatorByOrder = currentUser?.id && roomState.players.length > 0 && 
                                   roomState.players[0].id === currentUser.id;
            
            // Fallback: nếu không có roomCreator và không có players, coi như creator
            const isCreatorByFallback = currentUser?.id && !roomState.roomCreator && roomState.players.length === 0;
            
            const isCreator = isCreatorByRole || isCreatorByRoomCreator || isCreatorByOrder || isCreatorByFallback;
            
            return isCreator ? (
              <div>
                Điều kiện bắt đầu: Đội 1 có 2 người sẵn sàng, Đội 2 có 2 người sẵn sàng
                <br />
                Hiện tại: Đội 1 ({team1Players.filter(p => !p.isObserver).length}/2), 
                Đội 2 ({team2Players.filter(p => !p.isObserver).length}/2)
              </div>
            ) : (
              <div>
                Chờ chủ phòng bắt đầu...
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal swap seat */}
      {showSwapModal && pendingSwapRequest && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 modal-backdrop"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div className="bg-gray-900 rounded-2xl p-6 w-[400px] max-w-[95vw] border-4 border-blue-400 relative modal-content">
            <div className="text-xl font-bold text-blue-300 mb-4 text-center">
              Yêu cầu đổi chỗ
            </div>
            <div className="text-white mb-4 text-center">
              <span className="font-semibold text-yellow-400">{pendingSwapRequest.fromPlayer.name}</span> muốn đổi chỗ với bạn
            </div>
            <div className="text-gray-300 text-sm mb-6 text-center">
              Chỗ hiện tại: <span className="font-semibold">{formatSeatLabel(pendingSwapRequest.fromPlayer)}</span><br/>
              Chỗ muốn đổi: <span className="font-semibold">{formatSeatLabel(pendingSwapRequest.toPlayer)}</span>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors font-semibold"
                onClick={handleSwapSeatReject}
              >
                Từ chối
              </button>
              <button
                className="flex-1 px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors font-semibold"
                onClick={handleSwapSeatAccept}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chat */}
      <AuroraModalBackdrop open={showChat} disableAnimation>
        <div className={`relative w-full ${isMobileLandscape ? 'max-w-[320px]' : 'max-w-2xl'}`} data-no-motion="true">
          <div className="absolute inset-0 blur-3xl opacity-70 bg-blue-500/20 pointer-events-none" />
          <div className={`relative flex flex-col rounded-[30px] border border-white/10 bg-slate-950/85 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${isMobileLandscape ? 'p-3 min-h-[340px]' : 'p-6 min-h-[520px]'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className={`uppercase tracking-[0.35em] text-blue-200/80 ${isMobileLandscape ? 'text-[9px]' : 'text-xs'}`}>CHAT</p>
                <h3 className={`${isMobileLandscape ? 'text-lg' : 'text-2xl'} font-semibold text-white`}>Chat phòng</h3>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className={`rounded-full bg-red-500/80 text-white ${isMobileLandscape ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-base'} font-bold transition hover:bg-red-500`}
                type="button"
                aria-label="Đóng chat"
              >✕</button>
            </div>
            <div
              ref={chatListRef}
              className={`flex-1 overflow-y-auto pr-1 ${isMobileLandscape ? 'space-y-2' : 'space-y-3'}`}
              style={{ maxHeight: isMobileLandscape ? 240 : 360 }}
            >
              {chatMessages.length === 0 && (
                <div className="text-gray-400 text-center mt-4 text-sm">Chưa có tin nhắn nào</div>
              )}
              {chatMessages.map((msg, idx) => {
                const displayName = msg.userName?.trim()
                  ? msg.userName.trim()
                  : (msg.from === 'me'
                      ? (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Bạn')
                      : 'Người chơi khác');
                const nameClass = [
                  isMobileLandscape ? 'text-[10px]' : 'text-xs',
                  msg.from === 'me' ? 'text-blue-100 text-right' : 'text-gray-300 text-left',
                ].join(' ');
                const bubbleClass = msg.from === 'me'
                  ? (isMobileLandscape ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2.5 py-1.5 rounded-2xl text-[11px]' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-2xl text-base')
                  : (isMobileLandscape ? 'bg-slate-800 text-white px-2.5 py-1.5 rounded-2xl text-[11px]' : 'bg-slate-800 text-white px-4 py-2 rounded-2xl text-base');

                return (
                  <div
                    key={idx}
                    className={`${
                      msg.from === 'me'
                        ? (isMobileLandscape ? 'flex justify-end' : 'flex justify-end')
                        : (isMobileLandscape ? 'flex justify-start' : 'flex justify-start')
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
              className={`mt-3 flex w-full items-center ${isMobileLandscape ? 'gap-1.5' : 'gap-3'}`}
              onSubmit={e => {
                e.preventDefault();
                if (chatInput.trim() === "") return;
                const fallbackName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Bạn';
                setChatMessages(msgs => [...msgs, { from: 'me', text: chatInput, userName: fallbackName }]);
                if (socket && user?._id && user?.firstName && user?.lastName) {
                  const userName = `${user.firstName} ${user.lastName}`;
                  socket.emit('chat', { roomId, userId: user._id, userName, message: chatInput });
                }
                setChatInput("");
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className={`flex-1 rounded-2xl border border-white/15 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isMobileLandscape ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'}`}
                placeholder="Nhập tin nhắn..."
                autoFocus
              />
              <button
                type="submit"
                className={`rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isMobileLandscape ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-base'}`}
                style={{ minWidth: isMobileLandscape ? 72 : 96 }}
                aria-label="Gửi"
                title="Gửi"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      </AuroraModalBackdrop>

      {isRoomFullModalVisible && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 border border-red-500 rounded-2xl px-6 py-8 text-center max-w-sm mx-4 shadow-xl">
            <div className="text-2xl font-semibold text-red-400 mb-4">Phòng đã đầy</div>
            <p className="text-gray-200">
              Phòng chờ 2vs2 hiện đã đủ 4 người chơi. Vui lòng thử lại sau.
            </p>
          </div>
        </div>
      )}

      {/* Chat styles */}
      <style jsx global>{`
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
        .chat-message:has(.bg-gradient-to-r) .chat-bubble {
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
        }
        
        /* Hiệu ứng đặc biệt cho tin nhắn của đối phương */
        .chat-message:has(.bg-slate-800) .chat-bubble {
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
        }
        
        /* Tùy chỉnh thanh cuộn cho chat */
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
      `}</style>
    </div>
  );
}
