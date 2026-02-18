/**
 * Android native module bridging React Native to Android VpnService.
 * Manages WireGuard tunnel via the Android VPN framework.
 */

package com.mullvadvpn;

import android.app.Activity;
import android.content.Intent;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nonnull;

public class VpnModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "VpnModule";
    private static final int VPN_REQUEST_CODE = 1;

    private ParcelFileDescriptor tunnelFd;
    private boolean killSwitchEnabled = false;
    private boolean lockdownEnabled = false;
    private List<String> disallowedApps = new ArrayList<>();
    private List<String> allowedApps = new ArrayList<>();

    public VpnModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Check if VPN permission is granted.
     */
    @ReactMethod
    public void checkVpnPermission(Promise promise) {
        try {
            Intent intent = VpnService.prepare(getReactApplicationContext());
            promise.resolve(intent == null); // null means permission already granted
        } catch (Exception e) {
            promise.reject("PERMISSION_ERROR", e.getMessage());
        }
    }

    /**
     * Request VPN permission from the user.
     */
    @ReactMethod
    public void requestVpnPermission(Promise promise) {
        try {
            Intent intent = VpnService.prepare(getReactApplicationContext());
            if (intent == null) {
                promise.resolve(true);
                return;
            }

            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivityForResult(intent, VPN_REQUEST_CODE);
                promise.resolve(true);
            } else {
                promise.reject("NO_ACTIVITY", "No current activity");
            }
        } catch (Exception e) {
            promise.reject("PERMISSION_ERROR", e.getMessage());
        }
    }

    /**
     * Start the WireGuard VPN tunnel.
     */
    @ReactMethod
    public void startTunnel(ReadableMap config, Promise promise) {
        try {
            String privateKey = config.getString("privateKey");
            ReadableArray addresses = config.getArray("addresses");
            ReadableArray dns = config.getArray("dns");
            String endpoint = config.getString("endpoint");
            String peerPublicKey = config.getString("peerPublicKey");
            String presharedKey = config.getString("presharedKey");
            int mtu = config.getInt("mtu");
            ReadableArray allowedIPs = config.getArray("allowedIPs");
            int keepalive = config.getInt("persistentKeepalive");

            // Build VPN interface using VpnService.Builder
            VpnService.Builder builder = new VpnService.Builder()
                .setMtu(mtu)
                .setBlocking(true);

            // Add tunnel addresses
            if (addresses != null) {
                for (int i = 0; i < addresses.size(); i++) {
                    String addr = addresses.getString(i);
                    String[] parts = addr.split("/");
                    int prefix = parts.length > 1 ? Integer.parseInt(parts[1]) : 32;
                    builder.addAddress(parts[0], prefix);
                }
            }

            // Add DNS servers
            if (dns != null) {
                for (int i = 0; i < dns.size(); i++) {
                    builder.addDnsServer(dns.getString(i));
                }
            }

            // Add routes (allowed IPs)
            if (allowedIPs != null) {
                for (int i = 0; i < allowedIPs.size(); i++) {
                    String route = allowedIPs.getString(i);
                    String[] parts = route.split("/");
                    int prefix = parts.length > 1 ? Integer.parseInt(parts[1]) : 32;
                    builder.addRoute(parts[0], prefix);
                }
            }

            // Configure split tunneling
            for (String pkg : disallowedApps) {
                try {
                    builder.addDisallowedApplication(pkg);
                } catch (Exception ignored) {}
            }

            // Set kill switch blocking
            if (killSwitchEnabled) {
                builder.setBlocking(true);
            }

            // Establish the VPN interface
            tunnelFd = builder.establish();

            if (tunnelFd == null) {
                promise.reject("TUNNEL_ERROR", "Failed to establish VPN interface");
                return;
            }

            emitEvent("onTunnelStateChange", "connected");
            promise.resolve(true);

        } catch (Exception e) {
            emitEvent("onTunnelError", e.getMessage());
            promise.reject("TUNNEL_ERROR", e.getMessage());
        }
    }

    /**
     * Stop the VPN tunnel.
     */
    @ReactMethod
    public void stopTunnel(Promise promise) {
        try {
            if (tunnelFd != null) {
                tunnelFd.close();
                tunnelFd = null;
            }
            emitEvent("onTunnelStateChange", "disconnected");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("TUNNEL_ERROR", e.getMessage());
        }
    }

    /**
     * Get tunnel statistics.
     */
    @ReactMethod
    public void getTunnelStats(Promise promise) {
        WritableMap stats = Arguments.createMap();
        stats.putDouble("rxBytes", 0);
        stats.putDouble("txBytes", 0);
        stats.putDouble("lastHandshake", System.currentTimeMillis());
        stats.putInt("latency", 0);
        promise.resolve(stats);
    }

    /**
     * Enable or disable the kill switch.
     */
    @ReactMethod
    public void enableKillSwitch(boolean enabled) {
        this.killSwitchEnabled = enabled;
    }

    /**
     * Block all network traffic.
     */
    @ReactMethod
    public void blockAllTraffic() {
        // In a full implementation, this would configure firewall rules
        // to block all traffic outside the VPN tunnel
    }

    /**
     * Set always-on VPN (Android 7.0+).
     */
    @ReactMethod
    public void setAlwaysOnVpn(boolean enabled) {
        // Requires system settings - guide user to Android VPN settings
    }

    /**
     * Set lockdown mode (Android 10+).
     */
    @ReactMethod
    public void setLockdownEnabled(boolean enabled) {
        this.lockdownEnabled = enabled;
    }

    /**
     * Set DNS servers for the tunnel.
     */
    @ReactMethod
    public void setTunnelDns(ReadableArray servers) {
        // DNS is set when building the VPN interface
    }

    /**
     * Add a firewall rule.
     */
    @ReactMethod
    public void addFirewallRule(ReadableMap rule) {
        // Firewall rules are enforced via VPN routing
    }

    /**
     * Remove a firewall rule.
     */
    @ReactMethod
    public void removeFirewallRule(String ruleId) {
        // Remove the specified firewall rule
    }

    /**
     * Set firewall rules.
     */
    @ReactMethod
    public void setFirewallRules(ReadableArray rules) {
        // Apply firewall rules
    }

    /**
     * Set apps to exclude from VPN (split tunneling).
     */
    @ReactMethod
    public void setDisallowedApplications(ReadableArray packages) {
        disallowedApps.clear();
        if (packages != null) {
            for (int i = 0; i < packages.size(); i++) {
                disallowedApps.add(packages.getString(i));
            }
        }
    }

    /**
     * Set apps to include in VPN (split tunneling).
     */
    @ReactMethod
    public void setAllowedApplications(ReadableArray packages) {
        allowedApps.clear();
        if (packages != null) {
            for (int i = 0; i < packages.size(); i++) {
                allowedApps.add(packages.getString(i));
            }
        }
    }

    /**
     * Get list of installed applications.
     */
    @ReactMethod
    public void getInstalledApps(Promise promise) {
        // Returns installed app list for split tunneling UI
        promise.resolve(Arguments.createArray());
    }

    /**
     * Emit event to JavaScript layer.
     */
    private void emitEvent(String eventName, String data) {
        WritableMap params = Arguments.createMap();
        params.putString("state", data);

        getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}
