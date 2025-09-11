import React, { useEffect, useRef } from 'react';
import TwilioVideoCall from './TwilioVideoCall';

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
      // Legacy Stringee format - convert to room name
      else if (obj.userId && obj.opponentId) {
        roomName = `room-${obj.userId}-${obj.opponentId}`;
        userId = obj.userId;
        isLegacyFormat = true;
      }
    }
  } catch (e) {
    console.error('[VideoCall] roomUrl parse error:', e, roomUrl);
  }

  // Render Twilio Video Call component
  if (!roomName || !userId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Invalid room configuration</div>
      </div>
    );
  }

  return (
    <TwilioVideoCall
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