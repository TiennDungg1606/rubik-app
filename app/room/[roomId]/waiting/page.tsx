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
      console.log('=== WAITING ROOM UPDATED ===');
      console.log('Current user before update:', currentUser);
      console.log('Server data players:', data.players.map(p => ({ id: p.id, name: p.name, isReady: p.isReady })));
      
      // Cập nhật currentUser role từ server data
      // Tìm player data dựa trên userId đã gửi lên server
      const playerData = data.players.find(p => {
        // Tìm theo ID hiện tại hoặc theo tên nếu ID chưa match
        const matchById = p.id === currentUser?.id;
        const matchByName = currentUser?.name && p.name === currentUser.name;
        console.log(`Checking player ${p.name} (${p.id}): matchById=${matchById}, matchByName=${matchByName}`);
        return matchById || matchByName;
      });
      
      console.log('Found playerData:', playerData);
      
      if (playerData) {
        console.log('=== UPDATING CURRENT USER ===');
        console.log('Player data from server:', playerData);
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
          console.log('Updated currentUser:', updated);
          return updated;
        });
      } else if (currentUser?.id && data.roomCreator === currentUser.id) {
        // Fallback: nếu không tìm thấy playerData nhưng là roomCreator, set role creator và ready
        console.log('=== FALLBACK: Setting creator role ===');
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
        console.log('=== NO PLAYER DATA FOUND ===');
        console.log('Current user ID:', currentUser?.id);
        console.log('Room creator:', data.roomCreator);
        console.log('Available players:', data.players.map(p => ({ id: p.id, name: p.name })));
        
        // Fallback: Tìm player theo tên nếu có currentUser.name
        if (currentUser?.name) {
          const playerByName = data.players.find(p => p.name === currentUser.name);
          if (playerByName) {
            console.log('=== FALLBACK: Found player by name ===');
            console.log('Player by name:', playerByName);
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
          console.log('=== FINAL FALLBACK: Setting currentUser by matching name ===');
          console.log('Looking for name:', currentUserName);
          console.log('Found player:', playerByName);
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
          console.log('=== ADDITIONAL FALLBACK: Setting currentUser by user._id ===');
          console.log('Looking for ID:', user._id);
          console.log('Found player:', playerById);
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

  // Debug logs
  console.log('=== DEBUG: Render state ===', {
    roomState,
    currentUser,
    team1Players,
    team2Players,
    allPlayers: roomState.players
  });
  

  // Helper function để tìm player hiện tại từ roomState
  const getCurrentPlayer = () => {
    if (!user?.firstName || !user?.lastName) return null;
    const currentUserName = `${user.firstName} ${user.lastName}`.trim();
    return roomState.players.find(p => p.name === currentUserName);
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
        console.log('Fullscreen request failed:', error);
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
          {(() => {
            const currentPlayer = getCurrentPlayer();
            
            if (currentPlayer?.isObserver) {
              return (
                <button
                  onClick={handleToggleObserver}
                  className="px-6 py-3 rounded-lg font-medium transition-all bg-blue-600 text-white hover:bg-blue-700"
                >
                  Hủy quan sát
                </button>
              );
            } else {
              return (
                <button
                  onClick={handleToggleObserver}
                  className="px-6 py-3 rounded-lg font-medium transition-all bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Quan sát
                </button>
              );
            }
          })()}

          {/* Ready/Start Button - sát bên phải */}
          {(() => {
            const currentPlayer = getCurrentPlayer();
            
            // Nếu đang quan sát, không hiển thị nút Ready/Start
            if (currentPlayer?.isObserver) {
              return (
                <div className="text-gray-400 font-medium">
                  👁️ Bạn đang quan sát
                </div>
              );
            }
            
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
    </div>
  );
}
