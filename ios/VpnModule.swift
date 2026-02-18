/**
 * iOS native module bridging React Native to NetworkExtension framework.
 * Manages WireGuard tunnel via NEVPNManager and NETunnelProviderManager.
 */

import Foundation
import NetworkExtension
import React

@objc(VpnModule)
class VpnModule: RCTEventEmitter {

    private var tunnelManager: NETunnelProviderManager?
    private var vpnStatusObserver: NSObjectProtocol?

    // MARK: - Module Setup

    override static func moduleName() -> String! {
        return "VpnModule"
    }

    override func supportedEvents() -> [String]! {
        return ["onTunnelStateChange", "onTunnelError"]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    // MARK: - VPN Permission

    @objc
    func checkVpnPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        NETunnelProviderManager.loadAllFromPreferences { managers, error in
            if let error = error {
                reject("PERMISSION_ERROR", error.localizedDescription, error)
                return
            }
            resolve(managers != nil && !managers!.isEmpty)
        }
    }

    @objc
    func requestVpnPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
        let manager = NETunnelProviderManager()
        manager.saveToPreferences { error in
            if let error = error {
                reject("PERMISSION_ERROR", error.localizedDescription, error)
                return
            }
            resolve(true)
        }
    }

    // MARK: - Tunnel Management

    @objc
    func startTunnelWithConfig(_ configString: String,
                               resolver resolve: @escaping RCTPromiseResolveBlock,
                               rejecter reject: @escaping RCTPromiseRejectBlock) {
        NETunnelProviderManager.loadAllFromPreferences { [weak self] managers, error in
            if let error = error {
                reject("TUNNEL_ERROR", error.localizedDescription, error)
                return
            }

            let manager = managers?.first ?? NETunnelProviderManager()
            self?.tunnelManager = manager

            // Configure the tunnel provider
            let tunnelProtocol = NETunnelProviderProtocol()
            tunnelProtocol.providerBundleIdentifier = "com.mullvadvpn.tunnel"
            tunnelProtocol.serverAddress = "Mullvad VPN"
            tunnelProtocol.providerConfiguration = [
                "wg-config": configString
            ]

            manager.protocolConfiguration = tunnelProtocol
            manager.localizedDescription = "Mullvad VPN"
            manager.isEnabled = true

            manager.saveToPreferences { error in
                if let error = error {
                    reject("TUNNEL_ERROR", error.localizedDescription, error)
                    return
                }

                manager.loadFromPreferences { error in
                    if let error = error {
                        reject("TUNNEL_ERROR", error.localizedDescription, error)
                        return
                    }

                    do {
                        try manager.connection.startVPNTunnel()
                        self?.observeVPNStatus(manager: manager)
                        resolve(true)
                    } catch {
                        reject("TUNNEL_ERROR", error.localizedDescription, error)
                    }
                }
            }
        }
    }

    @objc
    func stopTunnel(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let manager = tunnelManager else {
            resolve(true)
            return
        }

        manager.connection.stopVPNTunnel()
        resolve(true)
    }

    @objc
    func getTunnelStats(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        let stats: [String: Any] = [
            "rxBytes": 0,
            "txBytes": 0,
            "lastHandshake": Date().timeIntervalSince1970 * 1000,
            "latency": 0
        ]
        resolve(stats)
    }

    // MARK: - On-Demand Rules (Kill Switch)

    @objc
    func setOnDemandRules(_ rules: [[String: Any]]) {
        guard let manager = tunnelManager else { return }

        var onDemandRules: [NEOnDemandRule] = []

        for rule in rules {
            guard let action = rule["action"] as? String else { continue }

            switch action {
            case "connect":
                let connectRule = NEOnDemandRuleConnect()
                if let interfaceType = rule["interfaceTypeMatch"] as? String {
                    switch interfaceType {
                    case "wifi":
                        connectRule.interfaceTypeMatch = .wiFi
                    case "cellular":
                        connectRule.interfaceTypeMatch = .cellular
                    default:
                        connectRule.interfaceTypeMatch = .any
                    }
                }
                onDemandRules.append(connectRule)

            case "disconnect":
                let disconnectRule = NEOnDemandRuleDisconnect()
                onDemandRules.append(disconnectRule)

            default:
                break
            }
        }

        manager.isOnDemandEnabled = !onDemandRules.isEmpty
        manager.onDemandRules = onDemandRules

        manager.saveToPreferences { error in
            if let error = error {
                print("Failed to save on-demand rules: \(error)")
            }
        }
    }

    // MARK: - DNS Configuration

    @objc
    func configureDns(_ config: [String: Any]) {
        // DNS is configured via the tunnel provider protocol
        // In a full implementation, this would update NEDNSSettings
    }

    // MARK: - VPN Status Observation

    private func observeVPNStatus(manager: NETunnelProviderManager) {
        vpnStatusObserver = NotificationCenter.default.addObserver(
            forName: .NEVPNStatusDidChange,
            object: manager.connection,
            queue: .main
        ) { [weak self] _ in
            let status: String

            switch manager.connection.status {
            case .connected:
                status = "connected"
            case .connecting:
                status = "connecting"
            case .disconnected:
                status = "disconnected"
            case .disconnecting:
                status = "disconnecting"
            case .reasserting:
                status = "reconnecting"
            case .invalid:
                status = "error"
            @unknown default:
                status = "disconnected"
            }

            self?.sendEvent(withName: "onTunnelStateChange", body: ["state": status])
        }
    }

    deinit {
        if let observer = vpnStatusObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
