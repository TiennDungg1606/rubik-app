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

  useEffect(() => {
    // Lấy thông tin user từ sessionStorage
    const userInfo = sessionStorage.getItem('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setCurrentUser({
        id: user.id || Date.now().toString(),
        name: user.displayName || 'Player',
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
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to waiting room socket');
      setIsConnected(true);
      
      // Join waiting room - sử dụng user info từ sessionStorage
      const userInfo = sessionStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        newSocket.emit('join-waiting-room', {
          roomId,
          userId: user.id || Date.now().toString(),
          userName: user.displayName || 'Player'
        });
      }
    });

    newSocket.on('waiting-room-updated', (data: WaitingRoomState) => {
      console.log('Waiting room updated:', data);
      console.log('Current user:', currentUser);
      console.log('Team 1 players:', data.players.filter(p => p.team === 'team1'));
      console.log('Team 2 players:', data.players.filter(p => p.team === 'team2'));
      setRoomState(data);
    });

    newSocket.on('game-started', (data: { roomId: string, gameMode: string }) => {
      console.log('Game started, redirecting to room');
      router.push(`/room/${data.roomId}/page2`);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from waiting room socket');
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
  const team1Players = roomState.players
    .filter(p => p.team === 'team1')
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const team2Players = roomState.players
    .filter(p => p.team === 'team2')
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Debug
  console.log('Render - Current user:', currentUser);
  console.log('Render - Room state:', roomState);
  console.log('Render - Team 1 players:', team1Players);
  console.log('Render - Team 2 players:', team2Players);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
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

        {/* Video Call Section - Tắt camera ở phòng chờ */}
        {/* {roomUrl && (
          <div className="mb-8">
            <DailyVideoCall
              roomUrl={roomUrl}
              camOn={false}
              micOn={false}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              is2vs2={true}
            />
          </div>
        )} */}

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
