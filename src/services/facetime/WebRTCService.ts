/**
 * WebRTC Service for FaceTime call support on Android.
 *
 * Manages the WebRTC peer connection lifecycle for joining FaceTime calls.
 * Apple's FaceTime Links allow non-Apple devices to join calls via WebRTC
 * in the browser. This service handles:
 *   - Peer connection setup with ICE servers
 *   - Local media stream (camera + microphone) acquisition
 *   - SDP offer/answer exchange
 *   - ICE candidate gathering and exchange
 *   - Media track toggling (mute/unmute, camera on/off)
 *   - Connection state monitoring
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import {
  FaceTimeCallStatus,
  FaceTimeCallState,
  FaceTimeMediaType,
  FaceTimeParticipant,
  FaceTimeError,
  FaceTimeErrorCode,
  MediaConstraints,
  WebRTCConfig,
  CameraPosition,
  SignalingMessage,
} from '../../types/facetime';
import {
  FACETIME_WEBRTC_CONFIG,
  FACETIME_MEDIA_DEFAULTS,
  FACETIME_CALL_TIMEOUT,
  FACETIME_RECONNECT_ATTEMPTS,
  FACETIME_RECONNECT_DELAY,
} from '../../config/constants';

type StateChangeCallback = (state: FaceTimeCallState) => void;

export class WebRTCService {
  private config: WebRTCConfig;
  private mediaConstraints: MediaConstraints;
  private callState: FaceTimeCallState;
  private listeners: Set<StateChangeCallback> = new Set();
  private callTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private callTimerId: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private isDestroyed = false;

  // WebRTC objects (managed by native module on Android)
  private peerConnectionId: string | null = null;
  private localStreamId: string | null = null;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = { ...FACETIME_WEBRTC_CONFIG, ...config };
    this.mediaConstraints = { ...FACETIME_MEDIA_DEFAULTS };
    this.callState = this.getDefaultState();
  }

  private getDefaultState(): FaceTimeCallState {
    return {
      status: FaceTimeCallStatus.Idle,
      mediaType: FaceTimeMediaType.AudioVideo,
      participants: [],
      localParticipant: null,
      isMuted: false,
      isVideoEnabled: true,
      isSpeakerOn: true,
      cameraPosition: CameraPosition.Front,
      callDuration: 0,
      error: null,
    };
  }

  /**
   * Subscribe to call state changes.
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emitState(): void {
    for (const listener of this.listeners) {
      listener({ ...this.callState });
    }
  }

  private updateState(updates: Partial<FaceTimeCallState>): void {
    this.callState = { ...this.callState, ...updates };
    this.emitState();
  }

  /**
   * Join a FaceTime call using the parsed call ID.
   */
  async joinCall(callId: string, displayName: string): Promise<void> {
    if (this.isDestroyed) return;

    this.updateState({
      status: FaceTimeCallStatus.Joining,
      error: null,
    });

    try {
      // Request camera and microphone permissions via native module
      await this.requestMediaPermissions();

      // Create local participant
      const localParticipant: FaceTimeParticipant = {
        id: `local-${Date.now()}`,
        displayName,
        isLocal: true,
        isMuted: false,
        isVideoEnabled: true,
        isSpeaking: false,
      };

      this.updateState({
        localParticipant,
        participants: [localParticipant],
      });

      // Initialize local media stream
      await this.initializeLocalMedia();

      // Create peer connection
      await this.createPeerConnection();

      this.updateState({
        status: FaceTimeCallStatus.Connecting,
      });

      // Set connection timeout
      this.callTimeoutId = setTimeout(() => {
        if (
          this.callState.status === FaceTimeCallStatus.Joining ||
          this.callState.status === FaceTimeCallStatus.Connecting
        ) {
          this.handleError({
            code: FaceTimeErrorCode.Timeout,
            message: 'Connection timed out. The call may no longer be active.',
            recoverable: true,
          });
        }
      }, FACETIME_CALL_TIMEOUT);

      // Initiate WebRTC signaling via the FaceTime web interface
      await this.initiateSignaling(callId);

      // Start call duration timer
      this.startCallTimer();

      this.updateState({
        status: FaceTimeCallStatus.Connected,
      });
    } catch (error) {
      const ftError: FaceTimeError =
        error && typeof error === 'object' && 'code' in error
          ? (error as FaceTimeError)
          : {
              code: FaceTimeErrorCode.ConnectionFailed,
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to join call',
              recoverable: true,
            };

      this.handleError(ftError);
    }
  }

  /**
   * Request camera and microphone permissions.
   */
  private async requestMediaPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule) {
        const granted = await FaceTimeModule.requestMediaPermissions();
        if (!granted) {
          throw {
            code: FaceTimeErrorCode.PermissionDenied,
            message: 'Camera and microphone permissions are required for FaceTime calls',
            recoverable: false,
          } as FaceTimeError;
        }
      }
    }
  }

  /**
   * Initialize local camera and microphone streams.
   */
  private async initializeLocalMedia(): Promise<void> {
    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule) {
        this.localStreamId = await FaceTimeModule.createLocalStream(
          this.mediaConstraints
        );
      }
    }
  }

  /**
   * Create a WebRTC peer connection.
   */
  private async createPeerConnection(): Promise<void> {
    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule) {
        this.peerConnectionId = await FaceTimeModule.createPeerConnection(
          this.config
        );

        // Add local stream to peer connection
        if (this.localStreamId && this.peerConnectionId) {
          await FaceTimeModule.addLocalStream(
            this.peerConnectionId,
            this.localStreamId
          );
        }
      }
    }
  }

  /**
   * Initiate WebRTC signaling for the FaceTime call.
   */
  private async initiateSignaling(callId: string): Promise<void> {
    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule) {
        await FaceTimeModule.joinFaceTimeCall(
          callId,
          this.peerConnectionId
        );
      }
    }
  }

  /**
   * Toggle microphone mute state.
   */
  async toggleMute(): Promise<void> {
    const newMuted = !this.callState.isMuted;

    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule && this.localStreamId) {
        await FaceTimeModule.setAudioEnabled(this.localStreamId, !newMuted);
      }
    }

    this.updateState({
      isMuted: newMuted,
      localParticipant: this.callState.localParticipant
        ? { ...this.callState.localParticipant, isMuted: newMuted }
        : null,
    });
  }

  /**
   * Toggle video on/off.
   */
  async toggleVideo(): Promise<void> {
    const newVideoEnabled = !this.callState.isVideoEnabled;

    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule && this.localStreamId) {
        await FaceTimeModule.setVideoEnabled(
          this.localStreamId,
          newVideoEnabled
        );
      }
    }

    this.updateState({
      isVideoEnabled: newVideoEnabled,
      localParticipant: this.callState.localParticipant
        ? {
            ...this.callState.localParticipant,
            isVideoEnabled: newVideoEnabled,
          }
        : null,
    });
  }

  /**
   * Switch between front and back camera.
   */
  async switchCamera(): Promise<void> {
    const newPosition =
      this.callState.cameraPosition === CameraPosition.Front
        ? CameraPosition.Back
        : CameraPosition.Front;

    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule && this.localStreamId) {
        await FaceTimeModule.switchCamera(this.localStreamId);
      }
    }

    this.updateState({ cameraPosition: newPosition });
  }

  /**
   * Toggle speaker output.
   */
  async toggleSpeaker(): Promise<void> {
    const newSpeaker = !this.callState.isSpeakerOn;

    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule) {
        await FaceTimeModule.setSpeakerEnabled(newSpeaker);
      }
    }

    this.updateState({ isSpeakerOn: newSpeaker });
  }

  /**
   * Handle a remote participant joining.
   */
  handleParticipantJoined(participant: FaceTimeParticipant): void {
    const participants = [...this.callState.participants, participant];
    this.updateState({ participants });
  }

  /**
   * Handle a remote participant leaving.
   */
  handleParticipantLeft(participantId: string): void {
    const participants = this.callState.participants.filter(
      (p) => p.id !== participantId
    );
    this.updateState({ participants });

    // If no remote participants remain, the call is effectively over
    const remoteParticipants = participants.filter((p) => !p.isLocal);
    if (remoteParticipants.length === 0 && this.callState.status === FaceTimeCallStatus.Connected) {
      this.endCall();
    }
  }

  /**
   * Start the call duration timer.
   */
  private startCallTimer(): void {
    this.callTimerId = setInterval(() => {
      this.updateState({
        callDuration: this.callState.callDuration + 1,
      });
    }, 1000);
  }

  /**
   * Handle a connection error with optional retry.
   */
  private async handleError(error: FaceTimeError): Promise<void> {
    if (
      error.recoverable &&
      this.reconnectAttempts < FACETIME_RECONNECT_ATTEMPTS
    ) {
      this.reconnectAttempts++;
      this.updateState({
        status: FaceTimeCallStatus.Reconnecting,
        error,
      });

      await new Promise((resolve) =>
        setTimeout(resolve, FACETIME_RECONNECT_DELAY * this.reconnectAttempts)
      );

      // Retry logic would go here
      return;
    }

    this.updateState({
      status: FaceTimeCallStatus.Failed,
      error,
    });
  }

  /**
   * End the current call and clean up resources.
   */
  async endCall(): Promise<void> {
    // Clear timers
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId);
      this.callTimeoutId = null;
    }
    if (this.callTimerId) {
      clearInterval(this.callTimerId);
      this.callTimerId = null;
    }

    // Clean up native resources
    if (Platform.OS === 'android') {
      const { FaceTimeModule } = NativeModules;
      if (FaceTimeModule) {
        if (this.peerConnectionId) {
          await FaceTimeModule.closePeerConnection(
            this.peerConnectionId
          ).catch(() => {});
          this.peerConnectionId = null;
        }
        if (this.localStreamId) {
          await FaceTimeModule.releaseLocalStream(
            this.localStreamId
          ).catch(() => {});
          this.localStreamId = null;
        }
      }
    }

    this.updateState({
      status: FaceTimeCallStatus.Ended,
      participants: [],
    });

    this.reconnectAttempts = 0;
  }

  /**
   * Get the current call state.
   */
  getState(): FaceTimeCallState {
    return { ...this.callState };
  }

  /**
   * Clean up all resources.
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;
    await this.endCall();
    this.listeners.clear();
  }
}
