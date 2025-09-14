'use client';

import { useState, useEffect, useRef } from 'react';
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
}

interface WaitingRoomState {
  roomId: string;
  players: Player[];
  roomCreator: string;
  gameStarted: boolean;
}

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
  const [isConnected, setIsConnected] = useState(false);
  const [roomUrl, setRoomUrl] = useState('');
  const [customBg, setCustomBg] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Load user từ API giống như lobby
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user/me", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          setCustomBg(data.user.customBg || '');
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // Device detection và orientation check
  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobile(mobile);
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
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
          console.log('Fullscreen request failed:', error);
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
        if (!interval) {
          interval = setInterval(() => {
            checkFullscreenStatus();
            if (!isFullscreen) {
              requestFullscreen();
            }
          }, 2000);
        }
      };

      // Khởi động interval sau 2 giây
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
    // Lấy thông tin user từ sessionStorage
    const userInfo = sessionStorage.getItem('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player';
      setCurrentUser({
        id: user.id || Date.now().toString(),
        name: userName,
        isReady: false,
        isObserver: false
      });
    }

    // Lấy room URL từ sessionStorage
    const dailyRoomUrl = sessionStorage.getItem(`dailyRoomUrl_${roomId}`);
    if (dailyRoomUrl) {
      setRoomUrl(dailyRoomUrl);
    }

    // Kết nối socket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://rubik-socket-server-production-3b21.up.railway.app';
    console.log('=== INITIALIZING SOCKET CONNECTION ===');
    console.log('Socket URL:', socketUrl);
    console.log('NEXT_PUBLIC_SOCKET_URL:', process.env.NEXT_PUBLIC_SOCKET_URL);
    const newSocket = io(socketUrl);
    console.log('Socket object created:', newSocket);
    console.log('Socket connected initially:', newSocket.connected);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('=== SOCKET CONNECTED ===');
      console.log('Socket ID:', newSocket.id);
      console.log('Socket connected:', newSocket.connected);
      setIsConnected(true);
      
      // Join waiting room - sử dụng user info từ sessionStorage
      console.log('=== CHECKING SESSION STORAGE ===');
      const userInfo = sessionStorage.getItem('userInfo');
      console.log('userInfo from sessionStorage:', userInfo);
      console.log('userInfo type:', typeof userInfo);
      console.log('userInfo truthy:', !!userInfo);
      
      if (userInfo) {
        const user = JSON.parse(userInfo);
        const userId = user.id || Date.now().toString();
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player';
        
        console.log('=== CLIENT SENDING TO SERVER ===');
        console.log('roomId:', roomId);
        console.log('userId:', userId);
        console.log('userName:', userName);
        console.log('userName type:', typeof userName);
        console.log('userName length:', userName ? userName.length : 'null/undefined');
        console.log('User data from sessionStorage:', user);
        console.log('Full data being sent:', { roomId, userId, userName });
        
        // Cập nhật currentUser state
        setCurrentUser({
          id: userId,
          name: userName,
          isReady: false,
          isObserver: false
        });
        
        console.log('=== SENDING JOIN WAITING ROOM ===');
        console.log('Socket connected:', newSocket.connected);
        console.log('Socket ID:', newSocket.id);
        console.log('Emitting join-waiting-room event...');
        newSocket.emit('join-waiting-room', {
          roomId,
          userId,
          userName
        });
        console.log('join-waiting-room event emitted successfully');
      } else {
        console.log('=== NO USER INFO IN SESSION STORAGE ===');
        console.log('Cannot join waiting room without user info');
      }
    });

    newSocket.on('waiting-room-updated', (data: WaitingRoomState) => {
      console.log('=== CLIENT RECEIVED WAITING ROOM UPDATE ===');
      console.log('Full data received:', JSON.stringify(data, null, 2));
      console.log('Players in data:', data.players?.map(p => ({ id: p.id, name: p.name, team: p.team, position: p.position })));
      console.log('Players count:', data.players?.length || 0);
      console.log('Current user:', currentUser);
      console.log('Team 1 players:', data.players?.filter(p => p.team === 'team1') || []);
      console.log('Team 2 players:', data.players?.filter(p => p.team === 'team2') || []);
      console.log('Setting roomState to:', data);
      console.log('Before setRoomState - roomState.players:', roomState.players);
      setRoomState(data);
      console.log('After setRoomState - data.players:', data.players);
    });

    newSocket.on('game-started', (data: { roomId: string, gameMode: string }) => {
      console.log('Game started, redirecting to room');
      router.push(`/room/${data.roomId}/page2`);
    });

    newSocket.on('connect_error', (error) => {
      console.error('=== SOCKET CONNECTION ERROR ===');
      console.error('Error:', error);
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('=== SOCKET DISCONNECTED ===');
      console.log('Reason:', reason);
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, currentUser?.id, currentUser?.name, router]);

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
      document.body.style.backgroundImage = `url('/images.jpg')`;
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

  const handleToggleReady = () => {
    if (!socket || !currentUser) return;
    
    socket.emit('toggle-ready', {
      roomId,
      userId: currentUser.id
    });
  };

  const handleToggleObserver = () => {
    if (!socket || !currentUser) return;
    
    socket.emit('toggle-observer', {
      roomId,
      userId: currentUser.id
    });
  };

  const handleStartGame = () => {
    if (!socket || !currentUser) return;
    
    socket.emit('start-game', {
      roomId,
      userId: currentUser.id
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

  // Kiểm tra điều kiện bắt đầu game
  const canStartGame = () => {
    if (!currentUser || currentUser.id !== roomState.roomCreator) return false;
    
    const team1Players = roomState.players.filter(p => p.team === 'team1' && !p.isObserver);
    const team2Players = roomState.players.filter(p => p.team === 'team2' && !p.isObserver);
    
    return team1Players.length === 2 && 
           team2Players.length === 2 && 
           team1Players.every(p => p.isReady) && 
           team2Players.every(p => p.isReady);
  };

  // Lấy danh sách players theo team và position
  console.log('=== FILTERING PLAYERS ===');
  console.log('roomState.players:', roomState.players);
  console.log('roomState.players length:', roomState.players?.length);
  
  const team1Players = roomState.players
    .filter(p => p.team === 'team1')
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const team2Players = roomState.players
    .filter(p => p.team === 'team2')
    .sort((a, b) => (a.position || 0) - (b.position || 0));
    
  console.log('team1Players after filter:', team1Players);
  console.log('team2Players after filter:', team2Players);
  
  // Debug
  console.log('Render - Current user:', currentUser);
  console.log('Render - Room state:', roomState);
  console.log('Render - Team 1 players:', team1Players);
  console.log('Render - Team 2 players:', team2Players);

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
        console.log('Fullscreen request failed:', error);
      }
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      onClick={handleScreenTap}
    >
      {/* Mobile và Portrait Mode Warnings */}
      {isMobile && isPortrait && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">📱</span>
            <span className="font-bold">Vui lòng xoay ngang màn hình để có trải nghiệm tốt nhất!</span>
          </div>
        </div>
      )}
      

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

      {/* Overlay để text dễ đọc hơn */}
      <div className="w-full max-w-7xl p-15 mt-2 mb-4 rounded-xl bg-neutral-900/30 shadow-xl border border-neutral-700 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Phòng chờ 2vs2</h1>
          <div className="text-lg text-gray-200">
            Mã phòng: <span className="font-mono bg-white/20 px-3 py-1 rounded text-white">{roomId}</span>
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
        <div className="flex justify-between items-center">
          {/* Observer Button - sát bên trái */}
          <button
            onClick={handleToggleObserver}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              currentUser?.isObserver
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {currentUser?.isObserver ? ' Đang quan sát' : ' Quan sát'}
          </button>

          {/* Ready/Start Button - sát bên phải */}
          {currentUser?.id === roomState.roomCreator ? (
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
          ) : (
            <button
              onClick={handleToggleReady}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentUser?.isReady
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              {currentUser?.isReady ? ' Sẵn sàng' : ' Chưa sẵn sàng'}
            </button>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-6 text-center text-sm text-gray-300">
          {currentUser?.id === roomState.roomCreator ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
