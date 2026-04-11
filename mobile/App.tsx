import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './contexts/AuthContext';
import { GlobalPlayerProvider } from './contexts/GlobalPlayerContext';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import PlayerMiniBar from './components/PlayerMiniBar';

export default function App() {
  return (
    <SafeAreaProvider>
      <GlobalPlayerProvider>
        <AuthProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: '#00D9FF',
                background: '#0A1128',
                card: '#0A1128',
                text: '#FFFFFF',
                border: 'rgba(255,255,255,0.1)',
                notification: '#9D4EDD',
              },
            }}
          >
            <View style={styles.container}>
              <BottomTabNavigator />
              <PlayerMiniBar />
            </View>
          </NavigationContainer>
          <StatusBar style="light" />
        </AuthProvider>
      </GlobalPlayerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1128',
  },
});
