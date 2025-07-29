


import React, { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface VideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
}


const VideoCall: React.FC<VideoCallProps> = ({ roomUrl, camOn, micOn }) => {
  const callObjectRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    if (!roomUrl) return;
    console.log('[VideoCall] [INIT] Creating Daily callObject and joining room:', roomUrl);
    const callObject = DailyIframe.createCallObject();
    callObjectRef.current = callObject;
    callObject.join({ url: roomUrl })
      .then(() => {
        console.log('[VideoCall] [JOINED] Successfully joined Daily room:', roomUrl);
      })
      .catch((err) => {
        console.error('[VideoCall] [ERROR] Error joining room:', err);
      });

    // Log các sự kiện quan trọng của Daily
    const handleJoinedMeeting = (e: any) => {
      console.log('[VideoCall] [EVENT] joined-meeting:', e);
    };
    const handleParticipantJoined = (e: any) => {
      console.log('[VideoCall] [EVENT] participant-joined:', e);
    };
    const handleParticipantUpdated = (e: any) => {
      console.log('[VideoCall] [EVENT] participant-updated:', e);
    };
    const handleParticipantLeft = (e: any) => {
      console.log('[VideoCall] [EVENT] participant-left:', e);
    };
    const handleError = (e: any) => {
      console.error('[VideoCall] [EVENT] error:', e);
    };
    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('participant-joined', handleParticipantJoined);
    callObject.on('participant-updated', handleParticipantUpdated);
    callObject.on('participant-left', handleParticipantLeft);
    callObject.on('error', handleError);

    // Lắng nghe sự kiện track cho local/remote
    const handleTrack = (event: any) => {
      if (event.participant && event.participant.local) {
        // Local stream
        const localVideo = document.getElementById('my-video') as HTMLVideoElement | null;
        if (localVideo && event.track && event.kind === 'video') {
          localVideo.srcObject = event.stream;
          localVideo.style.display = 'block';
          console.log('[VideoCall] [TRACK] Received local video track, set to #my-video', event);
        } else {
          console.warn('[VideoCall] [WARN] #my-video element not found or no video track', event);
        }
      } else {
        // Remote stream
        const remoteVideo = document.getElementById('opponent-video') as HTMLVideoElement | null;
        if (remoteVideo && event.track && event.kind === 'video') {
          remoteVideo.srcObject = event.stream;
          remoteVideo.style.display = 'block';
          console.log('[VideoCall] [TRACK] Received remote video track, set to #opponent-video', event);
        } else {
          console.warn('[VideoCall] [WARN] #opponent-video element not found or no video track', event);
        }
      }
    };
    callObject.on('track-started', handleTrack);

    // Cleanup
    return () => {
      callObject.off('track-started', handleTrack);
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('participant-joined', handleParticipantJoined);
      callObject.off('participant-updated', handleParticipantUpdated);
      callObject.off('participant-left', handleParticipantLeft);
      callObject.off('error', handleError);
      callObject.leave();
      callObject.destroy();
      callObjectRef.current = null;
      const localVideo = document.getElementById('my-video') as HTMLVideoElement | null;
      if (localVideo) localVideo.srcObject = null;
      const remoteVideo = document.getElementById('opponent-video') as HTMLVideoElement | null;
      if (remoteVideo) {
        remoteVideo.srcObject = null;
        remoteVideo.style.display = 'none';
      }
      console.log('[VideoCall] [CLEANUP] Cleanup done');
    };
  }, [roomUrl]);

  // Bật/tắt cam/mic
  useEffect(() => {
    if (callObjectRef.current) {
      console.log('[VideoCall] [TOGGLE] setLocalVideo:', camOn, 'setLocalAudio:', micOn);
      callObjectRef.current.setLocalVideo(camOn);
      callObjectRef.current.setLocalAudio(micOn);
    }
  }, [camOn, micOn]);

  return null;
};

export default VideoCall;