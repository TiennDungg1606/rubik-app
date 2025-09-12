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
            localVideoRef.current.srcObject = event.track.attach();
          }
        })
        .on('remote-video-track-started', (event: any) => {
          console.log('[DailyVideoCall] remote-video-track-started', event);
          if (remoteVideoRef.current && event.track) {
            remoteVideoRef.current.srcObject = event.track.attach();
          }
        });

      // Join room
      callObject.join();
    }

    function updateParticipants() {
      if (callObjectRef.current) {
        const participants = callObjectRef.current.participants();
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
        {/* Custom video layout cho 2vs2 */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full p-2">
          {participants.slice(0, 4).map((participant, index) => (
            <div key={participant.session_id} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                autoPlay
                playsInline
                muted={participant.local}
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (participant.local && localVideoRef) {
                    (localVideoRef as any).current = el;
                  } else if (!participant.local && remoteVideoRef) {
                    (remoteVideoRef as any).current = el;
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                {participant.user_name || `Player ${index + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render cho 1vs1 mode - hiển thị 2 video
  return (
    <div className="w-full h-full relative">
      {/* Custom video layout cho 1vs1 */}
      <div className="grid grid-cols-2 gap-2 h-full p-2">
        {participants.slice(0, 2).map((participant, index) => (
          <div key={participant.session_id} className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              autoPlay
              playsInline
              muted={participant.local}
              className="w-full h-full object-cover"
              ref={(el) => {
                if (participant.local && localVideoRef) {
                  (localVideoRef as any).current = el;
                } else if (!participant.local && remoteVideoRef) {
                  (remoteVideoRef as any).current = el;
                }
              }}
            />
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
              {participant.user_name || (participant.local ? 'You' : 'Opponent')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyVideoCall;
