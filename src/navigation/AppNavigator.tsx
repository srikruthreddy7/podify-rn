import React, { useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import LibraryScreen from '../screens/LibraryScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EpisodeListScreen from '../screens/EpisodeListScreen';
import LoginScreen from '../screens/LoginScreen';
import MiniPlayer from '../components/MiniPlayer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Type definitions for navigation
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type RootTabParamList = {
  Library: undefined;
  Discover: undefined;
  Settings: undefined;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  EpisodeList: { showId: string };
};

const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const LibraryStack = createStackNavigator<LibraryStackParamList>();

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator>
      <LibraryStack.Screen
        name="LibraryHome"
        component={LibraryScreen}
        options={{ headerShown: false }}
      />
      <LibraryStack.Screen
        name="EpisodeList"
        component={EpisodeListScreen}
        options={{ title: 'Episodes' }}
      />
    </LibraryStack.Navigator>
  );
}

function CustomTabBar(props: any) {
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.tabBarWrapper}>
        <MiniPlayer onPress={() => setIsPlayerVisible(true)} />
        <View style={[styles.tabBarContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <BottomTabBar {...props} />
        </View>
      </View>

      <NowPlayingScreen
        visible={isPlayerVisible}
        onClose={() => setIsPlayerVisible(false)}
      />
    </>
  );
}

function MainNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Library') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarBackground: () => (
          <View style={[styles.tabBarBackground, { backgroundColor: colors.surface }]}>
            <View style={[styles.tabBarGradient, { borderTopColor: colors.border }]} />
          </View>
        ),
      })}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Library"
        component={LibraryNavigator}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Discover' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { user, isLoading, isInitialized } = useAuth();

  // Show loading screen while initializing auth
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarWrapper: {
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});
