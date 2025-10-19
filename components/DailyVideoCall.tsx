'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall, DailyParticipant, DailyParticipantsObject } from '@daily-co/daily-js';

function setPlaceholderVisibility(videoEl: HTMLVideoElement, showVideo: boolean) {
  const placeholder = videoEl.parentElement?.querySelector('.absolute.inset-0.flex') as HTMLElement | null;
  if (!placeholder) {
    return;
  }
  placeholder.style.display = showVideo ? 'none' : '';
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
  participantSlotResolver?: (participant: DailyParticipant) => number | null | undefined;
  selfUserData?: Record<string, unknown> | null;
  selfUserName?: string | null;
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
  participantSlotResolver,
  selfUserData,
  selfUserName,
}) => {
  const localVideoRef = propLocalVideoRef ?? useRef<HTMLVideoElement>(null);
  const remoteVideoRef = propRemoteVideoRef ?? useRef<HTMLVideoElement>(null);
  const otherPerson1VideoRef = propOtherPerson1VideoRef ?? useRef<HTMLVideoElement>(null);
  const otherPerson2VideoRef = propOtherPerson2VideoRef ?? useRef<HTMLVideoElement>(null);

  const callObjectRef = useRef<DailyCall | null>(null);
  const remoteSlotAssignmentsRef = useRef<Map<string, number>>(new Map());
  const participantSlotResolverRef = useRef<DailyVideoCallProps['participantSlotResolver']>(undefined);
  const metadataSignatureRef = useRef<string>('');
  const [, forceRender] = useState(0);

  const detachVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) {
      return;
    }
    if (videoElement.srcObject instanceof MediaStream) {
      videoElement.pause();
    }
    videoElement.srcObject = null;
    videoElement.style.display = 'none';
    setPlaceholderVisibility(videoElement, false);
  }, []);

  const attachTracks = useCallback(
    (
      videoElement: HTMLVideoElement | null,
      participant: DailyParticipant | undefined,
      includeAudio: boolean,
      forceMuted: boolean,
    ) => {
      if (!videoElement) {
        return;
      }

      if (forceMuted && !videoElement.muted) {
        videoElement.muted = true;
      }

      const videoTrack = participant?.tracks?.video?.persistentTrack ?? null;
      const audioTrack = includeAudio ? participant?.tracks?.audio?.persistentTrack ?? null : null;
      const videoPlayable = participant?.tracks?.video?.state === 'playable' && Boolean(videoTrack);
      const audioPlayable = includeAudio && participant?.tracks?.audio?.state === 'playable' && Boolean(audioTrack);

      if (videoPlayable && videoTrack) {
        const currentVideoTrack = videoTrack as MediaStreamTrack;
        const currentAudioTrack = audioPlayable && audioTrack ? (audioTrack as MediaStreamTrack) : null;
        const existingStream = videoElement.srcObject instanceof MediaStream ? videoElement.srcObject : null;
        const existingVideoTrack = existingStream?.getVideoTracks()[0] ?? null;
        const existingAudioTrack = existingStream?.getAudioTracks()[0] ?? null;

        if (
          existingStream &&
          existingVideoTrack === currentVideoTrack &&
          (!currentAudioTrack || existingAudioTrack === currentAudioTrack)
        ) {
          videoElement.style.display = 'block';
          setPlaceholderVisibility(videoElement, true);
          if (videoElement.paused) {
            const resumePromise = videoElement.play();
            resumePromise?.catch(() => {
              // Autoplay restrictions – playback will resume after user interaction.
            });
          }
          return;
        }

        const stream = new MediaStream();
        stream.addTrack(currentVideoTrack);
        if (currentAudioTrack) {
          stream.addTrack(currentAudioTrack);
        }
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';
        setPlaceholderVisibility(videoElement, true);
        const playPromise = videoElement.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            // Autoplay restrictions – will resolve on user interaction.
          });
        }
      } else {
        detachVideo(videoElement);
      }
    },
    [detachVideo],
  );

  const syncParticipants = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      return;
    }

    const participants: DailyParticipantsObject = callObject.participants();
    const localParticipant = participants?.local;

    attachTracks(localVideoRef.current, localParticipant, false, true);

    const localSessionId = localParticipant?.session_id;
    const parseJoinedAt = (value: DailyParticipant['joined_at']) => {
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (value instanceof Date) {
        return value.getTime();
      }
      return 0;
    };

    const remoteParticipants = Object.values(participants)
      .filter(
        (participant): participant is DailyParticipant =>
          Boolean(
            participant &&
              participant.session_id &&
              participant.session_id !== localSessionId &&
              ((participant as unknown as { owner?: string }).owner ?? 'participant') !== 'screen',
          ),
      )
      .sort((a, b) => {
        const joinedA = parseJoinedAt(a.joined_at);
        const joinedB = parseJoinedAt(b.joined_at);
        if (joinedA !== joinedB) {
          return joinedA - joinedB;
        }
        return (a.session_id ?? '').localeCompare(b.session_id ?? '');
      });

    const targetRefs = is2vs2
      ? [remoteVideoRef, otherPerson1VideoRef, otherPerson2VideoRef]
      : [remoteVideoRef];

    const resolver = participantSlotResolverRef.current;
    const previousAssignments = remoteSlotAssignmentsRef.current;
    const slotTotal = targetRefs.length;
    const availableSlots = new Set<number>(Array.from({ length: slotTotal }, (_, index) => index));
    const newAssignments = new Map<string, number>();

    const desiredPairs: Array<{ sessionId: string; slot: number }> = [];
    remoteParticipants.forEach((participant) => {
      const sessionId = participant.session_id;
      if (!sessionId) {
        return;
      }
  const desiredSlot = resolver ? resolver(participant) : null;
      if (typeof desiredSlot === 'number' && desiredSlot >= 0 && desiredSlot < slotTotal) {
        desiredPairs.push({ sessionId, slot: desiredSlot });
      }
    });

    desiredPairs.forEach(({ sessionId, slot }) => {
      if (!availableSlots.has(slot)) {
        return;
      }
      newAssignments.set(sessionId, slot);
      availableSlots.delete(slot);
    });

    remoteParticipants.forEach((participant) => {
      const sessionId = participant.session_id;
      if (!sessionId || newAssignments.has(sessionId)) {
        return;
      }
      const previousSlot = previousAssignments.get(sessionId);
      if (typeof previousSlot === 'number' && availableSlots.has(previousSlot)) {
        newAssignments.set(sessionId, previousSlot);
        availableSlots.delete(previousSlot);
        return;
      }
      const iterator = availableSlots.values().next();
      if (!iterator.done) {
        const slot = iterator.value;
        newAssignments.set(sessionId, slot);
        availableSlots.delete(slot);
      }
    });

    remoteSlotAssignmentsRef.current = newAssignments;

    const participantsBySlot: Array<DailyParticipant | undefined> = Array(slotTotal).fill(undefined);
    const participantBySession = new Map<string, DailyParticipant>();
    remoteParticipants.forEach((participant) => {
      const sessionId = participant.session_id;
      if (sessionId) {
        participantBySession.set(sessionId, participant);
      }
    });

    newAssignments.forEach((slot, sessionId) => {
      const participant = participantBySession.get(sessionId);
      if (participant) {
        participantsBySlot[slot] = participant;
      }
    });

    targetRefs.forEach((ref, index) => {
      const participant = participantsBySlot[index];
      if (participant) {
        attachTracks(ref.current, participant, true, false);
      } else {
        detachVideo(ref.current);
      }
    });

    if (!is2vs2) {
      detachVideo(otherPerson1VideoRef.current);
      detachVideo(otherPerson2VideoRef.current);
    }
  }, [attachTracks, detachVideo, is2vs2, localVideoRef, otherPerson1VideoRef, otherPerson2VideoRef, remoteVideoRef]);

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
      remoteSlotAssignmentsRef.current.clear();
      detachVideo(localVideoRef.current);
      detachVideo(remoteVideoRef.current);
      detachVideo(otherPerson1VideoRef.current);
      detachVideo(otherPerson2VideoRef.current);
      existing?.destroy();
    };
  }, [detachVideo, localVideoRef, otherPerson1VideoRef, otherPerson2VideoRef, remoteVideoRef]);

  useEffect(() => {
    participantSlotResolverRef.current = participantSlotResolver;
  }, [participantSlotResolver]);

  useEffect(() => {
    const instance = callObjectRef.current;
    if (!instance) {
      return;
    }

    const signature = JSON.stringify({ name: selfUserName ?? null, data: selfUserData ?? null });
    if (metadataSignatureRef.current === signature) {
      return;
    }
    metadataSignatureRef.current = signature;

    let cancelled = false;
    const applyMetadata = async () => {
      try {
        if (selfUserName && selfUserName.length > 0) {
          await instance.setUserName(selfUserName);
        }
        if (selfUserData) {
          await instance.setUserData(selfUserData);
        }
      } catch (error) {
        console.error('[DailyVideoCall] Failed to apply user metadata', error);
      }

      if (!cancelled) {
        syncParticipants();
      }
    };

    void applyMetadata();

    return () => {
      cancelled = true;
    };
  }, [selfUserData, selfUserName, syncParticipants]);

  useEffect(() => {
    const instance = callObjectRef.current;
    if (!instance || !roomUrl) {
      return;
    }

    let disposed = false;
    const events: Array<[Parameters<DailyCall['on']>[0], Parameters<DailyCall['on']>[1]]> = [
      ['joined-meeting', syncParticipants],
      ['participant-joined', syncParticipants],
      ['participant-updated', syncParticipants],
      ['participant-left', syncParticipants],
      ['track-started', syncParticipants],
      ['track-stopped', syncParticipants],
    ];

    events.forEach(([event, handler]) => {
      instance.on(event, handler);
    });

    const joinCall = async () => {
      const state = instance.meetingState();
      const alreadyJoining = state === 'joining-meeting';
      const alreadyJoined = state === 'joined-meeting';
      if (alreadyJoining || alreadyJoined) {
        syncParticipants();
        return;
      }

      try {
        await instance.join({ url: roomUrl });
        syncParticipants();
      } catch (error) {
        console.error('[DailyVideoCall] Failed to join room', error);
      }
    };

    void joinCall();

    return () => {
      disposed = true;
      const leaveCall = async () => {
        try {
          if (instance.meetingState() !== 'left-meeting') {
            await instance.leave();
          }
        } catch (error: unknown) {
          console.error('[DailyVideoCall] Failed to leave room', error);
        }
      };

      void leaveCall();

      events.forEach(([event, handler]) => {
        instance.off(event, handler);
      });
    };
  }, [roomUrl, syncParticipants]);

  useEffect(() => {
    const instance = callObjectRef.current;
    if (!instance) {
      return;
    }
    try {
      if (instance.localVideo() !== camOn) {
        instance.setLocalVideo(camOn);
        syncParticipants();
      }
    } catch (error: unknown) {
      console.error('[DailyVideoCall] Failed to set local video state', error);
    }
  }, [camOn, syncParticipants]);

  useEffect(() => {
    const instance = callObjectRef.current;
    if (!instance) {
      return;
    }
    try {
      if (instance.localAudio() !== micOn) {
        instance.setLocalAudio(micOn);
      }
    } catch (error: unknown) {
      console.error('[DailyVideoCall] Failed to set local audio state', error);
    }
  }, [micOn]);

  return null;
};

export default DailyVideoCall;
