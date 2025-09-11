import React, { useEffect, useRef, useState } from 'react';
import { connect, createLocalTracks, createLocalVideoTrack, createLocalAudioTrack } from 'twilio-video';

interface TwilioVideoCallProps {
  roomName: string;
  userId: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onParticipantsChange?: (participants: any[]) => void;
}

const TwilioVideoCall: React.FC<TwilioVideoCallProps> = ({ 
  roomName, 
  userId, 
  camOn, 
  micOn, 
  localVideoRef: propLocalVideoRef, 
  remoteVideoRef: propRemoteVideoRef,
  onParticipantsChange 
}) => {
  const roomRef = useRef<any>(null);
  const localTracksRef = useRef<any[]>([]);
  const participantsRef = useRef<any[]>([]);
  
  // Nếu có ref truyền từ ngoài thì dùng, không thì tạo ref nội bộ
  const localVideoRef = propLocalVideoRef || useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef || useRef<HTMLVideoElement>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tạo access token và kết nối room
  useEffect(() => {
    let isMounted = true;

    const connectToRoom = async () => {
      try {
        // Lấy access token từ API
        const response = await fetch('/api/twilio-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, roomName })
        });

        if (!response.ok) {
          throw new Error('Failed to get access token');
        }

        const { token } = await response.json();

        // Tạo local tracks
        const localTracks = await createLocalTracks({
          audio: micOn,
          video: { width: 640, height: 480 }
        });

        if (!isMounted) {
          localTracks.forEach(track => track.stop());
          return;
        }

        localTracksRef.current = localTracks;

        // Attach local video track
        const localVideoTrack = localTracks.find(track => track.kind === 'video');
        if (localVideoTrack && localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([localVideoTrack.mediaStreamTrack]);
          localVideoRef.current.muted = true;
          localVideoRef.current.style.display = camOn ? '' : 'none';
        }

        // Kết nối room
        const room = await connect(token, {
          name: roomName,
          tracks: localTracks,
        });

        if (!isMounted) {
          room.disconnect();
          return;
        }

        roomRef.current = room;
        setIsConnected(true);
        setError(null);

        // Xử lý participants
        const handleParticipantConnected = (participant: any) => {
          console.log('Participant connected:', participant.identity);
          participantsRef.current.push(participant);
          onParticipantsChange?.(participantsRef.current);

          // Attach remote tracks
          participant.tracks.forEach((publication: any) => {
            if (publication.track) {
              handleTrackSubscribed(publication.track, participant);
            }
          });

          participant.on('trackSubscribed', (track: any) => {
            handleTrackSubscribed(track, participant);
          });

          participant.on('trackUnsubscribed', (track: any) => {
            handleTrackUnsubscribed(track);
          });
        };

        const handleParticipantDisconnected = (participant: any) => {
          console.log('Participant disconnected:', participant.identity);
          participantsRef.current = participantsRef.current.filter(p => p !== participant);
          onParticipantsChange?.(participantsRef.current);
        };

        const handleTrackSubscribed = (track: any, participant: any) => {
          if (track.kind === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
            remoteVideoRef.current.style.display = '';
          }
        };

        const handleTrackUnsubscribed = (track: any) => {
          if (track.kind === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.style.display = 'none';
          }
        };

        // Listen to room events
        room.on('participantConnected', handleParticipantConnected);
        room.on('participantDisconnected', handleParticipantDisconnected);

        // Xử lý participants đã có sẵn
        room.participants.forEach(handleParticipantConnected);

        room.on('disconnected', () => {
          console.log('Room disconnected');
          setIsConnected(false);
          participantsRef.current = [];
          onParticipantsChange?.(participantsRef.current);
        });

      } catch (err) {
        console.error('Error connecting to room:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    connectToRoom();

    return () => {
      isMounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      localTracksRef.current.forEach(track => track.stop());
      localTracksRef.current = [];
      participantsRef.current = [];
      onParticipantsChange?.(participantsRef.current);
    };
  }, [roomName, userId]);

  // Xử lý thay đổi cam/mic
  useEffect(() => {
    if (!roomRef.current || !localTracksRef.current.length) return;

    const localVideoTrack = localTracksRef.current.find(track => track.kind === 'video');
    const localAudioTrack = localTracksRef.current.find(track => track.kind === 'audio');

    if (localVideoTrack) {
      localVideoTrack.enable(camOn);
      if (localVideoRef.current) {
        localVideoRef.current.style.display = camOn ? '' : 'none';
      }
    }

    if (localAudioTrack) {
      localAudioTrack.enable(micOn);
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
        <video 
          ref={localVideoRef} 
          id="my-video" 
          autoPlay 
          muted 
          playsInline 
          style={{ 
            display: 'none', 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            borderRadius: 12 
          }} 
        />
        <video 
          ref={remoteVideoRef} 
          id="opponent-video" 
          autoPlay 
          playsInline 
          style={{ 
            display: 'none', 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            borderRadius: 12, 
            background: '#111' 
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

export default TwilioVideoCall;
