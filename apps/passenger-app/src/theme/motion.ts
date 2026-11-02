import { Easing } from 'react-native-reanimated';

// Motion durations from 05-UI-SPEC §15.2 (matches Design_guide.html §1 --ease-*).
// Values are milliseconds. Easing curves use Reanimated's Easing API.

export const motion = {
  duration: {
    instant: 100,
    fast: 150,
    smooth: 250,
    bounce: 400,
    long: 500,
    shimmer: 1500,
    lockedBreath: 2200,
    beaconPulse: 1200,
  },
  easing: {
    standard: Easing.bezier(0.16, 1, 0.3, 1),
    smooth: Easing.bezier(0.16, 1, 0.3, 1),
    bounce: Easing.bezier(0.34, 1.56, 0.64, 1),
    linear: Easing.linear,
    inOut: Easing.inOut(Easing.ease),
  },
} as const;

export type Motion = typeof motion;
