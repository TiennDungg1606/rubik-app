import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { DAILY_CONFIG, getDailyRoomUrl } from '@/lib/dailyConfig';

interface DailyVideoCallProps {
  roomName: string;
  userId: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onParticipantsChange?: (participants: any[]) => void;
}

const DailyVideoCall: React.FC<DailyVideoCallProps> = ({ 
  roomName, 
  userId, 
  camOn, 
  micOn, 
  localVideoRef: propLocalVideoRef, 
  remoteVideoRef: propRemoteVideoRef,
  onParticipantsChange 
}) => {
  const callFrameRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nếu có ref truyền từ ngoài thì dùng, không thì tạo ref nội bộ
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef || useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;

    const startCall = async () => {
      try {
        // Tạo Daily call frame
        const callFrame = DailyIframe.createFrame(
          localVideoRef.current || remoteVideoRef.current?.parentElement,
          DAILY_CONFIG.DEFAULT_CONFIG
        );

        if (!isMounted) return;

        callFrameRef.current = callFrame;

        // Event listeners
        callFrame
          .on('joined-meeting', (event) => {
            console.log('Joined meeting:', event);
            setIsConnected(true);
            setError(null);
          })
          .on('left-meeting', (event) => {
            console.log('Left meeting:', event);
            setIsConnected(false);
          })
          .on('error', (event) => {
            console.error('Daily error:', event);
            setError(event.errorMsg || 'Connection error');
          })
          .on('participant-joined', (event) => {
            console.log('Participant joined:', event.participant);
            onParticipantsChange?.(Object.values(callFrame.participants()));
          })
          .on('participant-left', (event) => {
            console.log('Participant left:', event.participant);
            onParticipantsChange?.(Object.values(callFrame.participants()));
          })
          .on('camera-error', (event) => {
            console.error('Camera error:', event);
            setError('Camera access denied');
          })
          .on('microphone-error', (event) => {
            console.error('Microphone error:', event);
            setError('Microphone access denied');
          });

        // Join room - sử dụng room name trực tiếp
        await callFrame.join({
          url: getDailyRoomUrl(roomName),
          userName: userId,
          startVideoOff: !camOn,
          startAudioOff: !micOn,
        });

      } catch (err) {
        console.error('Error starting Daily call:', err);
        setError(err instanceof Error ? err.message : 'Failed to start call');
      }
    };

    startCall();

    return () => {
      isMounted = false;
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
      setIsConnected(false);
    };
  }, [roomName, userId]);

  // Xử lý thay đổi cam/mic
  useEffect(() => {
    if (!callFrameRef.current) return;

    try {
      callFrameRef.current.setLocalVideo(camOn);
      callFrameRef.current.setLocalAudio(micOn);
    } catch (err) {
      console.error('Error toggling camera/microphone:', err);
    }
  }, [camOn, micOn]);

  // Nếu không nhận ref từ ngoài thì render video ở đây
  if (!propLocalVideoRef && !propRemoteVideoRef) {
    return (
      <div className="relative w-full h-full">
        {error && (
          <div className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded">
            Error: {error}
          </div>
        )}
        <div 
          ref={localVideoRef} 
          id="daily-local-video" 
          style={{ 
            width: '100%', 
            height: '100%', 
            background: '#000'
          }} 
        />
        {isConnected && (
          <div className="absolute bottom-4 left-4 bg-green-500 text-white px-2 py-1 rounded text-sm">
            Connected to {roomName}
          </div>
        )}
      </div>
    );
  }

  // Nếu đã nhận ref từ ngoài thì không render video ở đây
  return null;
};

export default DailyVideoCall;
