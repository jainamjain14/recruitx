import React, { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const MeetingRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const isModerator = user?.role === 'recruiter' || user?.role === 'admin';
  const displayName = searchParams.get('name') || user?.name || 'Participant';
  const email = searchParams.get('email') || user?.email || '';

  useEffect(() => {
    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => initJitsi();
        document.head.appendChild(script);
      } else {
        initJitsi();
      }
    };

    const initJitsi = () => {
      if (!jitsiContainerRef.current || !roomCode) return;

      // Destroy previous instance if any
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }

      const options = {
        roomName: `recruitx-${roomCode}`,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName,
          email,
        },
        configOverwrite: {
          // Disable lobby / waiting room entirely
          lobby: {
            autoKnock: false,
            enableChat: false,
          },
          prejoinConfig: {
            enabled: false,         // skip the pre-join screen
          },
          // Start as moderator without needing to log in
          enableNoisyMicDetection: false,
          disableModeratorIndicator: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // Hide invite, allow everyone to start meeting
          disableInviteFunctions: false,
          enableInsecureRoomNameWarning: false,
          requireDisplayName: false,
          // Recruiter is treated as moderator
          ...(isModerator
            ? {
                moderatedRoomServiceUrl: undefined,
                disableRemoteMute: false,
              }
            : {}),
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'chat',
            'raisehand',
            'videoquality',
            'filmstrip',
            'tileview',
            'settings',
          ],
        },
      };

      jitsiApiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', options);

      // When recruiter joins, grant moderator
      jitsiApiRef.current.addEventListener('videoConferenceJoined', () => {
        if (isModerator) {
          // Tell Jitsi this participant is the host
          jitsiApiRef.current.executeCommand('toggleLobby', false);
        }
      });

      jitsiApiRef.current.addEventListener('readyToClose', () => {
        navigate(-1);
      });
    };

    loadJitsi();

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [roomCode, displayName, email, isModerator, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">RecruitX Interview Room</span>
          <span className="text-neutral-400 text-xs">· {roomCode}</span>
          {isModerator && (
            <span className="bg-blue-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              HOST
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-neutral-400 hover:text-white text-xs transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* Jitsi embed */}
      <div ref={jitsiContainerRef} className="flex-1 w-full" />
    </div>
  );
};
