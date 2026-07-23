import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

interface Props {
  color?: string;
}

export const MapPulse: React.FC<Props> = ({ color = '#3b82f6' }) => {
  const animation = useSharedValue(0);

  useEffect(() => {
    animation.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(animation.value, [0, 1], [1, 4], Extrapolate.CLAMP);
    const opacity = interpolate(animation.value, [0, 1], [0.6, 0], Extrapolate.CLAMP);

    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: color,
    };
  });

  return <Animated.View style={[styles.pulse, animatedStyle]} />;
};

const styles = StyleSheet.create({
  pulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
});
