import React from 'react';
import { View, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { ScreenContainer, AppHeader } from '../components/layout';
import { Card, Button, Banner, PageLoader } from '../components/ui';
import { useSearch, ScheduleCard } from '../features/search';
import { formatDate } from '../lib/format';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens, typography, spacing } = useTheme();
  const {
    originCityId,
    destinationCityId,
    originCityName,
    destinationCityName,
    date,
    sortBy,
  } = route.params;

  const { data: schedules, isLoading, isError, refetch } = useSearch({
    originCityId,
    destinationCityId,
    date,
    ...(sortBy ? { sortBy } : {}),
  });

  const dateLabel = formatDate(`${date}T00:00:00.000Z`, 'day');
  const routeLabel = `${originCityName} to ${destinationCityName}`;

  return (
    <ScreenContainer padded={false} scroll>
      <AppHeader title={routeLabel} onBackPress={() => navigation.goBack()} />
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <Card padding={spacing.md}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: tokens.textMuted }]}>
                {dateLabel}
              </Text>
              <Text style={[typography.h4, { color: tokens.textBright, marginTop: 2 }]}>
                {routeLabel}
              </Text>
            </View>
            <Button variant="ghost" size="sm" onPress={() => navigation.goBack()}>
              Edit
            </Button>
          </View>
        </Card>

        {isLoading ? (
          <PageLoader message="FINDING BUSES" minHeight={360} />
        ) : isError ? (
          <Banner
            type="error"
            message="Could not load buses. Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        ) : !schedules || schedules.length === 0 ? (
          <Card padding={spacing.lg}>
            <Text
              style={[typography.h4, { color: tokens.textBright, textAlign: 'center' }]}
            >
              No buses found
            </Text>
            <Text
              style={[
                typography.body,
                { color: tokens.textSecondary, textAlign: 'center', marginTop: 8 },
              ]}
            >
              No buses available on {dateLabel}. Try a different date or route.
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button variant="secondary" onPress={() => navigation.goBack()} fullWidth>
                Change search
              </Button>
            </View>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.caption, { color: tokens.textMuted }]}>
              {schedules.length} {schedules.length === 1 ? 'bus' : 'buses'} available
            </Text>
            {schedules.map((s) => (
              <ScheduleCard
                key={s.scheduleId}
                schedule={s}
                originCityName={originCityName}
                destinationCityName={destinationCityName}
                onSelect={() => {
                  navigation.navigate('SeatSelection', {
                    scheduleId: s.scheduleId,
                    farePaise: s.fare.amountPaise,
                  });
                }}
              />
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

export default ResultsScreen;