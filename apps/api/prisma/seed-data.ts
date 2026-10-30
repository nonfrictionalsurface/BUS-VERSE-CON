import { deterministicUuid } from '../src/lib/ids.js';

const U = (k: string) => deterministicUuid(`seed:${k}`);

export const IDS = {
  cities: { delhi: U('city:delhi'), kanpur: U('city:kanpur'), lucknow: U('city:lucknow') },
  stands: {
    kashmere: U('stand:kashmere'), anandvihar: U('stand:anandvihar'),
    dhaulakuan: U('stand:dhaulakuan'), igi: U('stand:igi'),
    jhakarkati: U('stand:jhakarkati'), kalyanpur: U('stand:kalyanpur'),
    kanpurcentral: U('stand:kanpurcentral'), alambagh: U('stand:alambagh'),
    kaiserbagh: U('stand:kaiserbagh'), charbagh: U('stand:charbagh'),
    amausi: U('stand:amausi'),
  },
  operators: { sharma: U('op:sharma'), rajdhani: U('op:rajdhani'), northern: U('op:northern') },
  users: {
    sharmaOwner: U('user:op-sharma-owner'), rajdhaniOwner: U('user:op-rajdhani-owner'),
    northernOwner: U('user:op-northern-owner'), rajdhaniMgr: U('user:op-rajdhani-mgr'),
    northernMgr: U('user:op-northern-mgr'), admin: U('user:admin'),
    driver1: U('user:driver-ravi'), driver2: U('user:driver-suresh'),
    driver3: U('user:driver-mahesh'), driver4: U('user:driver-arjun'),
    driver5: U('user:driver-vikram'),
    passenger1: U('user:passenger-alice'), passenger2: U('user:passenger-bob'),
    passenger3: U('user:passenger-carol'), passenger4: U('user:passenger-dave'),
    passenger5: U('user:passenger-eve'),
  },
  opUsers: {
    sharmaOwner: U('opuser:sharma-owner'), rajdhaniOwner: U('opuser:rajdhani-owner'),
    northernOwner: U('opuser:northern-owner'), rajdhaniMgr: U('opuser:rajdhani-mgr'),
    northernMgr: U('opuser:northern-mgr'),
  },
  adminUser: U('admin:super'),
  passengerProfile: {
    alice: U('passprofile:alice'), bob: U('passprofile:bob'), carol: U('passprofile:carol'),
    dave: U('passprofile:dave'), eve: U('passprofile:eve'),
  },
  driverProfile: {
    ravi: U('driverprofile:ravi'), suresh: U('driverprofile:suresh'),
    mahesh: U('driverprofile:mahesh'), arjun: U('driverprofile:arjun'),
    vikram: U('driverprofile:vikram'),
  },
  buses: {
    dl1p1234: U('bus:dl1p1234'), dl1p5678: U('bus:dl1p5678'),
    dl1p2345: U('bus:dl1p2345'), dl1p3456: U('bus:dl1p3456'),
    dl1p6789: U('bus:dl1p6789'),
    up32ab1111: U('bus:up32ab1111'), up32ab2222: U('bus:up32ab2222'),
  },
  layouts: {
    dl1p1234: U('layout:dl1p1234'), dl1p5678: U('layout:dl1p5678'),
    dl1p2345: U('layout:dl1p2345'), dl1p3456: U('layout:dl1p3456'),
    dl1p6789: U('layout:dl1p6789'),
    up32ab1111: U('layout:up32ab1111'), up32ab2222: U('layout:up32ab2222'),
  },
  routes: {
    r1: U('route:r1-delhi-lucknow-via-kanpur'), r2: U('route:r2-delhi-kanpur'),
    r3: U('route:r3-delhi-lucknow-express'), r4: U('route:r4-kanpur-lucknow'),
    r5: U('route:r5-kanpur-delhi-empty'),
  },
  schedules: {
    s1: U('schedule:s1'), s2: U('schedule:s2'), s3: U('schedule:s3'),
    s4: U('schedule:s4'), s5: U('schedule:s5'), s6: U('schedule:s6'),
    s7: U('schedule:s7'), s8: U('schedule:s8'), s9: U('schedule:s9'),
    s10: U('schedule:s10'), s11: U('schedule:s11'), s12: U('schedule:s12'),
    s13: U('schedule:s13'), s14: U('schedule:s14'), s15: U('schedule:s15'),
  },
};

