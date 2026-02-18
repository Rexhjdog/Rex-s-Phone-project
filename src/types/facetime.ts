/**
 * FaceTime types for Android FaceTime link support.
 * Enables Android devices to join FaceTime calls via Apple's
 * FaceTime Links (facetime.apple.com) using WebRTC.
 */

export enum FaceTimeCallStatus {
  Idle = 'idle',
  Joining = 'joining',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Ended = 'ended',
  Failed = 'failed',
}

export enum FaceTimeMediaType {
  Audio = 'audio',
  Video = 'video',
  AudioVideo = 'audio_video',
}

export enum CameraPosition {
  Front = 'front',
  Back = 'back',
}

export interface FaceTimeLinkInfo {
  /** The original FaceTime link URL */
  url: string;
  /** Extracted call ID from the link */
  callId: string;
  /** Whether the link is valid */
  isValid: boolean;
  /** The host who created the link (if available) */
  host?: string;
}

export interface FaceTimeParticipant {
  id: string;
  displayName: string;
  isLocal: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
}

export interface FaceTimeCallState {
  status: FaceTimeCallStatus;
  mediaType: FaceTimeMediaType;
  participants: FaceTimeParticipant[];
  localParticipant: FaceTimeParticipant | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  cameraPosition: CameraPosition;
  callDuration: number;
  error: FaceTimeError | null;
}

export interface FaceTimeError {
  code: FaceTimeErrorCode;
  message: string;
  recoverable: boolean;
}

export enum FaceTimeErrorCode {
  InvalidLink = 'INVALID_LINK',
  ConnectionFailed = 'CONNECTION_FAILED',
  PermissionDenied = 'PERMISSION_DENIED',
  CameraUnavailable = 'CAMERA_UNAVAILABLE',
  MicrophoneUnavailable = 'MICROPHONE_UNAVAILABLE',
  NetworkError = 'NETWORK_ERROR',
  CallEnded = 'CALL_ENDED',
  CallFull = 'CALL_FULL',
  Timeout = 'TIMEOUT',
  WebRTCError = 'WEBRTC_ERROR',
}

export interface MediaConstraints {
  audio: {
    enabled: boolean;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
  video: {
    enabled: boolean;
    width: number;
    height: number;
    frameRate: number;
    facingMode: 'user' | 'environment';
  };
}

export interface WebRTCConfig {
  iceServers: IceServer[];
  iceTransportPolicy: 'all' | 'relay';
  bundlePolicy: 'balanced' | 'max-bundle';
  sdpSemantics: 'unified-plan';
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'leave' | 'join';
  payload: any;
  senderId: string;
  timestamp: number;
}
