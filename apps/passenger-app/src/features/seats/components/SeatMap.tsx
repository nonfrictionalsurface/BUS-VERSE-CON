import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  buildRenderPlan,
  fitToWidth,
  statusOf,
  type DeckId,
  type Layout,
  type RuntimeMap,
} from '@busverse/seat-engine';
import { useTheme } from '../../../theme';
import { SeatTile } from './SeatTile';
import { FixtureTile } from './FixtureTile';

type Props = {
  layout: Layout;
  runtime: RuntimeMap;
  /** Keys of the seats I have selected (held). */
  selected: ReadonlySet<string>;
  /** Keys with a request in flight. */
  pending: ReadonlySet<string>;
  onToggle: (key: string) => void;
  /** Width the bus may use. */
  availableWidth: number;
};

const FRAME = 14;

/**
 * Draws any layout the engine can describe: 2+2, 3+2, 1+1, sleepers, double berths,
 * rear benches, cut-outs, double-deckers. No layout-specific code lives here.
 */
export const SeatMap: React.FC<Props> = ({ layout, runtime, selected, pending, onToggle, availableWidth }) => {
  const { tokens, typography, radius } = useTheme();
  const firstDeck = layout.decks[0]?.id ?? 'MAIN';
  const [deckId, setDeckId] = useState<DeckId>(firstDeck);
  useEffect(() => {
    if (!layout.decks.some((d) => d.id === deckId)) setDeckId(firstDeck);
  }, [layout, deckId, firstDeck]);

  const fit = useMemo(() => fitToWidth(layout, Math.max(120, availableWidth - FRAME * 2 - 4)), [layout, availableWidth]);
  const plan = useMemo(() => buildRenderPlan(layout, fit.options), [layout, fit]);
  const deck = plan.decks.find((d) => d.id === deckId) ?? plan.decks[0];
  if (!deck) return null;

  const availableOn = (id: DeckId): number =>
    layout.seats.filter((s) => s.deck === id && statusOf(runtime, s.key) === 'AVAILABLE').length;

  const body = (
    <View
      style={{
        width: deck.width + FRAME * 2,
        paddingHorizontal: FRAME,
        paddingTop: FRAME,
        paddingBottom: FRAME + 4,
        backgroundColor: tokens.surfaceCard,
        borderColor: tokens.borderStrong,
        borderWidth: 2,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
      }}
    >
      <Text style={[typography.caption, { color: tokens.textMuted, textAlign: 'center', marginBottom: 10, letterSpacing: 2 }]}>FRONT</Text>
      <View style={{ width: deck.width, height: deck.height }}>
        {deck.fixtures.map((f, i) => (
          <FixtureTile key={`f${i}`} item={f} />
        ))}
        {deck.seats.map((s) => (
          <SeatTile
            key={s.key}
            item={s}
            status={statusOf(runtime, s.key)}
            selected={selected.has(s.key)}
            pending={pending.has(s.key)}
            onPress={onToggle}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      {plan.decks.length > 1 ? (
        <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
          {plan.decks.map((d) => {
            const active = d.id === deck.id;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setDeckId(d.id)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: active ? tokens.brandPrimary : tokens.borderSubtle,
                  backgroundColor: active ? tokens.brandPrimarySubtle : tokens.surfaceCard,
                }}
              >
                <Text style={[typography.label, { color: active ? tokens.brandPrimary : tokens.textSecondary }]}>
                  {`${d.title} (${availableOn(d.id)})`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {fit.overflow ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
};
