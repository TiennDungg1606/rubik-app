import React, { useEffect, useRef, useState } from 'react';

interface DailyVideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  is2vs2?: boolean; // Thêm prop để hỗ trợ 2vs2
}

const DailyVideoCall: React.FC<DailyVideoCallProps> = ({ 
  roomUrl, 
  camOn, 
  micOn, 
  localVideoRef: propLocalVideoRef, 
  remoteVideoRef: propRemoteVideoRef,
  is2vs2 = false 
}) => {
  const callObjectRef = useRef<any>(null);
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef || useRef<HTMLVideoElement>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Khởi tạo Daily.co call object
  useEffect(() => {
    if (!roomUrl) return;

    // Load Daily.co script nếu chưa có
    if (!(window as any).DailyIframe) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js@latest/dist/daily-iframe.js';
      script.async = true;
      script.onload = () => {
        // Kiểm tra lại sau khi load
        if ((window as any).DailyIframe) {
          initializeCallObject();
        } else {
          console.error('[DailyVideoCall] DailyIframe not available after script load');
        }
      };
      script.onerror = () => {
        console.error('[DailyVideoCall] Failed to load Daily.co script');
      };
      document.head.appendChild(script);
    } else {
      initializeCallObject();
    }

    function initializeCallObject() {
      const DailyIframe = (window as any).DailyIframe;
      if (!DailyIframe) {
        console.error('[DailyVideoCall] DailyIframe not available');
        return;
      }

      // Tạo call object
      let callObject;
      try {
        callObject = DailyIframe.createCallObject({
          url: roomUrl,
          userName: 'Player', // Có thể lấy từ props hoặc state
          startAudioOff: false,
          startVideoOff: false,
        });
      } catch (error) {
        console.error('[DailyVideoCall] Error creating call object:', error);
        return;
      }

      callObjectRef.current = callObject;

      // Event listeners
      callObject
        .on('joined-meeting', (event: any) => {
          console.log('[DailyVideoCall] joined-meeting', event);
          setIsJoined(true);
          updateParticipants();
        })
        .on('left-meeting', (event: any) => {
          console.log('[DailyVideoCall] left-meeting', event);
          setIsJoined(false);
        })
        .on('participant-joined', (event: any) => {
          console.log('[DailyVideoCall] participant-joined', event);
          updateParticipants();
        })
        .on('participant-left', (event: any) => {
          console.log('[DailyVideoCall] participant-left', event);
          updateParticipants();
        })
        .on('camera-error', (event: any) => {
          console.error('[DailyVideoCall] camera-error', event);
        })
        .on('microphone-error', (event: any) => {
          console.error('[DailyVideoCall] microphone-error', event);
        })
        .on('local-video-track-started', (event: any) => {
          console.log('[DailyVideoCall] local-video-track-started', event);
          if (localVideoRef.current && event.track) {
            const videoElement = event.track.attach();
            localVideoRef.current.srcObject = videoElement.srcObject;
            localVideoRef.current.style.display = 'block';
            // Ẩn placeholder text
            const placeholder = localVideoRef.current.parentElement?.querySelector('.absolute.inset-0.flex') as HTMLElement;
            if (placeholder) placeholder.style.display = 'none';
          }
        })
        .on('remote-video-track-started', (event: any) => {
          console.log('[DailyVideoCall] remote-video-track-started', event);
          if (remoteVideoRef.current && event.track) {
            const videoElement = event.track.attach();
            remoteVideoRef.current.srcObject = videoElement.srcObject;
            remoteVideoRef.current.style.display = 'block';
            // Ẩn placeholder text
            const placeholder = remoteVideoRef.current.parentElement?.querySelector('.absolute.inset-0.flex') as HTMLElement;
            if (placeholder) placeholder.style.display = 'none';
          }
        })
        .on('participant-updated', (event: any) => {
          console.log('[DailyVideoCall] participant-updated', event);
          updateParticipants();
        });

      // Join room
      callObject.join();
    }

    function updateParticipants() {
      if (callObjectRef.current) {
        const participants = callObjectRef.current.participants();
        console.log('[DailyVideoCall] participants:', participants);
        setParticipants(Object.values(participants));
      }
    }

    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    };
  }, [roomUrl]);

  // Xử lý cam/mic toggle
  useEffect(() => {
    if (!callObjectRef.current || !isJoined) return;

    callObjectRef.current.setLocalVideo(camOn);
    callObjectRef.current.setLocalAudio(micOn);
  }, [camOn, micOn, isJoined]);

  // Render cho 2vs2 mode - hiển thị 4 video
  if (is2vs2) {
    return (
      <div className="w-full h-full relative">
        {/* Custom video layout cho 2vs2 - chỉ 2 video */}
        <div className="grid grid-cols-2 gap-2 h-full p-2">
          {/* Local video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: 'none' }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              {isJoined ? 'Local Video' : 'Connecting...'}
            </div>
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
              You
            </div>
          </div>
          
          {/* Remote video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: 'none' }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              {participants.length > 1 ? 'Remote Video' : 'Waiting for player...'}
            </div>
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
              Player 2
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render cho 1vs1 mode - hiển thị 2 video
  return (
    <div className="w-full h-full relative">
      {/* Custom video layout cho 1vs1 */}
      <div className="grid grid-cols-2 gap-2 h-full p-2">
        {/* Local video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: 'none' }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            {isJoined ? 'Local Video' : 'Connecting...'}
          </div>
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
            You
          </div>
        </div>
        
        {/* Remote video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ display: 'none' }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            {participants.length > 1 ? 'Remote Video' : 'Waiting for opponent...'}
          </div>
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
            Opponent
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyVideoCall;
