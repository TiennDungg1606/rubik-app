

import React, { useEffect, useRef } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface VideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  type: 'local' | 'remote'; // Thêm prop để xác định loại video
}

const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, camOn, micOn, type }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callObjectRef = useRef<DailyCall | null>(null);
  const [remoteStreamActive, setRemoteStreamActive] = React.useState(false);

  // Khởi tạo Daily.co callObject và join room
  useEffect(() => {
    if (!roomUrl) return;
    const callObject = DailyIframe.createCallObject();
    callObjectRef.current = callObject;
    callObject.join({ url: roomUrl }).then(() => {
      // Sau khi join, lấy participant local và gán stream nếu có
      const participants = callObject.participants();
      Object.values(participants).forEach((p: any) => {
        if (p.local && p.tracks && p.tracks.video && localVideoRef.current) {
          if (p.tracks.video.state === 'playable' && p.tracks.video.persistentTrack) {
            localVideoRef.current.srcObject = new MediaStream([p.tracks.video.persistentTrack]);
          }
        }
      });
    });

    // Lắng nghe sự kiện track cho local/remote
    const handleTrack = (event: any) => {
      if (event.participant && event.participant.local) {
        // Local stream
        if (localVideoRef.current && event.track && event.kind === 'video') {
          localVideoRef.current.srcObject = event.stream;
        }
      } else {
        // Remote stream
        if (remoteVideoRef.current && event.track && event.kind === 'video') {
          remoteVideoRef.current.srcObject = event.stream;
          setRemoteStreamActive(true);
        }
      }
    };
    callObject.on('track-started', handleTrack);

    // Cleanup
    return () => {
      callObject.off('track-started', handleTrack);
      callObject.leave();
      callObject.destroy();
      callObjectRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setRemoteStreamActive(false);
    };
  }, [roomUrl]);

  // Bật/tắt cam/mic
  useEffect(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalVideo(camOn);
      callObjectRef.current.setLocalAudio(micOn);
    }
  }, [camOn, micOn]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {type === 'local' && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
          id="my-video"
        />
      )}
      {type === 'remote' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
            display: remoteStreamActive ? 'block' : 'none'
          }}
          id="opponent-video"
        />
      )}
    </div>
  );
};

export default VideoCall;