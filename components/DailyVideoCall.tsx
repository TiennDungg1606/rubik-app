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

  // Sử dụng iframe embed thay vì DailyIframe SDK
  useEffect(() => {
    // Set connected state khi component mount
    setIsConnected(true);
    setError(null);
    
    return () => {
      setIsConnected(false);
    };
  }, [roomName, userId]);

  // Xử lý thay đổi cam/mic - iframe tự xử lý
  useEffect(() => {
    // iframe sẽ tự xử lý cam/mic permissions
    console.log('Cam/Mic state changed:', { camOn, micOn });
  }, [camOn, micOn]);

  // Nếu không nhận ref từ ngoài thì render video ở đây
  if (!propLocalVideoRef && !propRemoteVideoRef) {
    return (
      <div className="relative w-full h-full">
        {error && (
          <div className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded z-10">
            Error: {error}
          </div>
        )}
        <iframe
          src={`${getDailyRoomUrl(roomName)}?userName=${encodeURIComponent(userId)}&startVideoOff=${!camOn}&startAudioOff=${!micOn}`}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            background: '#000'
          }}
          allow="camera; microphone; fullscreen; speaker; display-capture"
          allowFullScreen
        />
        {isConnected && (
          <div className="absolute bottom-4 left-4 bg-green-500 text-white px-2 py-1 rounded text-sm z-10">
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