export const CITIES = [
  { id: IDS.cities.delhi, name: 'Delhi', state: 'Delhi NCT', isActive: true },
  { id: IDS.cities.kanpur, name: 'Kanpur', state: 'Uttar Pradesh', isActive: true },
  { id: IDS.cities.lucknow, name: 'Lucknow', state: 'Uttar Pradesh', isActive: true },
];

export interface StandData {
  id: string; cityId: string; name: string;
  type: string; typeFallback: string;
  lat: number; lng: number;
}

export const STANDS: StandData[] = [
  { id: IDS.stands.kashmere, cityId: IDS.cities.delhi, name: 'Kashmere Gate ISBT', type: 'BUS_STAND', typeFallback: 'BUS_STAND', lat: 28.6675, lng: 77.2285 },
  { id: IDS.stands.anandvihar, cityId: IDS.cities.delhi, name: 'Anand Vihar ISBT', type: 'BUS_STAND', typeFallback: 'BUS_STAND', lat: 28.6469, lng: 77.3162 },
  { id: IDS.stands.dhaulakuan, cityId: IDS.cities.delhi, name: 'Dhaula Kuan', type: 'BUS_STOP', typeFallback: 'PICKUP_POINT', lat: 28.5921, lng: 77.1610 },
  { id: IDS.stands.igi, cityId: IDS.cities.delhi, name: 'IGI Airport T3', type: 'AIRPORT', typeFallback: 'PICKUP_POINT', lat: 28.5562, lng: 77.0865 },
  { id: IDS.stands.jhakarkati, cityId: IDS.cities.kanpur, name: 'Jhakarkati Bus Stand', type: 'BUS_STAND', typeFallback: 'BUS_STAND', lat: 26.4611, lng: 80.3203 },
  { id: IDS.stands.kalyanpur, cityId: IDS.cities.kanpur, name: 'Kalyanpur', type: 'BUS_STOP', typeFallback: 'PICKUP_POINT', lat: 26.5072, lng: 80.2497 },
  { id: IDS.stands.kanpurcentral, cityId: IDS.cities.kanpur, name: 'Kanpur Central', type: 'TRAIN_STATION', typeFallback: 'PICKUP_POINT', lat: 26.4568, lng: 80.3492 },
  { id: IDS.stands.alambagh, cityId: IDS.cities.lucknow, name: 'Alambagh Bus Terminal', type: 'BUS_STAND', typeFallback: 'BUS_STAND', lat: 26.8111, lng: 80.8948 },
  { id: IDS.stands.kaiserbagh, cityId: IDS.cities.lucknow, name: 'Kaiserbagh Bus Stand', type: 'BUS_STAND', typeFallback: 'BUS_STAND', lat: 26.8505, lng: 80.9276 },
  { id: IDS.stands.charbagh, cityId: IDS.cities.lucknow, name: 'Charbagh Railway Station', type: 'TRAIN_STATION', typeFallback: 'PICKUP_POINT', lat: 26.8316, lng: 80.9198 },
  { id: IDS.stands.amausi, cityId: IDS.cities.lucknow, name: 'Amausi Airport', type: 'AIRPORT', typeFallback: 'PICKUP_POINT', lat: 26.7606, lng: 80.8893 },
];
export const OPERATORS = [
  { id: IDS.operators.sharma, companyName: 'Sharma Travels', gstin: '07AABCS1429B1Z1', pan: 'AABCS1429B', bankRef: '1234567890', status: 'ACTIVE', statusFallback: 'APPROVED' },
  { id: IDS.operators.rajdhani, companyName: 'Rajdhani Express', gstin: '07AABCR8888C1Z2', pan: 'AABCR8888C', bankRef: '9876543210', status: 'ACTIVE', statusFallback: 'APPROVED' },
  { id: IDS.operators.northern, companyName: 'Northern Deluxe Coaches', gstin: '07AABCD4321E1Z3', pan: 'AABCD4321E', bankRef: '5556667777', status: 'ACTIVE', statusFallback: 'APPROVED' },
];

