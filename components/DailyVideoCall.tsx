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

  // Tạo room trước khi join - chỉ tạo 1 lần
  useEffect(() => {
    let isMounted = true;
    let roomCreated = false;

    const createAndJoinRoom = async () => {
      // Tránh tạo room nhiều lần
      if (roomCreated) return;
      
      try {
        console.log('Creating room:', roomName);
        
        // Tạo room trên Daily.co trước
        const response = await fetch('/api/daily-room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomName }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create room');
        }

        const roomData = await response.json();
        console.log('Room created successfully:', roomData);
        
        roomCreated = true;

        if (isMounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        console.error('Error creating room:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to create room');
        }
      }
    };

    createAndJoinRoom();

    return () => {
      isMounted = false;
      // Không set isConnected = false ở đây để tránh re-render
    };
  }, [roomName]); // Chỉ depend vào roomName, không depend vào userId

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
        {isConnected ? (
          <div className="relative w-full h-full">
            <iframe
              src={`${getDailyRoomUrl(roomName)}?userName=${encodeURIComponent(userId)}&startVideoOff=${!camOn}&startAudioOff=${!micOn}&t=${Date.now()}`}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                background: '#000'
              }}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              allowFullScreen
              onLoad={() => {
                console.log('Daily.co iframe loaded for room:', roomName);
              }}
              onError={(e) => {
                console.error('Daily.co iframe error:', e);
                setError('Failed to load video call');
              }}
            />
            {/* Debug info */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
              <div>Room: {roomName}</div>
              <div>User: {userId}</div>
              <div>Cam: {camOn ? 'ON' : 'OFF'}</div>
              <div>Mic: {micOn ? 'ON' : 'OFF'}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <div>Creating room...</div>
            </div>
          </div>
        )}
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
