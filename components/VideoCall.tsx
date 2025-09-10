import React, { useEffect, useRef, useState } from 'react';

interface VideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRefs?: React.RefObject<HTMLVideoElement | null>[];
  userId?: string; // Thêm userId để xác định thứ tự người tham gia
}


// roomUrl: dạng JSON.stringify({ access_token, userId, roomId })
const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, camOn, micOn, localVideoRef: propLocalVideoRef, remoteVideoRefs: propRemoteVideoRefs, userId }) => {
  const clientRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);
  const remoteTracksRef = useRef<Map<string, any>>(new Map());
  // Nếu có ref truyền từ ngoài thì dùng, không thì tạo ref nội bộ
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = propRemoteVideoRefs || [useRef<HTMLVideoElement>(null)];
  // State cho local stream preview
  const localStreamRef = useRef<MediaStream|null>(null);
  // State: đã join room Stringee chưa
  const hasJoinedRoomRef = useRef(false);
  // State: danh sách participants
  const participantsRef = useRef<Map<string, any>>(new Map());
  // State: thứ tự người tham gia (chỉ 2 người đầu tiên được hiển thị video)
  const participantOrderRef = useRef<string[]>([]);
  const maxVideoParticipants = 2;

  // Hàm kiểm tra xem người dùng có được phép hiển thị video hay không
  const canShowVideo = (participantId: string) => {
    const order = participantOrderRef.current;
    const index = order.indexOf(participantId);
    return index >= 0 && index < maxVideoParticipants;
  };

  // Parse roomUrl to get access_token, userId, roomId
  let access_token = '';
  let parsedUserId = '';
  let roomId = '';
  try {
    if (roomUrl) {
      const obj = JSON.parse(roomUrl);
      access_token = obj.access_token || '';
      parsedUserId = obj.userId || '';
      roomId = obj.roomId || '';
    }
  } catch (e) {
    console.error('[VideoCall] roomUrl parse error:', e, roomUrl);
  }

  // Luôn show local cam preview khi vào phòng (dù chưa join room)
  useEffect(() => {
    let stopped = false;
    if (localVideoRef.current) {
      // Nếu đã join room Stringee thì không cần getUserMedia nữa
      if (hasJoinedRoomRef.current) return;
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
  }, [localVideoRef, camOn, micOn]);

  // Nếu chưa có access_token, thử lấy từ API (dùng userId)
  useEffect(() => {
    if (!access_token && parsedUserId) {
      fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parsedUserId })
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.access_token) {
            window.location.reload(); // reload để truyền access_token vào roomUrl (hoặc có thể set lại state)
          }
        });
    }
  }, [access_token, parsedUserId]);
  // Khởi tạo StringeeClient/room khi có roomId
  useEffect(() => {
    if (!access_token || !parsedUserId || !roomId) return;
    // Cleanup old client/room
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }
    if (roomRef.current) {
      try { roomRef.current.leave(); } catch {}
      roomRef.current = null;
    }
    // eslint-disable-next-line no-undef
    const StringeeClient = (window as any).StringeeClient;
    if (!StringeeClient) {
      console.error('[VideoCall] StringeeClient not found on window');
      return;
    }
    const client = new StringeeClient();
    clientRef.current = client;
    hasJoinedRoomRef.current = false;
    // Listen events
    client.on('connect', () => {
      console.log('[VideoCall] client connected');
    });
    client.on('authen', (res: any) => {
      console.log('[VideoCall] client authen:', res);
      if (res.r === 0) {
        // Join room
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

    // Join room function
    function joinRoom(client: any) {
      // eslint-disable-next-line no-undef
      const StringeeRoom = (window as any).StringeeRoom;
      if (!StringeeRoom) {
        console.error('[VideoCall] StringeeRoom not found on window');
        return;
      }
      const room = new StringeeRoom(client, roomId);
      roomRef.current = room;
      setupRoomEvents(room);
      room.join((res: any) => {
        console.log('[VideoCall] join room result', res);
      });
    }

    function setupRoomEvents(room: any) {
      hasJoinedRoomRef.current = true;
      // Khi đã join room, tắt local preview stream (nếu có)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Room events
      room.on('roomjoined', (res: any) => {
        console.log('[VideoCall] room joined', res);
      });

      room.on('roomleft', (res: any) => {
        console.log('[VideoCall] room left', res);
      });

      room.on('participantjoined', (participant: any) => {
        console.log('[VideoCall] participant joined', participant);
        participantsRef.current.set(participant.id, participant);
        
        // Thêm người tham gia vào danh sách thứ tự
        if (!participantOrderRef.current.includes(participant.id)) {
          participantOrderRef.current.push(participant.id);
          console.log('[VideoCall] Updated participant order:', participantOrderRef.current);
        }
      });

      room.on('participantleft', (participant: any) => {
        console.log('[VideoCall] participant left', participant);
        participantsRef.current.delete(participant.id);
        
        // Xóa người tham gia khỏi danh sách thứ tự
        const index = participantOrderRef.current.indexOf(participant.id);
        if (index > -1) {
          participantOrderRef.current.splice(index, 1);
          console.log('[VideoCall] Updated participant order after leave:', participantOrderRef.current);
          
          // Cập nhật state để trigger useEffect
          setParticipantOrderLength(participantOrderRef.current.length);
        }
        
        // Remove remote video
        const remoteTrack = remoteTracksRef.current.get(participant.id);
        if (remoteTrack && remoteTrack.detachAndRemove) {
          remoteTrack.detachAndRemove();
        }
        remoteTracksRef.current.delete(participant.id);
        // Clear video element
        const videoRef = remoteVideoRefs.find(ref => ref.current?.id === `remote-${participant.id}`);
        if (videoRef?.current) {
          videoRef.current.srcObject = null;
          videoRef.current.style.display = 'none';
        }
      });

      // Local track events
      room.on('addlocaltrack', (localtrack: any) => {
        console.log('[VideoCall] addlocaltrack', localtrack);
        localTrackRef.current = localtrack;
        
        // Chỉ hiển thị video của chính mình nếu người dùng hiện tại là một trong 2 người đầu tiên
        if (userId && canShowVideo(userId)) {
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
        } else {
          // Nếu không được phép hiển thị video của chính mình, ẩn local video
          // Video sẽ được hiển thị bởi useEffect khác
          if (localVideoRef.current) {
            localVideoRef.current.style.display = 'none';
          }
        }
      });

      room.on('removelocaltrack', (track: any) => {
        if (track && track.detachAndRemove) track.detachAndRemove();
        localTrackRef.current = null;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.style.display = 'none';
        }
      });

      // Remote track events
      room.on('addremotetrack', (remotetrack: any) => {
        console.log('[VideoCall] addremotetrack', remotetrack);
        const participantId = remotetrack.participantId;
        remoteTracksRef.current.set(participantId, remotetrack);
        
        // Lưu track nhưng không tự động hiển thị
        // Video sẽ được hiển thị bởi useEffect dựa trên thứ tự người tham gia
        console.log(`[VideoCall] Stored track for participant ${participantId}, will be displayed by useEffect`);
      });

      room.on('removeremotetrack', (track: any) => {
        console.log('[VideoCall] removeremotetrack', track);
        const participantId = track.participantId;
        if (track && track.detachAndRemove) track.detachAndRemove();
        remoteTracksRef.current.delete(participantId);
        
        // Clear video element
        const videoRef = remoteVideoRefs.find(ref => ref.current?.id === `remote-${participantId}`);
        if (videoRef?.current) {
          videoRef.current.srcObject = null;
          videoRef.current.style.display = 'none';
        }
      });

      room.on('mediastate', (state: any) => {
        console.log('[VideoCall] mediastate', state);
      });

      room.on('info', (info: any) => {
        console.log('[VideoCall] info', info);
      });
    }

    // Cleanup on unmount
    return () => {
      hasJoinedRoomRef.current = false;
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
      // Clear all remote videos
      remoteVideoRefs.forEach(ref => {
        if (ref.current) {
          ref.current.srcObject = null;
          ref.current.style.display = 'none';
        }
      });
      // Clear tracks
      remoteTracksRef.current.clear();
      participantsRef.current.clear();
    };
    // eslint-disable-next-line
  }, [roomUrl, roomId]);

  // React to cam/mic changes
  useEffect(() => {
    // Chỉ xử lý cam/mic nếu người dùng được phép hiển thị video của chính mình
    if (!userId || !canShowVideo(userId)) {
      // Nếu không được phép hiển thị video của chính mình, ẩn local video
      if (localVideoRef.current) {
        localVideoRef.current.style.display = 'none';
      }
      return;
    }

    // Nếu đã join room Stringee thì thao tác lên room
    if (roomRef.current) {
      try {
        roomRef.current.enableLocalVideo(camOn);
        roomRef.current.mute(!micOn);
      } catch (e) {
        console.error('[VideoCall] cam/mic toggle error', e);
      }
      // Không disable trực tiếp video track khi đã join room (Stringee sẽ xử lý)
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
      // Nếu chưa join room, thao tác trực tiếp lên local stream
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = camOn; });
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = micOn; });
      if (localVideoRef.current) {
        localVideoRef.current.style.display = camOn ? '' : 'none';
      }
    }
  }, [camOn, micOn, userId]);

  // State để theo dõi thay đổi thứ tự người tham gia
  const [participantOrderLength, setParticipantOrderLength] = useState(0);

  // Cập nhật state khi thứ tự thay đổi
  useEffect(() => {
    setParticipantOrderLength(participantOrderRef.current.length);
  }, [participantOrderRef.current.length]);

  // Theo dõi thay đổi thứ tự người tham gia để cập nhật video hiển thị
  useEffect(() => {
    if (!userId) return;
    
    const currentOrder = participantOrderRef.current;
    const allowedParticipants = currentOrder.slice(0, maxVideoParticipants);
    
    // Nếu người dùng hiện tại không được phép hiển thị video (người thứ 3+)
    if (!canShowVideo(userId)) {
      // Ẩn local video của chính họ
      if (localVideoRef.current) {
        localVideoRef.current.style.display = 'none';
      }
      
      // Hiển thị video của 2 người đầu tiên ở cả 2 ô
      allowedParticipants.forEach((participantId, index) => {
        const track = remoteTracksRef.current.get(participantId);
        if (track) {
          // Ô đầu tiên (localVideoRef) hiển thị video của người đầu tiên
          if (index === 0 && localVideoRef.current) {
            const el = track.attach();
            if (el instanceof HTMLVideoElement) {
              localVideoRef.current.srcObject = el.srcObject;
              localVideoRef.current.muted = false;
              localVideoRef.current.style.display = '';
              localVideoRef.current.id = `remote-${participantId}`;
            }
          }
          // Ô thứ hai (remoteVideoRefs[0]) hiển thị video của người thứ hai
          else if (index === 1 && remoteVideoRefs[0]?.current) {
            const el = track.attach();
            if (el instanceof HTMLVideoElement) {
              remoteVideoRefs[0].current.srcObject = el.srcObject;
              remoteVideoRefs[0].current.muted = false;
              remoteVideoRefs[0].current.style.display = '';
              remoteVideoRefs[0].current.id = `remote-${participantId}`;
            }
          }
        }
      });
    } else {
      // Người dùng là một trong 2 người đầu tiên - hiển thị bình thường
      // Local video hiển thị video của chính họ
      if (localVideoRef.current) {
        localVideoRef.current.style.display = camOn ? '' : 'none';
      }
      
      // Remote video hiển thị video của người còn lại
      const otherParticipants = allowedParticipants.filter(id => id !== userId);
      otherParticipants.forEach((participantId, index) => {
        const track = remoteTracksRef.current.get(participantId);
        if (track && remoteVideoRefs[index]?.current) {
          const el = track.attach();
          if (el instanceof HTMLVideoElement) {
            remoteVideoRefs[index].current.srcObject = el.srcObject;
            remoteVideoRefs[index].current.muted = false;
            remoteVideoRefs[index].current.style.display = '';
            remoteVideoRefs[index].current.id = `remote-${participantId}`;
          }
        }
      });
    }
  }, [participantOrderLength, userId, camOn]);

  // Nếu không nhận ref từ ngoài thì render video ở đây (giữ tương thích cũ)
  if (!propLocalVideoRef && !propRemoteVideoRefs) {
    return (
      <>
        <video ref={localVideoRef} id="my-video" autoPlay muted playsInline style={{ display: 'none', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
        {remoteVideoRefs.map((ref, index) => (
          <video 
            key={index}
            ref={ref} 
            id={`remote-video-${index}`} 
            autoPlay 
            playsInline 
            style={{ display: 'none', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, background: '#111' }} 
          />
        ))}
      </>
    );
  }
  // Nếu đã nhận ref từ ngoài thì không render video ở đây
  return null;
};

export default VideoCall;