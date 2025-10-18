'use client';

import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import {
  DailyProvider,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useMediaTrack,
} from '@daily-co/daily-react';

// React 19 renamed the experimental internals object; Daily React still reads the legacy key.
if (typeof (React as unknown as { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown; __SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown; }).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED === 'undefined') {
  (React as unknown as { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown; __SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown; }).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
    (React as unknown as { __SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown }).__SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
}

interface DailyVideoCallProps {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  otherPerson1VideoRef?: React.RefObject<HTMLVideoElement | null>;
  otherPerson2VideoRef?: React.RefObject<HTMLVideoElement | null>;
  is2vs2?: boolean;
}

interface DailyVideoCallInnerProps extends Required<Omit<DailyVideoCallProps, 'roomUrl' | 'camOn' | 'micOn'>> {
  roomUrl: string;
  camOn: boolean;
  micOn: boolean;
}

interface TrackSinkProps {
  sessionId?: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  includeAudio?: boolean;
  forceMuted?: boolean;
}

const DailyVideoCall: React.FC<DailyVideoCallProps> = ({
  roomUrl,
  camOn,
  micOn,
  localVideoRef: propLocalVideoRef,
  remoteVideoRef: propRemoteVideoRef,
  otherPerson1VideoRef: propOtherPerson1VideoRef,
  otherPerson2VideoRef: propOtherPerson2VideoRef,
  is2vs2 = false,
}) => {
  const localVideoRef = propLocalVideoRef ?? useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef ?? useRef<HTMLVideoElement>(null);
  const otherPerson1VideoRef = propOtherPerson1VideoRef ?? useRef<HTMLVideoElement>(null);
  const otherPerson2VideoRef = propOtherPerson2VideoRef ?? useRef<HTMLVideoElement>(null);

  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let disposed = false;

    if (!callObjectRef.current) {
      try {
        const instance = DailyIframe.createCallObject();
        callObjectRef.current = instance;
        if (!disposed) {
          forceRender((tick) => tick + 1);
        } else {
          instance.destroy();
          callObjectRef.current = null;
        }
      } catch (error) {
        console.error('[DailyVideoCall] Failed to create call object', error);
      }
    }

    return () => {
      disposed = true;
      const existing = callObjectRef.current;
      callObjectRef.current = null;
      existing?.destroy();
    };
  }, []);

  const callObject = callObjectRef.current;

  if (!callObject) {
    return null;
  }

  return (
    <DailyProvider callObject={callObject}>
      <DailyVideoCallInner
        roomUrl={roomUrl}
        camOn={camOn}
        micOn={micOn}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        otherPerson1VideoRef={otherPerson1VideoRef}
        otherPerson2VideoRef={otherPerson2VideoRef}
        is2vs2={is2vs2}
      />
    </DailyProvider>
  );
};

const DailyVideoCallInner: React.FC<DailyVideoCallInnerProps> = ({
  roomUrl,
  camOn,
  micOn,
  localVideoRef,
  remoteVideoRef,
  otherPerson1VideoRef,
  otherPerson2VideoRef,
  is2vs2,
}) => {
  const daily = useDaily();
  const joinedMeetingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!daily || !roomUrl) {
      return;
    }

    let disposed = false;

    const joinCall = async () => {
      const meetingState = daily.meetingState();
      const alreadyJoining = meetingState === 'joining-meeting';
      const alreadyJoinedForUrl =
        meetingState === 'joined-meeting' && joinedMeetingUrlRef.current === roomUrl;

      if (alreadyJoining || alreadyJoinedForUrl) {
        return;
      }

      joinedMeetingUrlRef.current = roomUrl;

      try {
        await daily.join({ url: roomUrl });
      } catch (error: unknown) {
        console.error('[DailyVideoCall] Failed to join room', error);
        if (!disposed) {
          joinedMeetingUrlRef.current = null;
        }
      }
    };

    void joinCall();

    return () => {
      disposed = true;
      joinedMeetingUrlRef.current = null;

      const leaveCall = async () => {
        try {
          if (daily.meetingState() !== 'left-meeting') {
            await daily.leave();
          }
        } catch (error: unknown) {
          console.error('[DailyVideoCall] Failed to leave room', error);
        }
      };

      void leaveCall();
    };
  }, [daily, roomUrl]);

  useEffect(() => {
    if (!daily) {
      return;
    }
    try {
      if (daily.localVideo() !== camOn) {
        daily.setLocalVideo(camOn);
      }
    } catch (error: unknown) {
      console.error('[DailyVideoCall] Failed to set local video state', error);
    }
  }, [daily, camOn]);

  useEffect(() => {
    if (!daily) {
      return;
    }
    try {
      if (daily.localAudio() !== micOn) {
        daily.setLocalAudio(micOn);
      }
    } catch (error: unknown) {
      console.error('[DailyVideoCall] Failed to set local audio state', error);
    }
  }, [daily, micOn]);

  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote', sort: 'joined_at' });

  const primaryOpponentId = remoteParticipantIds[0] ?? null;
  const teammateId = is2vs2 ? remoteParticipantIds[1] ?? null : null;
  const secondaryOpponentId = is2vs2 ? remoteParticipantIds[2] ?? null : null;

  return (
    <>
      <TrackSink sessionId={localSessionId} videoRef={localVideoRef} includeAudio={false} forceMuted />
      <TrackSink sessionId={primaryOpponentId} videoRef={remoteVideoRef} includeAudio />
      {is2vs2 && (
        <>
          <TrackSink sessionId={teammateId} videoRef={otherPerson1VideoRef} includeAudio />
          <TrackSink sessionId={secondaryOpponentId} videoRef={otherPerson2VideoRef} includeAudio />
        </>
      )}
    </>
  );
};

