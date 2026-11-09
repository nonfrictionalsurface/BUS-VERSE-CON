import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { Modal, Input, Spinner } from '../../../components/ui';
import { useCities } from '../hooks/useCities';
import type { CityDTO } from '../../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (city: CityDTO) => void;
  title: string;
};

export const CityPickerModal: React.FC<Props> = ({ open, onClose, onSelect, title }) => {
  const { tokens, typography, spacing, radius } = useTheme();
  const [query, setQuery] = useState('');
  const { data: cities = [], isLoading } = useCities(query);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search cities…"
        autoCapitalize="words"
      />
      <ScrollView style={{ maxHeight: 420, marginTop: spacing.sm }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Spinner />
          </View>
        ) : cities.length === 0 ? (
          <Text style={[typography.body, { color: tokens.textMuted, textAlign: 'center', paddingVertical: 40 }]}>
            No cities found
          </Text>
        ) : (
          cities.map((city) => (
            <Pressable
              key={city.id}
              onPress={() => {
                onSelect(city);
                setQuery('');
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderRadius: radius.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.borderHairline,
                  backgroundColor: pressed ? tokens.surfaceHover : 'transparent',
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[typography.body, { color: tokens.textPrimary, fontWeight: '600' }]}>
                {city.name}
              </Text>
              <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 2 }]}>
                {city.state}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 14, paddingHorizontal: 12 },
});

export default CityPickerModal;