export const OPERATOR_USERS = [
  { id: IDS.opUsers.sharmaOwner, userId: IDS.users.sharmaOwner, operatorId: IDS.operators.sharma, role: 'OWNER', email: 'sharma@busverse.app', phone: '+919876540001', name: 'Sharma Ji', invitedBy: null as string | null },
  { id: IDS.opUsers.rajdhaniOwner, userId: IDS.users.rajdhaniOwner, operatorId: IDS.operators.rajdhani, role: 'OWNER', email: 'rajdhani@busverse.app', phone: '+919876540002', name: 'Rajdhani Ji', invitedBy: null as string | null },
  { id: IDS.opUsers.northernOwner, userId: IDS.users.northernOwner, operatorId: IDS.operators.northern, role: 'OWNER', email: 'northern@busverse.app', phone: '+919876540003', name: 'Northern Ji', invitedBy: null as string | null },
  { id: IDS.opUsers.rajdhaniMgr, userId: IDS.users.rajdhaniMgr, operatorId: IDS.operators.rajdhani, role: 'MANAGER', email: 'kapoor@rajdhaniexpress.co.in', phone: '+919876540004', name: 'Kapoor Ji', invitedBy: IDS.users.rajdhaniOwner },
  { id: IDS.opUsers.northernMgr, userId: IDS.users.northernMgr, operatorId: IDS.operators.northern, role: 'MANAGER', email: 'malhotra@northerndeluxe.co.in', phone: '+919876540005', name: 'Malhotra Ji', invitedBy: IDS.users.northernOwner },
];

export const ADMIN_USER = {
  id: IDS.adminUser, userId: IDS.users.admin,
  email: 'admin@busverse.app', phone: '+919876540000', name: 'Shaghaf',
};

export const DRIVERS = [
  { profileId: IDS.driverProfile.ravi, userId: IDS.users.driver1, operatorId: IDS.operators.sharma, phone: '+919876540011', name: 'Ravi Kumar', license: 'DL-0420200000001' },
  { profileId: IDS.driverProfile.suresh, userId: IDS.users.driver2, operatorId: IDS.operators.sharma, phone: '+919876540012', name: 'Suresh Yadav', license: 'DL-0420200000002' },
  { profileId: IDS.driverProfile.mahesh, userId: IDS.users.driver3, operatorId: IDS.operators.rajdhani, phone: '+919876540013', name: 'Mahesh Singh', license: 'DL-0420200000003' },
  { profileId: IDS.driverProfile.arjun, userId: IDS.users.driver4, operatorId: IDS.operators.rajdhani, phone: '+919876540014', name: 'Arjun Verma', license: 'UP-3220200000004' },
  { profileId: IDS.driverProfile.vikram, userId: IDS.users.driver5, operatorId: IDS.operators.northern, phone: '+919876540015', name: 'Vikram Sharma', license: 'UP-3220200000005' },
];

export const PASSENGERS = [
  { profileId: IDS.passengerProfile.alice, userId: IDS.users.passenger1, phone: '+919876543210', email: 'alice@example.com', name: 'Alice Gupta' },
  { profileId: IDS.passengerProfile.bob, userId: IDS.users.passenger2, phone: '+919876543211', email: 'bob@example.com', name: 'Bob Mehta' },
  { profileId: IDS.passengerProfile.carol, userId: IDS.users.passenger3, phone: '+919876543212', email: 'carol@example.com', name: 'Carol Iyer' },
  { profileId: IDS.passengerProfile.dave, userId: IDS.users.passenger4, phone: '+919876543213', email: 'dave@example.com', name: 'Dave Patel' },
  { profileId: IDS.passengerProfile.eve, userId: IDS.users.passenger5, phone: '+919876543214', email: 'eve@example.com', name: 'Eve Khan' },
];

export interface BusData {
  id: string; operatorId: string; registrationNumber: string; model: string;
  busType: string; busTypeFallback: string; capacity: number;
  amenities: string[];
}

