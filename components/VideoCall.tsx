import React, { useEffect, useRef } from 'react';

interface VideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  isSpectator?: boolean;
  player1VideoRef?: React.RefObject<HTMLVideoElement | null>;
  player2VideoRef?: React.RefObject<HTMLVideoElement | null>;
}


// roomUrl: dạng JSON.stringify({ access_token, userId, opponentId })
const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, camOn, micOn, localVideoRef: propLocalVideoRef, remoteVideoRef: propRemoteVideoRef, isSpectator = false, player1VideoRef, player2VideoRef }) => {
  const clientRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);
  const remoteTrackRef = useRef<any>(null);
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
  try {
    if (roomUrl) {
      const obj = JSON.parse(roomUrl);
      access_token = obj.access_token || '';
      userId = obj.userId || '';
      opponentId = obj.opponentId || '';
    }
  } catch (e) {
    console.error('[VideoCall] roomUrl parse error:', e, roomUrl);
  }

  // Luôn show local cam preview khi vào phòng (dù chưa có call) - chỉ cho người chơi
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
  // Khởi tạo StringeeClient/call khi đủ 2 người (có opponentId)
  useEffect(() => {
    if (!access_token || !userId || !opponentId) return;
    // Cleanup old client/call
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }
    if (callRef.current) {
      try { callRef.current.hangup(); } catch {}
      callRef.current = null;
    }
    // eslint-disable-next-line no-undef
    const StringeeClient = (window as any).StringeeClient;
    if (!StringeeClient) {
      console.error('[VideoCall] StringeeClient not found on window');
      return;
    }
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
        // Outgoing call if userId < opponentId, else wait for incoming
        if (userId < opponentId) {
          makeCall(client);
        }
      }
    });
    client.on('disconnect', () => {
      console.log('[VideoCall] client disconnected');
    });
    client.on('requestnewtoken', () => {
      console.log('[VideoCall] client requestnewtoken');
      // TODO: Gọi lại API để lấy access_token mới và gọi client.connect(new_access_token)
    });
    client.on('incomingcall2', (call2: any) => {
      console.log('[VideoCall] incomingcall2', call2);
      callRef.current = call2;
      setupCallEvents(call2);
      call2.answer((res: any) => {
        console.log('[VideoCall] answer result', res);
      });
    });
    // Connect
    client.connect(access_token);

    // Outgoing call if userId < opponentId (avoid double call)
    function makeCall(client: any) {
      // eslint-disable-next-line no-undef
      const StringeeCall2 = (window as any).StringeeCall2;
      if (!StringeeCall2) {
        console.error('[VideoCall] StringeeCall2 not found on window');
        return;
      }
      const call = new StringeeCall2(client, userId, opponentId, true);
      callRef.current = call;
      setupCallEvents(call);
      call.makeCall((res: any) => {
        console.log('[VideoCall] makeCall result', res);
      });
    }

    function setupCallEvents(call: any) {
      hasCallRef.current = true;
      // Khi đã có call, tắt local preview stream (nếu có)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      call.on('addlocaltrack', (localtrack: any) => {
        console.log('[VideoCall] addlocaltrack', localtrack);
        localTrackRef.current = localtrack;
        const el = localtrack.attach();
        
        if (isSpectator) {
          // Người xem: hiển thị camera của người chơi thứ 2
          if (player2VideoRef?.current && el instanceof HTMLVideoElement) {
            player2VideoRef.current.srcObject = el.srcObject;
            player2VideoRef.current.muted = false;
            player2VideoRef.current.style.display = '';
            console.log('[VideoCall] Spectator received player2 video stream');
          }
        } else {
          // Người chơi: hiển thị camera của mình
          const vid = localVideoRef.current;
          if (vid && el instanceof HTMLVideoElement) {
            vid.srcObject = el.srcObject;
            vid.muted = true;
          }
          // Đảm bảo luôn cập nhật lại display khi camOn thay đổi
          if (localVideoRef.current) {
            localVideoRef.current.style.display = camOn ? '' : 'none';
          }
        }
      });
      call.on('addremotetrack', (remotetrack: any) => {
        console.log('[VideoCall] addremotetrack', remotetrack);
        remoteTrackRef.current = remotetrack;
        const el = remotetrack.attach();
        
        if (isSpectator) {
          // Người xem: hiển thị camera của người chơi thứ 1
          if (player1VideoRef?.current && el instanceof HTMLVideoElement) {
            player1VideoRef.current.srcObject = el.srcObject;
            player1VideoRef.current.muted = false;
            player1VideoRef.current.style.display = '';
            console.log('[VideoCall] Spectator received player1 video stream');
          }
        } else {
          // Người chơi: hiển thị camera của đối thủ
          const vid = remoteVideoRef.current;
          if (vid && el instanceof HTMLVideoElement) {
            vid.srcObject = el.srcObject;
            vid.muted = false;
            vid.style.display = '';
          }
        }
      });
      call.on('removelocaltrack', (track: any) => {
        if (track && track.detachAndRemove) track.detachAndRemove();
        localTrackRef.current = null;
        if (isSpectator) {
          // Người xem: xóa camera của người chơi thứ 2
          if (player2VideoRef?.current) {
            player2VideoRef.current.srcObject = null;
            player2VideoRef.current.style.display = 'none';
          }
        } else {
          // Người chơi: xóa camera của mình
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
            localVideoRef.current.style.display = 'none';
          }
        }
      });
      call.on('removeremotetrack', (track: any) => {
        if (track && track.detachAndRemove) track.detachAndRemove();
        remoteTrackRef.current = null;
        if (isSpectator) {
          // Người xem: xóa camera của người chơi thứ 1
          if (player1VideoRef?.current) {
            player1VideoRef.current.srcObject = null;
            player1VideoRef.current.style.display = 'none';
          }
        } else {
          // Người chơi: xóa camera của đối thủ
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.style.display = 'none';
          }
        }
      });
      call.on('signalingstate', (state: any) => {
        console.log('[VideoCall] signalingstate', state);
      });
      call.on('mediastate', (state: any) => {
        console.log('[VideoCall] mediastate', state);
      });
      call.on('info', (info: any) => {
        console.log('[VideoCall] info', info);
      });
      call.on('otherdevice', (msg: any) => {
        console.log('[VideoCall] otherdevice', msg);
      });
    }

    // Cleanup on unmount
    return () => {
      hasCallRef.current = false;
      if (callRef.current) {
        try { callRef.current.hangup(); } catch {}
        callRef.current = null;
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
    // eslint-disable-next-line
  }, [roomUrl, opponentId]);

  // React to cam/mic changes
  useEffect(() => {
    // Nếu đã có call Stringee thì thao tác lên call
    if (callRef.current) {
      try {
        callRef.current.enableLocalVideo(camOn);
        callRef.current.mute(!micOn);
      } catch (e) {
        console.error('[VideoCall] cam/mic toggle error', e);
      }
      // Không disable trực tiếp video track khi đã có call (Stringee sẽ xử lý)
      // Chỉ disable audio track local để đảm bảo mute đúng
      if (localTrackRef.current && localTrackRef.current._localStream) {
        const audioTracks = localTrackRef.current._localStream.getAudioTracks();
        audioTracks.forEach((track: MediaStreamTrack) => { track.enabled = micOn; });
      }
      // Đảm bảo luôn cập nhật lại display khi camOn thay đổi - chỉ cho người chơi
      if (localVideoRef.current && !isSpectator) {
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
    } else if (localStreamRef.current && !isSpectator) {
      // Nếu chưa có call, thao tác trực tiếp lên local stream - chỉ cho người chơi
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