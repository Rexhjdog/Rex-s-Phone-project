/**
 * FaceTime Call Screen for Android.
 * Provides the UI for joining and participating in FaceTime calls
 * via Apple's FaceTime Links using WebRTC.
 *
 * Features:
 * - Link input / paste for joining calls
 * - Video preview (local + remote participants)
 * - Call controls (mute, camera toggle, speaker, camera flip, end call)
 * - Participant list
 * - Call duration display
 * - Connection status indicators
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import {
  FaceTimeCallStatus,
  FaceTimeCallState,
  CameraPosition,
} from '../types/facetime';
import { FaceTimeLinkHandler } from '../services/facetime/FaceTimeLinkHandler';
import { WebRTCService } from '../services/facetime/WebRTCService';

interface FaceTimeScreenProps {
  onBack: () => void;
  initialLink?: string;
}

export const FaceTimeScreen: React.FC<FaceTimeScreenProps> = ({
  onBack,
  initialLink,
}) => {
  const [linkInput, setLinkInput] = useState(initialLink || '');
  const [displayName, setDisplayName] = useState('');
  const [callState, setCallState] = useState<FaceTimeCallState | null>(null);
  const webrtcService = useRef<WebRTCService | null>(null);

  useEffect(() => {
    webrtcService.current = new WebRTCService();
    const unsubscribe = webrtcService.current.onStateChange(setCallState);

    return () => {
      unsubscribe();
      webrtcService.current?.destroy();
    };
  }, []);

  const handleJoinCall = useCallback(async () => {
    if (!linkInput.trim()) {
      Alert.alert('Missing Link', 'Please paste a FaceTime link to join a call.');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Missing Name', 'Please enter your name before joining.');
      return;
    }

    const linkInfo = FaceTimeLinkHandler.parseLink(linkInput);

    if (!linkInfo.isValid) {
      Alert.alert(
        'Invalid Link',
        'This does not appear to be a valid FaceTime link. Please check and try again.'
      );
      return;
    }

    await webrtcService.current?.joinCall(linkInfo.callId, displayName.trim());
  }, [linkInput, displayName]);

  const handleOpenInBrowser = useCallback(async () => {
    if (!linkInput.trim()) {
      Alert.alert('Missing Link', 'Please paste a FaceTime link first.');
      return;
    }

    try {
      await FaceTimeLinkHandler.openInBrowser(linkInput);
    } catch {
      Alert.alert('Error', 'Could not open the link in your browser.');
    }
  }, [linkInput]);

  const handlePasteLink = useCallback(async () => {
    try {
      const text = await Clipboard.getString();
      if (text && FaceTimeLinkHandler.isFaceTimeLink(text)) {
        setLinkInput(text);
      } else if (text) {
        setLinkInput(text);
      }
    } catch {
      // Clipboard access denied
    }
  }, []);

  const handleEndCall = useCallback(async () => {
    await webrtcService.current?.endCall();
  }, []);

  const handleToggleMute = useCallback(async () => {
    await webrtcService.current?.toggleMute();
  }, []);

  const handleToggleVideo = useCallback(async () => {
    await webrtcService.current?.toggleVideo();
  }, []);

  const handleSwitchCamera = useCallback(async () => {
    await webrtcService.current?.switchCamera();
  }, []);

  const handleToggleSpeaker = useCallback(async () => {
    await webrtcService.current?.toggleSpeaker();
  }, []);

  const isInCall =
    callState?.status === FaceTimeCallStatus.Connected ||
    callState?.status === FaceTimeCallStatus.Connecting ||
    callState?.status === FaceTimeCallStatus.Reconnecting;

  const isJoining = callState?.status === FaceTimeCallStatus.Joining;

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── In-call UI ─────────────────────────────────────────────
  if (isInCall || isJoining) {
    return (
      <SafeAreaView style={styles.callContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Remote video area */}
        <View style={styles.remoteVideoArea}>
          {callState?.status === FaceTimeCallStatus.Connecting && (
            <View style={styles.connectingOverlay}>
              <Text style={styles.connectingText}>Connecting...</Text>
              <Text style={styles.connectingSubtext}>
                Waiting for the host to let you in
              </Text>
            </View>
          )}

          {callState?.status === FaceTimeCallStatus.Reconnecting && (
            <View style={styles.connectingOverlay}>
              <Text style={styles.connectingText}>Reconnecting...</Text>
            </View>
          )}

          {callState?.status === FaceTimeCallStatus.Connected && (
            <View style={styles.connectedOverlay}>
              {callState.participants
                .filter((p) => !p.isLocal)
                .map((participant) => (
                  <View key={participant.id} style={styles.participantTile}>
                    <Text style={styles.participantName}>
                      {participant.displayName}
                    </Text>
                    {participant.isMuted && (
                      <Text style={styles.mutedBadge}>Muted</Text>
                    )}
                  </View>
                ))}

              {callState.participants.filter((p) => !p.isLocal).length ===
                0 && (
                <Text style={styles.waitingText}>
                  Waiting for others to join...
                </Text>
              )}
            </View>
          )}

          {isJoining && (
            <View style={styles.connectingOverlay}>
              <Text style={styles.connectingText}>Joining call...</Text>
              <Text style={styles.connectingSubtext}>
                Setting up camera and microphone
              </Text>
            </View>
          )}
        </View>

        {/* Local video preview (picture-in-picture) */}
        {callState?.isVideoEnabled && (
          <View style={styles.localVideoPreview}>
            <Text style={styles.localVideoPlaceholder}>You</Text>
          </View>
        )}

        {/* Call info bar */}
        <View style={styles.callInfoBar}>
          {callState?.status === FaceTimeCallStatus.Connected && (
            <Text style={styles.callDuration}>
              {formatDuration(callState.callDuration)}
            </Text>
          )}
          <Text style={styles.participantCount}>
            {callState?.participants.length || 0} participant
            {(callState?.participants.length || 0) !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Call controls */}
        <View style={styles.callControls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              callState?.isMuted && styles.controlButtonActive,
            ]}
            onPress={handleToggleMute}
          >
            <Text style={styles.controlIcon}>
              {callState?.isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              !callState?.isVideoEnabled && styles.controlButtonActive,
            ]}
            onPress={handleToggleVideo}
          >
            <Text style={styles.controlIcon}>
              {callState?.isVideoEnabled ? 'Cam Off' : 'Cam On'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSwitchCamera}
          >
            <Text style={styles.controlIcon}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              callState?.isSpeakerOn && styles.controlButtonActive,
            ]}
            onPress={handleToggleSpeaker}
          >
            <Text style={styles.controlIcon}>
              {callState?.isSpeakerOn ? 'Speaker' : 'Earpiece'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Text style={styles.endCallIcon}>End</Text>
          </TouchableOpacity>
        </View>

        {/* Error display */}
        {callState?.error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{callState.error.message}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ─── Call ended UI ──────────────────────────────────────────
  if (callState?.status === FaceTimeCallStatus.Ended) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDark} />
        <View style={styles.endedContainer}>
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.endedDuration}>
            Duration: {formatDuration(callState.callDuration)}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setCallState(null);
            }}
          >
            <Text style={styles.primaryButtonText}>New Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error UI ───────────────────────────────────────────────
  if (callState?.status === FaceTimeCallStatus.Failed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDark} />
        <View style={styles.endedContainer}>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorDescription}>
            {callState.error?.message || 'Could not connect to the FaceTime call.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCallState(null)}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleOpenInBrowser}
          >
            <Text style={styles.secondaryButtonText}>Open in Browser Instead</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Join call UI (default) ─────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FaceTime</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Join a FaceTime Call</Text>
          <Text style={styles.heroSubtitle}>
            Paste a FaceTime link from an iPhone or iPad user to join their call
            on your Android device.
          </Text>
        </View>

        {/* Name input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Link input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>FACETIME LINK</Text>
          <View style={styles.linkInputRow}>
            <TextInput
              style={[styles.textInput, styles.linkInput]}
              value={linkInput}
              onChangeText={setLinkInput}
              placeholder="https://facetime.apple.com/join/..."
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleJoinCall}
            />
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePasteLink}
            >
              <Text style={styles.pasteButtonText}>Paste</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Join buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!linkInput.trim() || !displayName.trim()) &&
                styles.primaryButtonDisabled,
            ]}
            onPress={handleJoinCall}
            disabled={!linkInput.trim() || !displayName.trim()}
          >
            <Text style={styles.primaryButtonText}>Join with Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleOpenInBrowser}
            disabled={!linkInput.trim()}
          >
            <Text style={styles.secondaryButtonText}>
              Open in Browser Instead
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            FaceTime links work across Apple and Android devices. The call host
            must approve your request to join.
          </Text>
          {Platform.OS === 'android' && (
            <Text style={styles.infoTextSecondary}>
              Note: On Android, FaceTime calls use your device's web browser via
              WebRTC. Camera and microphone permissions are required.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundDark,
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  backText: {
    ...Typography.body,
    color: Colors.green,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.lg,
  },
  heroSection: {
    marginBottom: Spacing.xl,
  },
  heroTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  linkInput: {
    flex: 1,
  },
  pasteButton: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  pasteButtonText: {
    ...Typography.buttonSmall,
    color: Colors.green,
  },
  buttonSection: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.green,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.buttonPadding,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.buttonPadding,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  infoSection: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  infoTextSecondary: {
    ...Typography.caption,
    color: Colors.textDisabled,
  },

  // ─── In-call styles ──────────────────────────────────────────
  callContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingOverlay: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  connectingText: {
    ...Typography.h2,
    color: Colors.white,
  },
  connectingSubtext: {
    ...Typography.body,
    color: Colors.whiteAlpha60,
  },
  connectedOverlay: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  participantTile: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
    minWidth: 150,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  participantName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  mutedBadge: {
    ...Typography.caption,
    color: Colors.red,
  },
  waitingText: {
    ...Typography.body,
    color: Colors.whiteAlpha60,
  },
  localVideoPreview: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.whiteAlpha20,
  },
  localVideoPlaceholder: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  callInfoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  callDuration: {
    ...Typography.mono,
    color: Colors.white,
  },
  participantCount: {
    ...Typography.caption,
    color: Colors.whiteAlpha60,
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: Colors.white,
  },
  controlIcon: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  endCallButton: {
    backgroundColor: Colors.red,
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  endCallIcon: {
    ...Typography.buttonSmall,
    color: Colors.white,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: Colors.red,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.white,
  },

  // ─── Call ended styles ───────────────────────────────────────
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },
  endedTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  endedDuration: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    ...Typography.h2,
    color: Colors.red,
  },
  errorDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