export const BUSES: BusData[] = [
  { id: IDS.buses.dl1p1234, operatorId: IDS.operators.sharma, registrationNumber: 'DL-1P-1234', model: 'Volvo Multi-Axle B11R', busType: 'AC_SLEEPER', busTypeFallback: 'SLEEPER', capacity: 30, amenities: ['CHARGING', 'WIFI', 'WATER', 'BLANKET'] },
  { id: IDS.buses.dl1p5678, operatorId: IDS.operators.sharma, registrationNumber: 'DL-1P-5678', model: 'Ashok Leyland 12M', busType: 'AC_SEATER', busTypeFallback: 'SEATER', capacity: 40, amenities: ['CHARGING', 'WIFI'] },
  { id: IDS.buses.dl1p2345, operatorId: IDS.operators.rajdhani, registrationNumber: 'DL-1P-2345', model: 'Volvo 9600', busType: 'AC_SEATER', busTypeFallback: 'SEATER', capacity: 40, amenities: ['CHARGING', 'WIFI', 'WATER', 'BLANKET', 'CCTV'] },
  { id: IDS.buses.dl1p3456, operatorId: IDS.operators.rajdhani, registrationNumber: 'DL-1P-3456', model: 'Volvo B11R Sleeper', busType: 'AC_SLEEPER', busTypeFallback: 'SLEEPER', capacity: 30, amenities: ['CHARGING', 'WIFI', 'WATER'] },
  { id: IDS.buses.dl1p6789, operatorId: IDS.operators.rajdhani, registrationNumber: 'DL-1P-6789', model: 'Tata Marcopolo', busType: 'AC_SEATER', busTypeFallback: 'SEATER', capacity: 40, amenities: ['CHARGING', 'WIFI'] },
  { id: IDS.buses.up32ab1111, operatorId: IDS.operators.northern, registrationNumber: 'UP-32AB-1111', model: 'Ashok Leyland Viking', busType: 'NON_AC_SEATER', busTypeFallback: 'AC_SEATER', capacity: 40, amenities: ['CHARGING'] },
  { id: IDS.buses.up32ab2222, operatorId: IDS.operators.northern, registrationNumber: 'UP-32AB-2222', model: 'Volvo 9400 Sleeper', busType: 'AC_SLEEPER', busTypeFallback: 'SLEEPER', capacity: 30, amenities: ['WIFI', 'WATER'] },
];

export interface LayoutData {
  id: string; busId: string; rowsCount: number; columnsCount: number;
  seatType: 'SEATER' | 'SLEEPER';
  femaleColumn: number; femaleRows: string[];
}

export const LAYOUTS: LayoutData[] = [
  { id: IDS.layouts.dl1p1234, busId: IDS.buses.dl1p1234, rowsCount: 10, columnsCount: 3, seatType: 'SLEEPER', femaleColumn: 3, femaleRows: ['A', 'E', 'I'] },
  { id: IDS.layouts.dl1p5678, busId: IDS.buses.dl1p5678, rowsCount: 10, columnsCount: 4, seatType: 'SEATER', femaleColumn: 4, femaleRows: ['A', 'D', 'G', 'J'] },
  { id: IDS.layouts.dl1p2345, busId: IDS.buses.dl1p2345, rowsCount: 10, columnsCount: 4, seatType: 'SEATER', femaleColumn: 4, femaleRows: ['A', 'D', 'G', 'J'] },
  { id: IDS.layouts.dl1p3456, busId: IDS.buses.dl1p3456, rowsCount: 10, columnsCount: 3, seatType: 'SLEEPER', femaleColumn: 3, femaleRows: ['A', 'E', 'I'] },
  { id: IDS.layouts.dl1p6789, busId: IDS.buses.dl1p6789, rowsCount: 10, columnsCount: 4, seatType: 'SEATER', femaleColumn: 4, femaleRows: ['A', 'D', 'G', 'J'] },
  { id: IDS.layouts.up32ab1111, busId: IDS.buses.up32ab1111, rowsCount: 10, columnsCount: 4, seatType: 'SEATER', femaleColumn: 4, femaleRows: ['A', 'D', 'G', 'J'] },
  { id: IDS.layouts.up32ab2222, busId: IDS.buses.up32ab2222, rowsCount: 10, columnsCount: 3, seatType: 'SLEEPER', femaleColumn: 3, femaleRows: ['A', 'E', 'I'] },
];

