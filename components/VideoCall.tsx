import React, { useEffect, useRef } from 'react';
import DailyVideoCall from './DailyVideoCall';

interface VideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
}

// roomUrl: dạng JSON.stringify({ roomName, userId }) hoặc legacy { access_token, userId, opponentId }
const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, camOn, micOn, localVideoRef: propLocalVideoRef, remoteVideoRef: propRemoteVideoRef }) => {
  // Nếu có ref truyền từ ngoài thì dùng, không thì tạo ref nội bộ
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef || useRef<HTMLVideoElement>(null);

  // Parse roomUrl to get roomName, userId (new format) or legacy format
  let roomName = '';
  let userId = '';
  let isLegacyFormat = false;
  
  try {
    if (roomUrl) {
      const obj = JSON.parse(roomUrl);
      // Check if it's new Twilio format
      if (obj.roomName && obj.userId) {
        roomName = obj.roomName;
        userId = obj.userId;
      } 
      // Legacy Stringee format - convert to room name (sử dụng roomId từ URL)
      else if (obj.userId && obj.opponentId) {
        // Lấy roomId từ window.location.pathname
        const pathParts = window.location.pathname.split('/');
        const roomId = pathParts[pathParts.length - 1];
        roomName = `room-${roomId}`;
        userId = obj.userId;
        isLegacyFormat = true;
      }
    }
  } catch (e) {
    console.error('[VideoCall] roomUrl parse error:', e, roomUrl);
  }

  // Debug logging
  console.log('[VideoCall] Parsed data:', { roomName, userId, roomUrl });
  console.log('[VideoCall] Current URL:', window.location.href);
  console.log('[VideoCall] Room ID from URL:', window.location.pathname.split('/').pop());

  // Render Daily Video Call component
  if (!roomName || !userId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Invalid room configuration</div>
      </div>
    );
  }

  return (
    <DailyVideoCall
      roomName={roomName}
      userId={userId}
      camOn={camOn}
      micOn={micOn}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
    />
  );
};

export default VideoCall;