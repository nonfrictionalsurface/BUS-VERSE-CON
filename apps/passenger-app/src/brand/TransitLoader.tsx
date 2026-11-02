import React, { useEffect, useMemo } from 'react';
import Svg, {
  G, Path, Circle, Rect, Ellipse, Line, Polygon,
  LinearGradient, RadialGradient, Defs, Stop, Text as SvgText, TSpan,
} from 'react-native-svg';
import {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { makeAnimatedSvg, rotateMatrix, translateMatrix } from './animatedSvg';

type Props = {
  width?: number;
  message?: string;
  showMessage?: boolean;
};

const AnimatedG = makeAnimatedSvg(G);
const AnimatedLine = makeAnimatedSvg(Line);
const AnimatedTSpan = makeAnimatedSvg(TSpan);

const PATHS = {
  roof: 'M 290,165 Q 310,154 360,154 L 465,154 Q 505,154 520,165 Z',
  body: 'M 215,178 Q 210,178 208,186 L 204,295 Q 204,310 218,310 L 255,310 A 38,38 0 0 1 331,310 L 477,310 A 38,38 0 0 1 553,310 L 588,310 Q 605,310 605,296 L 603,260 Q 601,230 582,198 L 568,184 Q 556,178 538,178 Z',
  bodyUnder: 'M 204,290 L 204,298 Q 204,310 218,310 L 255,310 A 38,38 0 0 1 331,310 L 477,310 A 38,38 0 0 1 553,310 L 588,310 Q 605,310 605,296 L 604,290 Z',
  cyanTrim: 'M 204,286 L 254,286 A 38,38 0 0 1 332,286 L 476,286 A 38,38 0 0 1 554,286 L 602,286',
  glass: 'M 220,188 L 535,188 Q 552,188 563,200 L 579,222 Q 586,232 588,246 L 589,252 L 220,252 Z',
  glassSheen1: 'M 280,252 L 325,188 L 350,188 L 305,252 Z',
  glassSheen2: 'M 440,252 L 485,188 L 500,188 L 455,252 Z',
  wheelArch1: 'M 258,310 A 35,35 0 0 1 328,310 Z',
  wheelArch2: 'M 480,310 A 35,35 0 0 1 550,310 Z',
} as const;

export const TransitLoader: React.FC<Props> = ({ width = 320, message = 'CONNECTING TRANSIT', showMessage = true }) => {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const height = width * (500 / 800);
  const paths = useMemo(() => PATHS, []);

  const chassis = useSharedValue(0);
  const wheel = useSharedValue(0);
  const dash = useSharedValue(0);
  const edge = useSharedValue(0);
  const w1 = useSharedValue(0);
  const w2 = useSharedValue(0);
  const w3 = useSharedValue(0);
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    chassis.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.linear }), -1, false);
    wheel.value = withRepeat(withTiming(360, { duration: 450, easing: Easing.linear }), -1, false);
    dash.value = withRepeat(withTiming(-130, { duration: 450, easing: Easing.linear }), -1, false);
    edge.value = withRepeat(withTiming(-60, { duration: 450, easing: Easing.linear }), -1, false);

    const windE = Easing.bezier(0.4, 0, 0.6, 1);
    w1.value = withRepeat(withTiming(1, { duration: 850, easing: windE }), -1, false);
    w2.value = withDelay(280, withRepeat(withTiming(1, { duration: 850, easing: windE }), -1, false));
    w3.value = withDelay(550, withRepeat(withTiming(1, { duration: 850, easing: windE }), -1, false));

    const dotE = Easing.inOut(Easing.ease);
    d1.value = withRepeat(withTiming(1, { duration: 1200, easing: dotE }), -1, false);
    d2.value = withDelay(200, withRepeat(withTiming(1, { duration: 1200, easing: dotE }), -1, false));
    d3.value = withDelay(400, withRepeat(withTiming(1, { duration: 1200, easing: dotE }), -1, false));
  }, [reducedMotion]);

  // Chassis rig: rotate(rot) around (400, 240) + translate (0, ty)
  const chassisProps = useAnimatedProps(() => {
    const v = chassis.value;
    const ty = interpolate(v, [0, 0.25, 0.5, 0.75, 1], [0, -3, 1, -1.5, 0]);
    const rot = interpolate(v, [0, 0.25, 0.5, 0.75, 1], [0, -0.4, 0.2, -0.1, 0]);
    return { transform: rotateMatrix(400, 240 + ty, rot, 400, 240) };
  });

  // Wheels: rotate around (293, 310) and (515, 310)
  const wheel1Props = useAnimatedProps(() => ({
    transform: rotateMatrix(293, 310, wheel.value, 293, 310),
  }));
  const wheel2Props = useAnimatedProps(() => ({
    transform: rotateMatrix(515, 310, wheel.value, 515, 310),
  }));

  // Wind: translate tx + fade opacity
  const makeWindProps = (val: typeof w1) => () => {
    'worklet';
    const tx = interpolate(val.value, [0, 1], [260, -420]);
    const op = interpolate(val.value, [0, 0.25, 0.8, 1], [0, 0.75, 0.6, 0]);
    return { opacity: op, transform: translateMatrix(tx, 0) };
  };
  const wind1Props = useAnimatedProps(makeWindProps(w1));
  const wind2Props = useAnimatedProps(makeWindProps(w2));
  const wind3Props = useAnimatedProps(makeWindProps(w3));

  // Dots: opacity only — TSpan transform support varies across SVG impls
  const makeDotProps = (val: typeof d1) => () => {
    'worklet';
    const op = interpolate(val.value, [0, 0.4, 0.8, 1], [0.2, 1, 0.2, 0.2]);
    return { opacity: op };
  };
  const dot1Props = useAnimatedProps(makeDotProps(d1));
  const dot2Props = useAnimatedProps(makeDotProps(d2));
  const dot3Props = useAnimatedProps(makeDotProps(d3));

  // Road dash + edge: strokeDashoffset is already a valid animated prop
  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const edgeProps = useAnimatedProps(() => ({ strokeDashoffset: edge.value }));

  return (
    <Svg viewBox="0 0 800 500" width={width} height={height} fill="none">
      <Defs>
        <LinearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#003BB5" />
          <Stop offset="50%" stopColor="#0055ED" />
          <Stop offset="100%" stopColor="#1E70FF" />
        </LinearGradient>
        <LinearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0B1830" />
          <Stop offset="100%" stopColor="#050C1A" />
        </LinearGradient>
        <LinearGradient id="glassGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%" stopColor="#1E3050" />
          <Stop offset="50%" stopColor="#0E192D" />
          <Stop offset="100%" stopColor="#08101E" />
        </LinearGradient>
        <LinearGradient id="glassSheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#00F0FF" stopOpacity={0} />
          <Stop offset="50%" stopColor="#00F0FF" stopOpacity={0.35} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
          <Stop offset="0%" stopColor="#00E5FF" stopOpacity={0.8} />
          <Stop offset="30%" stopColor="#00E5FF" stopOpacity={0.25} />
          <Stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="underglowGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#00E5FF" stopOpacity={0.6} />
          <Stop offset="60%" stopColor="#0055ED" stopOpacity={0.2} />
          <Stop offset="100%" stopColor="#0055ED" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="taillightGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF2A55" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#FF2A55" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#182538" />
          <Stop offset="50%" stopColor="#0B121E" />
          <Stop offset="100%" stopColor="#24344D" />
        </LinearGradient>
      </Defs>

      {/* Wind streaks */}
      <G stroke={tokens.telemetryCyan} opacity={0.28} strokeWidth={2} strokeLinecap="round">
        <AnimatedLine x1={560} y1={135} x2={680} y2={135} strokeDasharray={[70, 50]} animatedProps={wind1Props} />
        <AnimatedLine x1={500} y1={168} x2={660} y2={168} strokeDasharray={[90, 60]} animatedProps={wind2Props} />
        <AnimatedLine x1={540} y1={305} x2={700} y2={305} strokeDasharray={[60, 40]} animatedProps={wind3Props} />
      </G>

      {/* Ground + road */}
      <Rect x={0} y={340} width={800} height={4} fill={tokens.textMuted} opacity={0.4} />
      <AnimatedLine x1={-100} y1={358} x2={900} y2={358} stroke="#0055ED" strokeWidth={4} strokeLinecap="round" opacity={0.85} strokeDasharray={[60, 70]} animatedProps={dashProps} />
      <AnimatedLine x1={-100} y1={372} x2={900} y2={372} stroke="#00E5FF" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} strokeDasharray={[25, 35]} animatedProps={edgeProps} />

      {/* Underglow + lighting */}
      <Ellipse cx={400} cy={336} rx={210} ry={14} fill="url(#underglowGrad)" opacity={0.5} />
      <Ellipse cx={205} cy={275} rx={40} ry={18} fill="url(#taillightGlow)" opacity={0.7} />
      <Polygon points="596,275 800,225 800,352 602,305" fill="url(#headlightBeam)" opacity={0.6} />

      {/* Bus chassis rig */}
      <AnimatedG animatedProps={chassisProps}>
        <Path d={paths.roof} fill="url(#roofGrad)" />
        <Rect x={340} y={159} width={30} height={3} rx={1.5} fill="#1C2E4A" />
        <Rect x={385} y={159} width={30} height={3} rx={1.5} fill="#1C2E4A" />
        <Rect x={430} y={159} width={30} height={3} rx={1.5} fill="#1C2E4A" />
        <Path d={paths.body} fill="url(#bodyGrad)" />
        <Path d={paths.bodyUnder} fill="#0B1830" />
        <Path d={paths.cyanTrim} fill="none" stroke="#00F0FF" strokeWidth={2} opacity={0.85} />
        <Path d={paths.glass} fill="url(#glassGrad)" stroke="#0B1830" strokeWidth={2} />
        <Path d={paths.glassSheen1} fill="url(#glassSheen)" />
        <Path d={paths.glassSheen2} fill="url(#glassSheen)" opacity={0.5} />
        <Line x1={275} y1={188} x2={275} y2={252} stroke="#0B1830" strokeWidth={3} />
        <Line x1={340} y1={188} x2={340} y2={252} stroke="#0B1830" strokeWidth={3} />
        <Line x1={410} y1={188} x2={410} y2={252} stroke="#0B1830" strokeWidth={3} />
        <Line x1={480} y1={188} x2={480} y2={252} stroke="#0B1830" strokeWidth={3} />
        <Ellipse cx={600} cy={276} rx={4} ry={5} fill="#00E5FF" />
        <Rect x={202} y={262} width={3} height={20} rx={1.5} fill="#FFA3B2" />

        <G>
          <Path d={paths.wheelArch1} fill="#050912" />
          <Circle cx={293} cy={310} r={28} fill="#111824" stroke="#070C14" strokeWidth={2} />
          <AnimatedG animatedProps={wheel1Props}>
            <Circle cx={293} cy={310} r={19} fill="url(#rimGrad)" />
            <Circle cx={293} cy={310} r={13} fill="none" stroke="#00E5FF" strokeWidth={2} strokeDasharray={[6, 7]} />
            <Circle cx={293} cy={310} r={5} fill="#0055ED" />
          </AnimatedG>
        </G>
        <G>
          <Path d={paths.wheelArch2} fill="#050912" />
          <Circle cx={515} cy={310} r={28} fill="#111824" stroke="#070C14" strokeWidth={2} />
          <AnimatedG animatedProps={wheel2Props}>
            <Circle cx={515} cy={310} r={19} fill="url(#rimGrad)" />
            <Circle cx={515} cy={310} r={13} fill="none" stroke="#00E5FF" strokeWidth={2} strokeDasharray={[6, 7]} />
            <Circle cx={515} cy={310} r={5} fill="#0055ED" />
          </AnimatedG>
        </G>
      </AnimatedG>

      {/* Status message */}
      {showMessage && (
        <G transform="translate(400, 435)">
          <SvgText fill={tokens.textMuted} textAnchor="middle" fontFamily="System" fontSize={14} fontWeight="700" letterSpacing={6}>
            {message}
            <AnimatedTSpan animatedProps={dot1Props}>.</AnimatedTSpan>
            <AnimatedTSpan animatedProps={dot2Props}>.</AnimatedTSpan>
            <AnimatedTSpan animatedProps={dot3Props}>.</AnimatedTSpan>
          </SvgText>
        </G>
      )}
    </Svg>
  );
};

export default TransitLoader;