export const ROUTES = [
  { id: IDS.routes.r1, operatorId: IDS.operators.sharma, originCityId: IDS.cities.delhi, destinationCityId: IDS.cities.lucknow, approvalStatus: 'APPROVED' },
  { id: IDS.routes.r2, operatorId: IDS.operators.sharma, originCityId: IDS.cities.delhi, destinationCityId: IDS.cities.kanpur, approvalStatus: 'APPROVED' },
  { id: IDS.routes.r3, operatorId: IDS.operators.rajdhani, originCityId: IDS.cities.delhi, destinationCityId: IDS.cities.lucknow, approvalStatus: 'APPROVED' },
  { id: IDS.routes.r4, operatorId: IDS.operators.northern, originCityId: IDS.cities.kanpur, destinationCityId: IDS.cities.lucknow, approvalStatus: 'APPROVED' },
  { id: IDS.routes.r5, operatorId: IDS.operators.sharma, originCityId: IDS.cities.kanpur, destinationCityId: IDS.cities.delhi, approvalStatus: 'APPROVED' },
];
export const ROUTE_STANDS = [
  { routeId: IDS.routes.r1, standId: IDS.stands.kashmere, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
  { routeId: IDS.routes.r1, standId: IDS.stands.dhaulakuan, sequence: 2, distanceFromPrevKm: 15, durationFromPrevMin: 20 },
  { routeId: IDS.routes.r1, standId: IDS.stands.jhakarkati, sequence: 3, distanceFromPrevKm: 465, durationFromPrevMin: 280 },
  { routeId: IDS.routes.r1, standId: IDS.stands.alambagh, sequence: 4, distanceFromPrevKm: 80, durationFromPrevMin: 150 },
  { routeId: IDS.routes.r2, standId: IDS.stands.kashmere, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
  { routeId: IDS.routes.r2, standId: IDS.stands.dhaulakuan, sequence: 2, distanceFromPrevKm: 15, durationFromPrevMin: 20 },
  { routeId: IDS.routes.r2, standId: IDS.stands.kalyanpur, sequence: 3, distanceFromPrevKm: 460, durationFromPrevMin: 265 },
  { routeId: IDS.routes.r2, standId: IDS.stands.jhakarkati, sequence: 4, distanceFromPrevKm: 5, durationFromPrevMin: 15 },
  { routeId: IDS.routes.r3, standId: IDS.stands.kashmere, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
  { routeId: IDS.routes.r3, standId: IDS.stands.kalyanpur, sequence: 2, distanceFromPrevKm: 505, durationFromPrevMin: 410 },
  { routeId: IDS.routes.r3, standId: IDS.stands.alambagh, sequence: 3, distanceFromPrevKm: 7, durationFromPrevMin: 10 },
  { routeId: IDS.routes.r4, standId: IDS.stands.jhakarkati, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
  { routeId: IDS.routes.r4, standId: IDS.stands.alambagh, sequence: 2, distanceFromPrevKm: 80, durationFromPrevMin: 90 },
  { routeId: IDS.routes.r5, standId: IDS.stands.jhakarkati, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
  { routeId: IDS.routes.r5, standId: IDS.stands.kashmere, sequence: 2, distanceFromPrevKm: 480, durationFromPrevMin: 300 },
];

export type ScheduleRow = {
  id: string; dayOffset: number; busId: string; routeId: string;
  departureH: number; departureM: number;
  arrivalDayOffset: number; arrivalH: number; arrivalM: number;
  farePaise: bigint;
};

export const SCHEDULES: ScheduleRow[] = [
  { id: IDS.schedules.s1, dayOffset: 1, busId: IDS.buses.dl1p1234, routeId: IDS.routes.r1, departureH: 22, departureM: 0, arrivalDayOffset: 1, arrivalH: 5, arrivalM: 30, farePaise: 150000n },
  { id: IDS.schedules.s2, dayOffset: 1, busId: IDS.buses.dl1p5678, routeId: IDS.routes.r1, departureH: 14, departureM: 0, arrivalDayOffset: 0, arrivalH: 21, arrivalM: 30, farePaise: 85000n },
  { id: IDS.schedules.s3, dayOffset: 1, busId: IDS.buses.dl1p1234, routeId: IDS.routes.r1, departureH: 21, departureM: 0, arrivalDayOffset: 1, arrivalH: 4, arrivalM: 30, farePaise: 120000n },
  { id: IDS.schedules.s4, dayOffset: 1, busId: IDS.buses.dl1p2345, routeId: IDS.routes.r3, departureH: 6, departureM: 0, arrivalDayOffset: 0, arrivalH: 13, arrivalM: 0, farePaise: 95000n },
  { id: IDS.schedules.s5, dayOffset: 1, busId: IDS.buses.dl1p3456, routeId: IDS.routes.r3, departureH: 14, departureM: 0, arrivalDayOffset: 0, arrivalH: 21, arrivalM: 0, farePaise: 140000n },
  { id: IDS.schedules.s6, dayOffset: 1, busId: IDS.buses.dl1p6789, routeId: IDS.routes.r3, departureH: 20, departureM: 0, arrivalDayOffset: 1, arrivalH: 3, arrivalM: 0, farePaise: 105000n },
  { id: IDS.schedules.s7, dayOffset: 1, busId: IDS.buses.dl1p5678, routeId: IDS.routes.r2, departureH: 8, departureM: 0, arrivalDayOffset: 0, arrivalH: 13, arrivalM: 0, farePaise: 60000n },
  { id: IDS.schedules.s8, dayOffset: 1, busId: IDS.buses.dl1p5678, routeId: IDS.routes.r2, departureH: 15, departureM: 0, arrivalDayOffset: 0, arrivalH: 20, arrivalM: 0, farePaise: 55000n },
  { id: IDS.schedules.s9, dayOffset: 1, busId: IDS.buses.up32ab1111, routeId: IDS.routes.r4, departureH: 10, departureM: 0, arrivalDayOffset: 0, arrivalH: 11, arrivalM: 30, farePaise: 40000n },
  { id: IDS.schedules.s10, dayOffset: 3, busId: IDS.buses.dl1p5678, routeId: IDS.routes.r1, departureH: 14, departureM: 0, arrivalDayOffset: 0, arrivalH: 21, arrivalM: 30, farePaise: 85000n },
  { id: IDS.schedules.s11, dayOffset: 3, busId: IDS.buses.dl1p2345, routeId: IDS.routes.r3, departureH: 6, departureM: 0, arrivalDayOffset: 0, arrivalH: 13, arrivalM: 0, farePaise: 95000n },
  { id: IDS.schedules.s12, dayOffset: 3, busId: IDS.buses.dl1p3456, routeId: IDS.routes.r3, departureH: 20, departureM: 0, arrivalDayOffset: 1, arrivalH: 3, arrivalM: 0, farePaise: 140000n },
  { id: IDS.schedules.s13, dayOffset: 5, busId: IDS.buses.dl1p1234, routeId: IDS.routes.r1, departureH: 22, departureM: 0, arrivalDayOffset: 1, arrivalH: 5, arrivalM: 30, farePaise: 150000n },
  { id: IDS.schedules.s14, dayOffset: 5, busId: IDS.buses.dl1p6789, routeId: IDS.routes.r3, departureH: 14, departureM: 0, arrivalDayOffset: 0, arrivalH: 21, arrivalM: 0, farePaise: 105000n },
  { id: IDS.schedules.s15, dayOffset: 5, busId: IDS.buses.dl1p3456, routeId: IDS.routes.r3, departureH: 22, departureM: 0, arrivalDayOffset: 1, arrivalH: 5, arrivalM: 0, farePaise: 140000n },
];

export const DEMO_PASSWORD = 'Demo1234!@Abc';
export const ADMIN_PASSWORD = 'Demo1234!@AbcAdmin';
export const CONSENT_PURPOSES = ['terms_of_service', 'privacy_policy'] as const;
export const CONSENT_POLICY_VERSION = 'v1.0';

export const ALL_USER_IDS = [
  IDS.users.sharmaOwner, IDS.users.rajdhaniOwner, IDS.users.northernOwner,
  IDS.users.rajdhaniMgr, IDS.users.northernMgr,
  IDS.users.admin,
  IDS.users.driver1, IDS.users.driver2, IDS.users.driver3, IDS.users.driver4, IDS.users.driver5,
  IDS.users.passenger1, IDS.users.passenger2, IDS.users.passenger3, IDS.users.passenger4, IDS.users.passenger5,
];