/**
 * App navigation setup.
 * Manages the navigation stack with authentication flow.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ConnectScreen } from '../screens/ConnectScreen';
import { ServerListScreen } from '../screens/ServerListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { SplitTunnelScreen } from '../screens/SplitTunnelScreen';
import { FaceTimeScreen } from '../screens/FaceTimeScreen';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Main: undefined;
  ServerList: undefined;
  Account: undefined;
  SplitTunnel: undefined;
  VpnSettings: undefined;
  DnsSettings: undefined;
  About: undefined;
  FaceTimeCall: { link?: string } | undefined;
};

export type MainTabParamList = {
  Connect: undefined;
  FaceTime: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab icon component
const TabIcon: React.FC<{ label: string; focused: boolean }> = ({
  label,
  focused,
}) => (
  <View style={tabStyles.iconContainer}>
    <View
      style={[
        tabStyles.iconDot,
        { backgroundColor: focused ? Colors.green : Colors.textDisabled },
      ]}
    />
    <Text
      style={[
        tabStyles.label,
        { color: focused ? Colors.green : Colors.textDisabled },
      ]}
    >
      {label}
    </Text>
  </View>
);

// Main tab navigator
const MainTabs: React.FC<{
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  navigation: any;
}> = ({ onConnect, onDisconnect, navigation }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.backgroundDark,
          borderTopColor: Colors.border,
          height: Spacing.tabBarHeight,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.textDisabled,
      }}
    >
      <Tab.Screen
        name="Connect"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Connect" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      >
        {() => (
          <ConnectScreen
            onNavigateToServers={() => navigation.navigate('ServerList')}
            onNavigateToAccount={() => navigation.navigate('Account')}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="FaceTime"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="FaceTime" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      >
        {() => (
          <FaceTimeScreen
            onBack={() => navigation.navigate('Connect')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Settings" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      >
        {() => (
          <SettingsScreen
            onBack={() => navigation.navigate('Connect')}
            onNavigateToVpnSettings={() => navigation.navigate('VpnSettings')}
            onNavigateToDnsSettings={() => navigation.navigate('DnsSettings')}
            onNavigateToSplitTunnel={() => navigation.navigate('SplitTunnel')}
            onNavigateToAbout={() => navigation.navigate('About')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

interface AppNavigatorProps {
  isLoggedIn: boolean;
  isFirstLaunch: boolean;
  onLogin: (accountNumber: string) => Promise<void>;
  onCreateAccount: () => Promise<void>;
  onLogout: () => Promise<void>;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onServerSelect: (server: any) => void;
  onRedeemVoucher: (code: string) => Promise<void>;
  onRemoveDevice: (deviceId: string) => Promise<void>;
  loginError: string | null;
  isLoginLoading: boolean;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  isLoggedIn,
  isFirstLaunch,
  onLogin,
  onCreateAccount,
  onLogout,
  onConnect,
  onDisconnect,
  onServerSelect,
  onRedeemVoucher,
  onRemoveDevice,
  loginError,
  isLoginLoading,
}) => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.green,
          background: Colors.background,
          card: Colors.backgroundDark,
          text: Colors.textPrimary,
          border: Colors.border,
          notification: Colors.red,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {!isLoggedIn ? (
          <>
            {isFirstLaunch && (
              <Stack.Screen name="Welcome">
                {({ navigation }) => (
                  <WelcomeScreen
                    onGetStarted={() => navigation.navigate('Login')}
                  />
                )}
              </Stack.Screen>
            )}
            <Stack.Screen name="Login">
              {() => (
                <LoginScreen
                  onLogin={onLogin}
                  onCreateAccount={onCreateAccount}
                  isLoading={isLoginLoading}
                  error={loginError}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Main">
              {({ navigation }) => (
                <MainTabs
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  navigation={navigation}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ServerList">
              {({ navigation }) => (
                <ServerListScreen
                  onBack={() => navigation.goBack()}
                  onServerSelect={onServerSelect}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Account">
              {({ navigation }) => (
                <AccountScreen
                  onBack={() => navigation.goBack()}
                  onLogout={onLogout}
                  onRedeemVoucher={onRedeemVoucher}
                  onRemoveDevice={onRemoveDevice}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SplitTunnel">
              {({ navigation }) => (
                <SplitTunnelScreen onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="FaceTimeCall">
              {({ navigation, route }) => (
                <FaceTimeScreen
                  onBack={() => navigation.goBack()}
                  initialLink={route.params?.link}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const tabStyles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    gap: 4,
  },
  iconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
