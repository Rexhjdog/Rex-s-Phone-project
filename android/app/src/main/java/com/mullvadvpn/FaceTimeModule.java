/**
 * Android native module for FaceTime call support.
 * Handles camera/microphone permissions, WebRTC peer connection management,
 * and media stream control for joining FaceTime calls on Android devices.
 */

package com.mullvadvpn;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.content.Context;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.core.PermissionAwareActivity;
import com.facebook.react.modules.core.PermissionListener;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.annotation.Nonnull;

public class FaceTimeModule extends ReactContextBaseJavaModule implements PermissionListener {

    private static final String MODULE_NAME = "FaceTimeModule";
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 100;

    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
    };

    private Promise permissionPromise;
    private final Map<String, Object> peerConnections = new HashMap<>();
    private final Map<String, Object> localStreams = new HashMap<>();
    private boolean speakerEnabled = true;

    public FaceTimeModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Check if camera and microphone permissions are granted.
     */
    @ReactMethod
    public void checkMediaPermissions(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            boolean cameraGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED;

            boolean audioGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED;

            WritableMap result = Arguments.createMap();
            result.putBoolean("camera", cameraGranted);
            result.putBoolean("microphone", audioGranted);
            result.putBoolean("allGranted", cameraGranted && audioGranted);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage());
        }
    }

    /**
     * Request camera and microphone permissions.
     */
    @ReactMethod
    public void requestMediaPermissions(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            boolean cameraGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED;

            boolean audioGranted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED;

            if (cameraGranted && audioGranted) {
                promise.resolve(true);
                return;
            }

            Activity activity = getCurrentActivity();
            if (activity instanceof PermissionAwareActivity) {
                this.permissionPromise = promise;
                ((PermissionAwareActivity) activity).requestPermissions(
                    REQUIRED_PERMISSIONS,
                    MEDIA_PERMISSION_REQUEST_CODE,
                    this
                );
            } else {
                promise.reject("NO_ACTIVITY", "No current activity for permission request");
            }
        } catch (Exception e) {
            promise.reject("PERMISSION_ERROR", e.getMessage());
        }
    }

    @Override
    public boolean onRequestPermissionsResult(
            int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == MEDIA_PERMISSION_REQUEST_CODE && permissionPromise != null) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            permissionPromise.resolve(allGranted);
            permissionPromise = null;
            return true;
        }
        return false;
    }

    /**
     * Create a local media stream (camera + microphone).
     * Returns a stream ID for reference.
     */
    @ReactMethod
    public void createLocalStream(ReadableMap constraints, Promise promise) {
        try {
            String streamId = UUID.randomUUID().toString();

            // In a full implementation, this would use the WebRTC library
            // (org.webrtc) to create a MediaStream with audio and video tracks
            // based on the provided constraints.
            //
            // Key steps:
            // 1. Initialize PeerConnectionFactory
            // 2. Create AudioSource + AudioTrack
            // 3. Create VideoCapturer (Camera2Capturer for front/back camera)
            // 4. Create VideoSource + VideoTrack
            // 5. Create MediaStream and add tracks
            //
            // For now, we store the stream reference for the JS layer.

            localStreams.put(streamId, new Object());

            emitEvent("onLocalStreamCreated", streamId);
            promise.resolve(streamId);
        } catch (Exception e) {
            promise.reject("STREAM_ERROR", "Failed to create local stream: " + e.getMessage());
        }
    }

    /**
     * Create a WebRTC peer connection.
     * Returns a connection ID for reference.
     */
    @ReactMethod
    public void createPeerConnection(ReadableMap config, Promise promise) {
        try {
            String connectionId = UUID.randomUUID().toString();

            // In a full implementation, this would:
            // 1. Parse ICE servers from config
            // 2. Create RTCConfiguration
            // 3. Create PeerConnection via PeerConnectionFactory
            // 4. Set up ICE candidate and connection state callbacks
            //
            // The PeerConnection handles:
            // - ICE candidate gathering
            // - DTLS handshake
            // - SRTP media encryption
            // - Bandwidth estimation

            peerConnections.put(connectionId, new Object());

            emitEvent("onPeerConnectionCreated", connectionId);
            promise.resolve(connectionId);
        } catch (Exception e) {
            promise.reject("PEER_CONNECTION_ERROR",
                "Failed to create peer connection: " + e.getMessage());
        }
    }

    /**
     * Add a local media stream to a peer connection.
     */
    @ReactMethod
    public void addLocalStream(String connectionId, String streamId, Promise promise) {
        try {
            if (!peerConnections.containsKey(connectionId)) {
                promise.reject("INVALID_CONNECTION", "Peer connection not found");
                return;
            }
            if (!localStreams.containsKey(streamId)) {
                promise.reject("INVALID_STREAM", "Local stream not found");
                return;
            }

            // In a full implementation: peerConnection.addStream(mediaStream)
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ADD_STREAM_ERROR", e.getMessage());
        }
    }

    /**
     * Join a FaceTime call via signaling.
     * This initiates the WebRTC connection to Apple's FaceTime infrastructure.
     */
    @ReactMethod
    public void joinFaceTimeCall(String callId, String connectionId, Promise promise) {
        try {
            if (!peerConnections.containsKey(connectionId)) {
                promise.reject("INVALID_CONNECTION", "Peer connection not found");
                return;
            }

            // In a full implementation, this would:
            // 1. Connect to Apple's FaceTime signaling endpoint via WebSocket
            // 2. Send a join request with the call ID
            // 3. Receive the SDP offer from the FaceTime host
            // 4. Set remote description (offer)
            // 5. Create and set local description (answer)
            // 6. Send the answer back via signaling
            // 7. Exchange ICE candidates
            //
            // The FaceTime web flow uses standard WebRTC with Apple's
            // custom signaling server at facetime.apple.com

            emitEvent("onCallJoining", callId);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("JOIN_ERROR", "Failed to join FaceTime call: " + e.getMessage());
        }
    }

    /**
     * Enable or disable the audio track on a local stream.
     */
    @ReactMethod
    public void setAudioEnabled(String streamId, boolean enabled, Promise promise) {
        try {
            if (!localStreams.containsKey(streamId)) {
                promise.reject("INVALID_STREAM", "Local stream not found");
                return;
            }
            // In a full implementation: audioTrack.setEnabled(enabled)
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("AUDIO_ERROR", e.getMessage());
        }
    }

    /**
     * Enable or disable the video track on a local stream.
     */
    @ReactMethod
    public void setVideoEnabled(String streamId, boolean enabled, Promise promise) {
        try {
            if (!localStreams.containsKey(streamId)) {
                promise.reject("INVALID_STREAM", "Local stream not found");
                return;
            }
            // In a full implementation: videoTrack.setEnabled(enabled)
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("VIDEO_ERROR", e.getMessage());
        }
    }

    /**
     * Switch between front and back camera.
     */
    @ReactMethod
    public void switchCamera(String streamId, Promise promise) {
        try {
            if (!localStreams.containsKey(streamId)) {
                promise.reject("INVALID_STREAM", "Local stream not found");
                return;
            }
            // In a full implementation: cameraCapturer.switchCamera()
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CAMERA_ERROR", e.getMessage());
        }
    }

    /**
     * Toggle speaker output.
     */
    @ReactMethod
    public void setSpeakerEnabled(boolean enabled, Promise promise) {
        try {
            AudioManager audioManager = (AudioManager) getReactApplicationContext()
                .getSystemService(Context.AUDIO_SERVICE);

            if (audioManager != null) {
                audioManager.setSpeakerphoneOn(enabled);
                this.speakerEnabled = enabled;
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SPEAKER_ERROR", e.getMessage());
        }
    }

    /**
     * Close a peer connection and release its resources.
     */
    @ReactMethod
    public void closePeerConnection(String connectionId, Promise promise) {
        try {
            Object connection = peerConnections.remove(connectionId);
            if (connection != null) {
                // In a full implementation: peerConnection.close()
                // peerConnection.dispose()
            }
            emitEvent("onPeerConnectionClosed", connectionId);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CLOSE_ERROR", e.getMessage());
        }
    }

    /**
     * Release a local media stream.
     */
    @ReactMethod
    public void releaseLocalStream(String streamId, Promise promise) {
        try {
            Object stream = localStreams.remove(streamId);
            if (stream != null) {
                // In a full implementation:
                // mediaStream.audioTracks.forEach(track -> track.dispose())
                // mediaStream.videoTracks.forEach(track -> track.dispose())
                // mediaStream.dispose()
                // videoCapturer.stopCapture()
                // videoCapturer.dispose()
            }
            emitEvent("onLocalStreamReleased", streamId);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("RELEASE_ERROR", e.getMessage());
        }
    }

    /**
     * Get the current media state (for debugging).
     */
    @ReactMethod
    public void getMediaState(Promise promise) {
        WritableMap state = Arguments.createMap();
        state.putInt("activePeerConnections", peerConnections.size());
        state.putInt("activeLocalStreams", localStreams.size());
        state.putBoolean("speakerEnabled", speakerEnabled);
        promise.resolve(state);
    }

    /**
     * Emit an event to the JavaScript layer.
     */
    private void emitEvent(String eventName, String data) {
        WritableMap params = Arguments.createMap();
        params.putString("data", data);

        getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}
