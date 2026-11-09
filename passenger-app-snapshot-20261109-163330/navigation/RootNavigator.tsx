import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { SeatSelectionScreen } from '../screens/SeatSelectionScreen';
import { PassengerManifestScreen } from '../screens/PassengerManifestScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { MyTicketsScreen } from '../screens/MyTicketsScreen';
import { TicketScreen } from '../screens/TicketScreen';
import { CancelBookingScreen } from '../screens/CancelBookingScreen';
import { LiveTrackingScreen } from '../screens/LiveTrackingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
      <Stack.Screen name="PassengerManifest" component={PassengerManifestScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="Cancel" component={CancelBookingScreen} />
      <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
