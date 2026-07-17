import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function AdminChatIcon({ size = 22, color = '#fff' }) {
  const circleSize = size * 0.35;
  const borderWidth = Math.max(1.5, size * 0.08);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Feather name="hexagon" size={size} color={color} style={styles.hexagon} />
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            borderWidth: borderWidth,
            borderColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexagon: {
    position: 'absolute',
  },
  circle: {
    backgroundColor: 'transparent',
  },
});
