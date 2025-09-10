import React, { useEffect, useRef } from 'react';

interface VideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  isSpectator?: boolean;
}


// roomUrl: dạng JSON.stringify({ access_token, userId, opponentId })
const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, camOn, micOn, localVideoRef: propLocalVideoRef, remoteVideoRef: propRemoteVideoRef, isSpectator = false }) => {
  const clientRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);
  const remoteTrackRef = useRef<any>(null);
  const player1TrackRef = useRef<any>(null);
  const player2TrackRef = useRef<any>(null);
  // Nếu có ref truyền từ ngoài thì dùng, không thì tạo ref nội bộ
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef || useRef<HTMLVideoElement>(null);
  // State cho local stream preview
  const localStreamRef = useRef<MediaStream|null>(null);
  // State: đã có call Stringee chưa
  const hasCallRef = useRef(false);

  // Parse roomUrl to get access_token, userId, opponentId
  let access_token = '';
  let userId = '';
  let opponentId = '';
  let roomId = '';
  let player1Id = '';
  let player2Id = '';
  let spectators: string[] = [];
  try {
    if (roomUrl) {
      const obj = JSON.parse(roomUrl);
      access_token = obj.access_token || '';
      userId = obj.userId || '';
      roomId = obj.roomId || '';
      player1Id = obj.player1Id || '';
      player2Id = obj.player2Id || '';
      spectators = obj.spectators || [];
      
      // Determine opponentId based on current user
      if (userId === player1Id) {
        opponentId = player2Id;
      } else if (userId === player2Id) {
        opponentId = player1Id;
      } else if (isSpectator) {
        // Spectators don't need opponentId for video calls
        // They will receive video from both players
        opponentId = '';
      } else {
        // Fallback for other cases
        opponentId = player1Id || player2Id;
      }
    }
  } catch (e) {
    console.error('[VideoCall] roomUrl parse error:', e, roomUrl);
  }

  // Luôn show local cam preview khi vào phòng (dù chưa có call) - chỉ cho người chơi, không cho spectator
  useEffect(() => {
    let stopped = false;
    if (localVideoRef.current && !isSpectator) {
      // Nếu đã có call Stringee thì không cần getUserMedia nữa
      if (hasCallRef.current) return;
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (stopped) return;
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true; // luôn mute local để tránh vọng mic
            localVideoRef.current.style.display = camOn ? '' : 'none';
          }
          // Tắt/bật cam/mic ban đầu
          stream.getVideoTracks().forEach(track => { track.enabled = camOn; });
          stream.getAudioTracks().forEach(track => { track.enabled = micOn; });
        })
        .catch(err => {
          console.error('[VideoCall] getUserMedia error:', err);
        });
    }
    return () => {
      stopped = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.style.display = 'none';
      }
    };
    // eslint-disable-next-line
  }, [localVideoRef, camOn, micOn, isSpectator]);

  // Nếu chưa có access_token, thử lấy từ API (dùng userId)
  useEffect(() => {
    if (!access_token && userId) {
      fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.access_token) {
            window.location.reload(); // reload để truyền access_token vào roomUrl (hoặc có thể set lại state)
          }
        });
    }
  }, [access_token, userId]);
  // Khởi tạo StringeeClient/room khi có roomId
  useEffect(() => {
    if (!access_token || !userId || !roomId) return;
    
    // Cleanup old client/room
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }
    if (roomRef.current) {
      try { roomRef.current.leave(); } catch {}
      roomRef.current = null;
    }
    
    // Đợi Stringee SDK load
    const checkStringeeSDK = () => {
      // eslint-disable-next-line no-undef
      const StringeeClient = (window as any).StringeeClient;
      const StringeeRoom = (window as any).StringeeRoom;
      if (!StringeeClient || !StringeeRoom) {
        console.log('[VideoCall] Waiting for Stringee SDK to load...');
        setTimeout(checkStringeeSDK, 100);
        return;
      }
      console.log('[VideoCall] Stringee SDK loaded successfully');
      initializeStringeeClient();
    };
    
    const initializeStringeeClient = () => {
      // eslint-disable-next-line no-undef
      const StringeeClient = (window as any).StringeeClient;
      const StringeeRoom = (window as any).StringeeRoom;
      const client = new StringeeClient();
    clientRef.current = client;
    hasCallRef.current = false;
    
    // Listen events
    client.on('connect', () => {
      console.log('[VideoCall] client connected');
    });
    client.on('authen', (res: any) => {
      console.log('[VideoCall] client authen:', res);
      if (res.r === 0) {
        // Join room for all users (players and spectators)
        joinRoom(client);
      }
    });
    client.on('disconnect', () => {
      console.log('[VideoCall] client disconnected');
    });
    client.on('requestnewtoken', () => {
      console.log('[VideoCall] client requestnewtoken');
      // TODO: Gọi lại API để lấy access_token mới và gọi client.connect(new_access_token)
    });
    
    // Connect
    client.connect(access_token);

    // Join room for group video call
    function joinRoom(client: any) {
      const room = new StringeeRoom(client, roomId);
      roomRef.current = room;
      setupRoomEvents(room);
      room.join((res: any) => {
        console.log('[VideoCall] joinRoom result', res);
      });
    }

    function setupRoomEvents(room: any) {
      hasCallRef.current = true;
      // Khi đã có room, tắt local preview stream (nếu có)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      // Handle local track (only for players, not spectators)
      room.on('addlocaltrack', (localtrack: any) => {
        console.log('[VideoCall] addlocaltrack', localtrack);
        localTrackRef.current = localtrack;
        const el = localtrack.attach();
        const vid = localVideoRef.current;
        if (vid && el instanceof HTMLVideoElement) {
          vid.srcObject = el.srcObject;
          vid.muted = true;
        }
        // Đảm bảo luôn cập nhật lại display khi camOn thay đổi
        if (localVideoRef.current) {
          localVideoRef.current.style.display = camOn ? '' : 'none';
        }
      });
      
      // Publish local video when joining room (for players only)
      if (!isSpectator) {
        room.publish({
          video: camOn,
          audio: micOn
        });
      }
      
      // Handle remote tracks from other participants
      room.on('addremotetrack', (remotetrack: any) => {
        console.log('[VideoCall] addremotetrack', remotetrack);
        const el = remotetrack.attach();
        
        if (isSpectator) {
          // For spectators, determine which player this is based on participant info
          const participantId = remotetrack.participantId;
          if (participantId === player1Id) {
            player1TrackRef.current = remotetrack;
            const vid = localVideoRef.current; // This will be player1VideoRef for spectators
            if (vid && el instanceof HTMLVideoElement) {
              vid.srcObject = el.srcObject;
              vid.muted = false;
              vid.style.display = '';
            }
          } else if (participantId === player2Id) {
            player2TrackRef.current = remotetrack;
            const vid = remoteVideoRef.current; // This will be player2VideoRef for spectators
            if (vid && el instanceof HTMLVideoElement) {
              vid.srcObject = el.srcObject;
              vid.muted = false;
              vid.style.display = '';
            }
          }
        } else {
          // For players, use remoteVideoRef as usual
          remoteTrackRef.current = remotetrack;
          const vid = remoteVideoRef.current;
          if (vid && el instanceof HTMLVideoElement) {
            vid.srcObject = el.srcObject;
            vid.muted = false;
            vid.style.display = '';
          }
        }
      });
      
      // Handle track removal
      room.on('removelocaltrack', (track: any) => {
        if (track && track.detachAndRemove) track.detachAndRemove();
        localTrackRef.current = null;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.style.display = 'none';
        }
      });
      
      room.on('removeremotetrack', (track: any) => {
        if (track && track.detachAndRemove) track.detachAndRemove();
        const participantId = track.participantId;
        
        if (isSpectator) {
          if (participantId === player1Id) {
            player1TrackRef.current = null;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = null;
              localVideoRef.current.style.display = 'none';
            }
          } else if (participantId === player2Id) {
            player2TrackRef.current = null;
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
              remoteVideoRef.current.style.display = 'none';
            }
          }
        } else {
          remoteTrackRef.current = null;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.style.display = 'none';
          }
        }
      });
      
      // Room events
      room.on('roomjoined', (res: any) => {
        console.log('[VideoCall] roomjoined', res);
      });
      
      room.on('roomleft', (res: any) => {
        console.log('[VideoCall] roomleft', res);
      });
      
      room.on('participantjoined', (participant: any) => {
        console.log('[VideoCall] participantjoined', participant);
      });
      
      room.on('participantleft', (participant: any) => {
        console.log('[VideoCall] participantleft', participant);
      });
    }
    };

    // Cleanup on unmount
    return () => {
      hasCallRef.current = false;
      if (roomRef.current) {
        try { roomRef.current.leave(); } catch {}
        roomRef.current = null;
      }
      if (clientRef.current) {
        try { clientRef.current.disconnect(); } catch {}
        clientRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.style.display = 'none';
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.style.display = 'none';
      }
    };
    
    // Bắt đầu kiểm tra Stringee SDK
    checkStringeeSDK();
    // eslint-disable-next-line
  }, [roomUrl, roomId]);

  // React to cam/mic changes
  useEffect(() => {
    // Spectators don't have local video/mic controls
    if (isSpectator) return;
    
    // Nếu đã có room Stringee thì thao tác lên room
    if (roomRef.current) {
      try {
        // Publish/unpublish video and audio based on camOn/micOn
        roomRef.current.publish({
          video: camOn,
          audio: micOn
        });
      } catch (e) {
        console.error('[VideoCall] cam/mic toggle error', e);
      }
      // Không disable trực tiếp video track khi đã có room (Stringee sẽ xử lý)
      // Chỉ disable audio track local để đảm bảo mute đúng
      if (localTrackRef.current && localTrackRef.current._localStream) {
        const audioTracks = localTrackRef.current._localStream.getAudioTracks();
        audioTracks.forEach((track: MediaStreamTrack) => { track.enabled = micOn; });
      }
      // Đảm bảo luôn cập nhật lại display khi camOn thay đổi
      if (localVideoRef.current) {
        localVideoRef.current.style.display = camOn ? '' : 'none';
        // Nếu camOn=true mà srcObject bị mất (do detach trước đó), attach lại local track
        if (camOn && localTrackRef.current && localTrackRef.current.attach) {
          // Nếu srcObject null hoặc không có track, attach lại
          const el = localTrackRef.current.attach();
          if (el instanceof HTMLVideoElement && (!localVideoRef.current.srcObject || (localVideoRef.current.srcObject instanceof MediaStream && (localVideoRef.current.srcObject as MediaStream).getVideoTracks().length === 0))) {
            localVideoRef.current.srcObject = el.srcObject;
            localVideoRef.current.muted = true;
          }
        }
      }
    } else if (localStreamRef.current) {
      // Nếu chưa có call, thao tác trực tiếp lên local stream
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = camOn; });
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = micOn; });
      if (localVideoRef.current) {
        localVideoRef.current.style.display = camOn ? '' : 'none';
      }
    }
  }, [camOn, micOn, isSpectator]);

  // Nếu không nhận ref từ ngoài thì render video ở đây (giữ tương thích cũ)
  if (!propLocalVideoRef && !propRemoteVideoRef) {
    return (
      <>
        <video ref={localVideoRef} id="my-video" autoPlay muted playsInline style={{ display: 'none', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
        <video ref={remoteVideoRef} id="opponent-video" autoPlay playsInline style={{ display: 'none', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, background: '#111' }} />
      </>
    );
  }
  // Nếu đã nhận ref từ ngoài thì không render video ở đây
  return null;
};

export default VideoCall;