const TrackSink: React.FC<TrackSinkProps> = ({
  sessionId,
  videoRef,
  includeAudio = false,
  forceMuted = false,
}) => {
  const resolvedSessionId = sessionId ?? '';
  const videoTrackState = useMediaTrack(resolvedSessionId, 'video');
  const audioTrackState = useMediaTrack(resolvedSessionId, 'audio');

  useEffect(() => {
    const videoElement = videoRef?.current;
    if (!videoElement) {
      return;
    }

    if (forceMuted && !videoElement.muted) {
      videoElement.muted = true;
    }

    const videoTrack = videoTrackState?.persistentTrack ?? null;
    const audioTrack = includeAudio ? audioTrackState?.persistentTrack ?? null : null;
    const videoPlayable = Boolean(videoTrack) && videoTrackState?.state === 'playable';
    const audioPlayable = includeAudio && Boolean(audioTrack) && audioTrackState?.state === 'playable';

    if (videoPlayable) {
      const currentStream = videoElement.srcObject as MediaStream | null;
      let needsUpdate = true;

      if (currentStream) {
        const currentVideoTrack = currentStream.getVideoTracks()[0] ?? null;
        const currentAudioTrack = currentStream.getAudioTracks()[0] ?? null;
        const videoMatches = currentVideoTrack === videoTrack;
        const audioMatches = (!includeAudio && !currentAudioTrack) || currentAudioTrack === audioTrack;

        needsUpdate = !(videoMatches && audioMatches);
      }

      if (needsUpdate) {
        const stream = new MediaStream();
        stream.addTrack(videoTrack as MediaStreamTrack);
        if (audioPlayable && audioTrack) {
          stream.addTrack(audioTrack as MediaStreamTrack);
        }
        videoElement.srcObject = stream;
      } else if (audioPlayable && audioTrack && currentStream && !currentStream.getAudioTracks().includes(audioTrack as MediaStreamTrack)) {
        currentStream.addTrack(audioTrack as MediaStreamTrack);
      }

      setPlaceholderVisibility(videoElement, true);
      videoElement.style.display = 'block';

      const playPromise = videoElement.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          // Ignore autoplay restrictions; playback will retry on interaction
        });
      }
    } else {
      if (videoElement.srcObject) {
        videoElement.pause();
      }
      videoElement.srcObject = null;
      videoElement.style.display = 'none';
      setPlaceholderVisibility(videoElement, false);
    }

    return () => {
      const element = videoRef?.current;
      if (!element) {
        return;
      }

      if (!videoPlayable) {
        element.srcObject = null;
        element.style.display = 'none';
        setPlaceholderVisibility(element, false);
      }
    };
  }, [
    audioTrackState?.persistentTrack,
    audioTrackState?.state,
    includeAudio,
    forceMuted,
    sessionId,
    videoRef,
    videoTrackState?.persistentTrack,
    videoTrackState?.state,
  ]);

  return null;
};

function setPlaceholderVisibility(videoEl: HTMLVideoElement, showVideo: boolean) {
  const placeholder = videoEl.parentElement?.querySelector('.absolute.inset-0.flex') as HTMLElement | null;
  if (!placeholder) {
    return;
  }
  placeholder.style.display = showVideo ? 'none' : '';
}

export default DailyVideoCall;
