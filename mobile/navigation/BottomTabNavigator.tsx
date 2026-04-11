import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import TalentArenaScreen from '../screens/TalentArenaScreen';
import UploadScreen from '../screens/UploadScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LanguageScreen from '../screens/LanguageScreen';
import EarningsScreen from '../screens/EarningsScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
  Language: { language: string };
};

export type ArenaStackParamList = {
  ArenaMain: undefined;
};

export type UploadStackParamList = {
  UploadMain: undefined;
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  Language: { language: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Earnings: undefined;
};

const HomeStack = createStackNavigator<HomeStackParamList>();
const ArenaStack = createStackNavigator<ArenaStackParamList>();
const UploadStack = createStackNavigator<UploadStackParamList>();
const LibraryStack = createStackNavigator<LibraryStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

const SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: '#0A1128' },
  headerTintColor: '#00D9FF',
  headerTitleStyle: { color: '#FFFFFF', fontWeight: 'bold' as const },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Language"
        component={LanguageScreen}
        options={({ route }) => ({
          title: route.params.language,
        })}
      />
    </HomeStack.Navigator>
  );
}

function ArenaStackNavigator() {
  return (
    <ArenaStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <ArenaStack.Screen
        name="ArenaMain"
        component={TalentArenaScreen}
        options={{ title: 'Talent Arena', headerShown: false }}
      />
    </ArenaStack.Navigator>
  );
}

function UploadStackNavigator() {
  return (
    <UploadStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <UploadStack.Screen
        name="UploadMain"
        component={UploadScreen}
        options={{ title: 'Upload', headerShown: false }}
      />
    </UploadStack.Navigator>
  );
}

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <LibraryStack.Screen
        name="LibraryMain"
        component={LibraryScreen}
        options={{ title: 'Library', headerShown: false }}
      />
      <LibraryStack.Screen
        name="Language"
        component={LanguageScreen}
        options={({ route }) => ({
          title: route.params.language,
        })}
      />
    </LibraryStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: false }}
      />
      <ProfileStack.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ title: 'Earnings' }}
      />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 9,
          color: focused ? '#00D9FF' : 'rgba(255,255,255,0.3)',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A1128',
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#00D9FF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Arena"
        component={ArenaStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎭" label="Arena" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="➕" label="Upload" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📚" label="Library" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
