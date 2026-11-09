import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { Modal, Button } from '../../../components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (iso: string) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function istToday(): { y: number; m: number; d: number } {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate() };
}

function istIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

export const CalendarPickerModal: React.FC<Props> = ({ open, onClose, value, onSelect }) => {
  const { tokens, typography, spacing, radius } = useTheme();
  const today = istToday();
  const initial = parseIso(value) ?? today;
  const [view, setView] = useState({ y: initial.y, m: initial.m });

  useEffect(() => {
    if (open) {
      const v = parseIso(value) ?? istToday();
      setView({ y: v.y, m: v.m });
    }
  }, [open, value]);

  const cells = useMemo(() => {
    const firstDay = new Date(Date.UTC(view.y, view.m, 1));
    const lastDay = new Date(Date.UTC(view.y, view.m + 1, 0));
    const startWeekday = firstDay.getUTCDay();
    const daysInMonth = lastDay.getUTCDate();
    const result: Array<number | null> = [];
    for (let i = 0; i < startWeekday; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [view]);

  const todayIso = istIso(today.y, today.m, today.d);
  const canGoPrev = view.y > today.y || (view.y === today.y && view.m > today.m);

  const goPrev = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const goNext = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  return (
    <Modal open={open} onClose={onClose} title="Select travel date">
      {/* Month nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <Pressable
          onPress={goPrev}
          disabled={!canGoPrev}
          style={[
            styles.navBtn,
            { borderColor: tokens.borderSubtle, opacity: canGoPrev ? 1 : 0.3 },
          ]}
          accessibilityLabel="Previous month"
          accessibilityRole="button"
        >
          <Text style={{ color: tokens.textPrimary, fontSize: 18, fontWeight: '700' }}>
            {'<'}
          </Text>
        </Pressable>
        <Text style={[typography.h4, { color: tokens.textBright }]}>
          {MONTHS[view.m]} {view.y}
        </Text>
        <Pressable
          onPress={goNext}
          style={[styles.navBtn, { borderColor: tokens.borderSubtle }]}
          accessibilityLabel="Next month"
          accessibilityRole="button"
        >
          <Text style={{ color: tokens.textPrimary, fontSize: 18, fontWeight: '700' }}>
            {'>'}
          </Text>
        </Pressable>
      </View>

      {/* Weekday header */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <View key={`w-${i}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Text
              style={[typography.monoSmall, { color: tokens.textMuted, fontSize: 10 }]}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, idx) => {
          if (d === null) {
            return <View key={`b-${idx}`} style={styles.cell} />;
          }
          const iso = istIso(view.y, view.m, d);
          const isPast = iso < todayIso;
          const isSelected = iso === value;
          const isToday = iso === todayIso;
          return (
            <Pressable
              key={iso}
              disabled={isPast}
              onPress={() => {
                onSelect(iso);
                onClose();
              }}
              style={[
                styles.cell,
                {
                  borderRadius: radius.sm,
                  backgroundColor: isSelected
                    ? tokens.brandPrimary
                    : isToday
                    ? tokens.brandPrimarySubtle
                    : 'transparent',
                  opacity: isPast ? 0.3 : 1,
                },
              ]}
              accessibilityLabel={`${d} ${MONTHS[view.m]} ${view.y}`}
              accessibilityState={{ selected: isSelected, disabled: isPast }}
              accessibilityRole="button"
            >
              <Text
                style={[
                  typography.body,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : isToday
                      ? tokens.brandPrimary
                      : tokens.textPrimary,
                    fontWeight: isSelected || isToday ? '700' : '400',
                    fontSize: 14,
                  },
                ]}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Button variant="ghost" onPress={onClose} fullWidth>
          Cancel
        </Button>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: '14.2857%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
});

export default CalendarPickerModal;