/**
 * Tests for WebRTCService.
 * Validates call state management, media toggling, and lifecycle.
 */

import { WebRTCService } from '../../src/services/facetime/WebRTCService';
import { FaceTimeCallStatus, CameraPosition } from '../../src/types/facetime';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    FaceTimeModule: {
      requestMediaPermissions: jest.fn().mockResolvedValue(true),
      createLocalStream: jest.fn().mockResolvedValue('mock-stream-id'),
      createPeerConnection: jest.fn().mockResolvedValue('mock-connection-id'),
      addLocalStream: jest.fn().mockResolvedValue(true),
      joinFaceTimeCall: jest.fn().mockResolvedValue(true),
      setAudioEnabled: jest.fn().mockResolvedValue(true),
      setVideoEnabled: jest.fn().mockResolvedValue(true),
      switchCamera: jest.fn().mockResolvedValue(true),
      setSpeakerEnabled: jest.fn().mockResolvedValue(true),
      closePeerConnection: jest.fn().mockResolvedValue(true),
      releaseLocalStream: jest.fn().mockResolvedValue(true),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

describe('WebRTCService', () => {
  let service: WebRTCService;

  beforeEach(() => {
    service = new WebRTCService();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await service.destroy();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with Idle status', () => {
      const state = service.getState();
      expect(state.status).toBe(FaceTimeCallStatus.Idle);
    });

    it('should start with video enabled', () => {
      const state = service.getState();
      expect(state.isVideoEnabled).toBe(true);
    });

    it('should start unmuted', () => {
      const state = service.getState();
      expect(state.isMuted).toBe(false);
    });

    it('should start with front camera', () => {
      const state = service.getState();
      expect(state.cameraPosition).toBe(CameraPosition.Front);
    });

    it('should start with speaker on', () => {
      const state = service.getState();
      expect(state.isSpeakerOn).toBe(true);
    });

    it('should start with no participants', () => {
      const state = service.getState();
      expect(state.participants).toEqual([]);
    });

    it('should start with no error', () => {
      const state = service.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('state change subscription', () => {
    it('should notify listeners on state changes', async () => {
      const callback = jest.fn();
      service.onStateChange(callback);

      await service.joinCall('test-call-id', 'Test User');

      expect(callback).toHaveBeenCalled();
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall.status).toBe(FaceTimeCallStatus.Connected);
    });

    it('should allow unsubscribing', () => {
      const callback = jest.fn();
      const unsubscribe = service.onStateChange(callback);
      unsubscribe();

      // State changes after unsubscribe should not trigger callback
      service.toggleMute();
      // The callback count should not increase after unsubscribe
    });
  });

  describe('joinCall', () => {
    it('should transition through Joining -> Connecting -> Connected', async () => {
      const states: FaceTimeCallStatus[] = [];
      service.onStateChange((state) => {
        states.push(state.status);
      });

      await service.joinCall('test-call', 'Test User');

      expect(states).toContain(FaceTimeCallStatus.Joining);
      expect(states).toContain(FaceTimeCallStatus.Connecting);
      expect(states).toContain(FaceTimeCallStatus.Connected);
    });

    it('should create a local participant', async () => {
      await service.joinCall('test-call', 'Test User');

      const state = service.getState();
      expect(state.localParticipant).toBeTruthy();
      expect(state.localParticipant?.displayName).toBe('Test User');
      expect(state.localParticipant?.isLocal).toBe(true);
    });
  });

  describe('media controls', () => {
    beforeEach(async () => {
      await service.joinCall('test-call', 'Test User');
    });

    it('should toggle mute state', async () => {
      expect(service.getState().isMuted).toBe(false);
      await service.toggleMute();
      expect(service.getState().isMuted).toBe(true);
      await service.toggleMute();
      expect(service.getState().isMuted).toBe(false);
    });

    it('should toggle video state', async () => {
      expect(service.getState().isVideoEnabled).toBe(true);
      await service.toggleVideo();
      expect(service.getState().isVideoEnabled).toBe(false);
      await service.toggleVideo();
      expect(service.getState().isVideoEnabled).toBe(true);
    });

    it('should switch camera position', async () => {
      expect(service.getState().cameraPosition).toBe(CameraPosition.Front);
      await service.switchCamera();
      expect(service.getState().cameraPosition).toBe(CameraPosition.Back);
      await service.switchCamera();
      expect(service.getState().cameraPosition).toBe(CameraPosition.Front);
    });

    it('should toggle speaker', async () => {
      expect(service.getState().isSpeakerOn).toBe(true);
      await service.toggleSpeaker();
      expect(service.getState().isSpeakerOn).toBe(false);
    });
  });

  describe('participant management', () => {
    beforeEach(async () => {
      await service.joinCall('test-call', 'Test User');
    });

    it('should add a remote participant', () => {
      service.handleParticipantJoined({
        id: 'remote-1',
        displayName: 'Remote User',
        isLocal: false,
        isMuted: false,
        isVideoEnabled: true,
        isSpeaking: false,
      });

      const state = service.getState();
      expect(state.participants.length).toBe(2); // local + remote
      expect(state.participants.find((p) => p.id === 'remote-1')).toBeTruthy();
    });

    it('should remove a participant', () => {
      service.handleParticipantJoined({
        id: 'remote-1',
        displayName: 'Remote User',
        isLocal: false,
        isMuted: false,
        isVideoEnabled: true,
        isSpeaking: false,
      });

      service.handleParticipantLeft('remote-1');

      const state = service.getState();
      expect(state.participants.find((p) => p.id === 'remote-1')).toBeUndefined();
    });
  });

  describe('endCall', () => {
    it('should transition to Ended status', async () => {
      await service.joinCall('test-call', 'Test User');
      await service.endCall();

      const state = service.getState();
      expect(state.status).toBe(FaceTimeCallStatus.Ended);
    });

    it('should clear participants', async () => {
      await service.joinCall('test-call', 'Test User');
      await service.endCall();

      const state = service.getState();
      expect(state.participants).toEqual([]);
    });
  });

  describe('destroy', () => {
    it('should end the call and clean up', async () => {
      await service.joinCall('test-call', 'Test User');
      await service.destroy();

      const state = service.getState();
      expect(state.status).toBe(FaceTimeCallStatus.Ended);
    });
  });
});
