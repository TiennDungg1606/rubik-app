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
  role?: 'creator' | 'player' | 'observer';
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
          console.log('=== DEBUG: User data from API ===', data);
          
          if (data && data.user) {
            const user = data.user;
            const userId = user._id || user.id || Date.now().toString();
            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player';
            
            console.log('=== DEBUG: Parsed user data ===', { userId, userName, user });
            
            // Cập nhật currentUser state
            setCurrentUser({
              id: userId,
              name: userName,
              isReady: false,
              isObserver: false
            });
            
            console.log('=== DEBUG: Emitting join-waiting-room ===', { roomId, userId, userName });
            newSocket.emit('join-waiting-room', {
              roomId,
              userId,
              userName
            });
          } else {
            console.log('=== DEBUG: No user data from API ===');
          }
        } catch (error) {
          console.error('=== DEBUG: Error fetching user data ===', error);
        }
      };
      
      fetchUserAndJoin();
    });

    newSocket.on('waiting-room-updated', (data: WaitingRoomState) => {

      
      // Cập nhật currentUser role từ server data
      // Tìm player data dựa trên userId đã gửi lên server
      const playerData = data.players.find(p => {
        // Tìm theo ID hiện tại hoặc theo tên nếu ID chưa match
        return p.id === currentUser?.id || 
               (currentUser?.name && p.name === currentUser.name);
      });
      
      if (playerData) {
        setCurrentUser(prev => prev ? {
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
        });
      }
      
      setRoomState(data);
    });

    newSocket.on('game-started', (data: { roomId: string, gameMode: string }) => {
      router.push(`/room/${data.roomId}/page2`);
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
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
    if (!currentUser || currentUser.role !== 'creator') return false;
    
    const team1Players = roomState.players.filter(p => p.team === 'team1' && !p.isObserver);
    const team2Players = roomState.players.filter(p => p.team === 'team2' && !p.isObserver);
    
    return team1Players.length === 2 && 
           team2Players.length === 2 && 
           team1Players.every(p => p.isReady) && 
           team2Players.every(p => p.isReady);
  };

  // Lấy danh sách players theo team và position
  const team1Players = roomState.players
    .filter(p => p.team === 'team1')
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const team2Players = roomState.players
    .filter(p => p.team === 'team2')
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  // Debug logs
  console.log('=== DEBUG: Render state ===', {
    roomState,
    currentUser,
    team1Players,
    team2Players,
    allPlayers: roomState.players
  });
  
  // Debug room creator logic
  console.log('=== DEBUG: Room Creator Logic ===', {
    currentUserId: currentUser?.id,
    roomCreator: roomState.roomCreator,
    isRoomCreator: currentUser?.id === roomState.roomCreator,
    currentUserType: typeof currentUser?.id,
    roomCreatorType: typeof roomState.roomCreator
  });

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
          {currentUser?.role === 'player' ? (
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
          ) : currentUser?.role === 'creator' ? (
            <div className="text-blue-300 font-medium">
              👑 Bạn là chủ phòng
            </div>
          ) : currentUser?.role === 'observer' ? (
            <div className="text-gray-400 font-medium">
              👁️ Bạn đang quan sát
            </div>
          ) : (
            // Fallback khi role chưa được set
            <button
              onClick={handleToggleObserver}
              className="px-6 py-3 rounded-lg font-medium transition-all bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Quan sát
            </button>
          )}

          {/* Ready/Start Button - sát bên phải */}
          {currentUser?.role === 'creator' ? (
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
          ) : currentUser?.role === 'player' ? (
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
          ) : currentUser?.role === 'observer' ? (
            <div className="text-gray-400 font-medium">
              👁️ Bạn đang quan sát
            </div>
          ) : (
            // Fallback khi role chưa được set
            <button
              onClick={handleToggleReady}
              className="px-6 py-3 rounded-lg font-medium transition-all bg-yellow-500 text-white hover:bg-yellow-600"
            >
              Chưa sẵn sàng
            </button>
          )}
          

        </div>

        {/* Status Info */}
        <div className="mt-6 text-center text-sm text-gray-300">
          {currentUser?.role === 'creator' ? (
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
