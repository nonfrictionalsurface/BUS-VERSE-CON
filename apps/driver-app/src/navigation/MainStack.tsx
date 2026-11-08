import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PhoneScreen } from '../screens/PhoneScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { TripsListScreen } from '../screens/TripsListScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { TripSummaryScreen } from '../screens/TripSummaryScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ManifestScreen } from '../screens/ManifestScreen';
import { MapScreen } from '../screens/MapScreen';

const Stack = createNativeStackNavigator();

export function MainStack({ isAuth }: { isAuth: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuth ? (
        <>
          <Stack.Screen name="Phone" component={PhoneScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="TripsList" component={TripsListScreen} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="TripSummary" component={TripSummaryScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} />
          <Stack.Screen name="Manifest" component={ManifestScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
