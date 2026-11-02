import React, { useState } from 'react';
import { View, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { ScreenContainer, AppHeader } from '../components/layout';
import { Card, Button } from '../components/ui';
import { CityAutocomplete, DateField } from '../features/search';
import type { RootStackParamList, CityDTO } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

function todayIst(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const { tokens, typography, spacing } = useTheme();
  const [origin, setOrigin] = useState<CityDTO | null>(null);
  const [destination, setDestination] = useState<CityDTO | null>(null);
  const [date, setDate] = useState(todayIst());

  const sameCity = origin !== null && destination !== null && origin.id === destination.id;
  const canSearch = origin !== null && destination !== null && !sameCity;

  const handleSearch = () => {
    if (!canSearch || !origin || !destination) return;
    navigation.navigate('Results', {
      originCityId: origin.id,
      destinationCityId: destination.id,
      originCityName: origin.name,
      destinationCityName: destination.name,
      date,
    });
  };

  return (
    <ScreenContainer padded={false} scroll>
      <AppHeader title="Search buses" onBackPress={() => navigation.goBack()} />
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <Card elevation="elevated" padding={spacing.lg}>
          <View style={{ gap: spacing.md }}>
            <CityAutocomplete
              label="From"
              placeholder="Select origin city"
              value={origin}
              onChange={setOrigin}
            />
            <CityAutocomplete
              label="To"
              placeholder="Select destination city"
              value={destination}
              onChange={setDestination}
            />
            <DateField label="Travel date" value={date} onChange={setDate} />
            {sameCity && (
              <Text style={[typography.caption, { color: tokens.dangerCrimson }]}>
                Origin and destination must be different.
              </Text>
            )}
          </View>
        </Card>

        <Button onPress={handleSearch} disabled={!canSearch} fullWidth size="lg">
          Search buses
        </Button>

        <Text style={[typography.caption, { color: tokens.textMuted, textAlign: 'center' }]}>
          Buses are filtered by published schedules on the selected date.
        </Text>
      </View>
    </ScreenContainer>
  );
};

export default SearchScreen;