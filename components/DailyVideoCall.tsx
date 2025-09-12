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
  const callFrameRef = useRef<any>(null);
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef || useRef<HTMLVideoElement>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Khởi tạo Daily.co call frame
  useEffect(() => {
    if (!roomUrl) return;

    // Load Daily.co script nếu chưa có
    if (!(window as any).DailyIframe) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      script.onload = () => {
        initializeCallFrame();
      };
      document.head.appendChild(script);
    } else {
      initializeCallFrame();
    }

    function initializeCallFrame() {
      const DailyIframe = (window as any).DailyIframe;
      if (!DailyIframe) return;

      // Tạo call frame
      const callFrame = DailyIframe.createCallFrame({
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: false, // Sẽ tự quản lý local video
        showParticipantsBar: false,
        theme: {
          accent: '#2563eb',
          accentText: '#ffffff',
          background: '#1f2937',
          backgroundAccent: '#374151',
          baseText: '#ffffff',
          border: '#4b5563',
          mainAreaBg: '#111827',
          supportiveText: '#9ca3af'
        }
      });

      callFrameRef.current = callFrame;

      // Event listeners
      callFrame
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
        });

      // Join room
      callFrame.join({ url: roomUrl });

      // Mount call frame
      const container = document.getElementById('daily-call-frame');
      if (container) {
        callFrame.mount(container);
      }
    }

    function updateParticipants() {
      if (callFrameRef.current) {
        const participants = callFrameRef.current.participants();
        setParticipants(Object.values(participants));
      }
    }

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [roomUrl]);

  // Xử lý cam/mic toggle
  useEffect(() => {
    if (!callFrameRef.current || !isJoined) return;

    callFrameRef.current.setLocalVideo(camOn);
    callFrameRef.current.setLocalAudio(micOn);
  }, [camOn, micOn, isJoined]);

  // Render cho 2vs2 mode - hiển thị 4 video
  if (is2vs2) {
    return (
      <div className="w-full h-full relative">
        <div id="daily-call-frame" className="w-full h-full" />
        {/* Custom video layout cho 2vs2 */}
        <div className="absolute inset-0 pointer-events-none">
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
      </div>
    );
  }

  // Render cho 1vs1 mode - hiển thị 2 video
  return (
    <div className="w-full h-full relative">
      <div id="daily-call-frame" className="w-full h-full" />
      {/* Custom video layout cho 1vs1 */}
      <div className="absolute inset-0 pointer-events-none">
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
    </div>
  );
};

export default DailyVideoCall;
