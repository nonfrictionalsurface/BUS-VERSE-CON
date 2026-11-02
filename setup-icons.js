const fs = require('fs');
const path = require('path');

const rootDir = 'D:/Bus-booking-proj2/BUS_project';
const destinations = [
  path.join(rootDir, 'apps', 'driver-app', 'node_modules', '@expo', 'vector-icons'),
  path.join(rootDir, 'node_modules', '@expo', 'vector-icons')
];

// Clean out existing broken junctions or partial copies
for (const dest of destinations) {
  try {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(dest);
    } else {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  } catch (e) {}

  fs.mkdirSync(dest, { recursive: true });
  fs.mkdirSync(path.join(dest, 'build'), { recursive: true });
}

const pkgJson = JSON.stringify({
  name: '@expo/vector-icons',
  version: '14.1.0',
  main: 'index.js',
  module: 'index.js'
}, null, 2);

const iconJsContent = `
var React = require('react');
var RN = require('react-native');
var Platform = RN.Platform;
var View = RN.View;

var RNSvg = null;
if (Platform.OS !== 'web') {
  try {
    RNSvg = require('react-native-svg');
  } catch (e) {}
}

var ICONS = {
  'bus': { d: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z', fill: true },
  'person': { d: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', fill: true },
  'person-outline': { d: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', stroke: true },
  'people-outline': { d: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', fill: true },
  'lock-closed': { d: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', fill: true },
  'lock-closed-outline': { d: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', stroke: true },
  'arrow-forward': { d: 'M5 12h14M12 5l7 7-7 7', stroke: true },
  'arrow-back': { d: 'M19 12H5M12 19l-7-7 7-7', stroke: true },
  'chevron-forward': { d: 'M9 5l7 7-7 7', stroke: true },
  'chevron-down': { d: 'M19 9l-7 7-7-7', stroke: true },
  'checkmark': { d: 'M5 13l4 4L19 7', stroke: true },
  'checkmark-circle': { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', fill: true },
  'checkmark-done': { d: 'M18 7l-9.5 9.5-3.5-3.5 1.41-1.41 2.09 2.09L16.59 5.59 18 7zm4 0l-9.5 9.5-1.41-1.41L19.17 6.59 22 7z', fill: true },
  'close': { d: 'M18 6L6 18M6 6l12 12', stroke: true },
  'close-circle': { d: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z', fill: true },
  'refresh': { d: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z', fill: true },
  'radio': { d: 'M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-8c4.41 0 8 3.59 8 8 0 1.48-.41 2.86-1.12 4.06l1.46 1.46C21.35 18.98 22 17.07 22 15c0-5.52-4.48-10-10-10S2 9.48 2 15c0 2.07.65 3.98 1.66 5.52l1.46-1.46C4.41 17.86 4 16.48 4 15c0-4.41 3.59-8 8-8z', fill: true },
  'radio-outline': { d: 'M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-8c4.41 0 8 3.59 8 8 0 1.48-.41 2.86-1.12 4.06l1.46 1.46C21.35 18.98 22 17.07 22 15c0-5.52-4.48-10-10-10S2 9.48 2 15c0 2.07.65 3.98 1.66 5.52l1.46-1.46C4.41 17.86 4 16.48 4 15c0-4.41 3.59-8 8-8z', stroke: true },
  'time-outline': { d: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z', fill: true },
  'speedometer': { d: 'M12 4C6.48 4 2 8.48 2 14c0 2.49.91 4.77 2.42 6.53.37.43.98.54 1.47.27.46-.25.68-.8.47-1.3C5.07 18.06 4.5 16.1 4.5 14c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5c0 2.1-.57 4.06-1.86 5.5-.21.5.01 1.05.47 1.3.49.27 1.1.16 1.47-.27C21.09 18.77 22 16.49 22 14c0-5.52-4.48-10-10-10zm-1 6v5.27c-.6.34-1 .98-1 1.73 0 1.1.9 2 2 2s2-.9 2-2c0-.75-.4-1.39-1-1.73V10h-2z', fill: true },
  'speedometer-outline': { d: 'M12 4C6.48 4 2 8.48 2 14c0 2.49.91 4.77 2.42 6.53.37.43.98.54 1.47.27.46-.25.68-.8.47-1.3C5.07 18.06 4.5 16.1 4.5 14c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5c0 2.1-.57 4.06-1.86 5.5-.21.5.01 1.05.47 1.3.49.27 1.1.16 1.47-.27C21.09 18.77 22 16.49 22 14c0-5.52-4.48-10-10-10zm-1 6v5.27c-.6.34-1 .98-1 1.73 0 1.1.9 2 2 2s2-.9 2-2c0-.75-.4-1.39-1-1.73V10h-2z', stroke: true },
  'walk-outline': { d: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z', fill: true },
  'qr-code': { d: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-5 0h2v2h-2zm0 4h2v4h-2zm2 0h4v2h-4zm0 2h2v2h-2zm2-4h2v2h-2zm2 2h2v2h-2z', fill: true },
  'qr-code-outline': { d: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-5 0h2v2h-2zm0 4h2v4h-2zm2 0h4v2h-4zm0 2h2v2h-2zm2-4h2v2h-2zm2 2h2v2h-2z', fill: true },
  'list': { d: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z', fill: true },
  'flag': { d: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z', fill: true },
  'alert-circle': { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z', fill: true },
  'warning-outline': { d: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', stroke: true },
  'shield-checkmark': { d: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z', fill: true },
  'shield-checkmark-outline': { d: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z', stroke: true },
  'cloud-upload-outline': { d: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z', fill: true },
  'card-outline': { d: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z', stroke: true },
  'document-text-outline': { d: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z', stroke: true },
  'camera-outline': { d: 'M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z', stroke: true },
  'pencil': { d: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', fill: true },
  'navigate': { d: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z', fill: true },
  'add': { d: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', fill: true },
  'add-circle': { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z', fill: true },
  'log-out-outline': { d: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z', stroke: true },
  'map': { d: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z', fill: true },
  'map-outline': { d: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z', stroke: true },
  'receipt-outline': { d: 'M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z', stroke: true },
  'locate': { d: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z', stroke: true },
  'search': { d: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z', fill: true }
};

function renderIcon(props) {
  var name = props && props.name ? props.name : 'radio';
  var size = props && props.size ? props.size : 24;
  var color = props && props.color ? props.color : '#F0FDF4';
  var style = props && props.style ? props.style : {};

  var icon = ICONS[name] || ICONS['radio'];

  if (Platform.OS === 'web') {
    return React.createElement('svg', {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      style: Object.assign({ display: 'inline-block', verticalAlign: 'middle' }, style),
      fill: icon.fill ? color : 'none',
      stroke: icon.stroke ? color : 'none',
      strokeWidth: icon.stroke ? 2 : undefined,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, React.createElement('path', { d: icon.d }));
  }

  if (RNSvg && RNSvg.Svg && RNSvg.Path) {
    return React.createElement(RNSvg.Svg, {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      style: style
    }, React.createElement(RNSvg.Path, {
      d: icon.d,
      fill: icon.fill ? color : 'none',
      stroke: icon.stroke ? color : 'none',
      strokeWidth: icon.stroke ? 2 : undefined,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }));
  }

  return React.createElement(View, { style: [{ width: size, height: size }, style] });
}

function Ionicons(props) {
  return renderIcon(props);
}

module.exports = {
  Ionicons: Ionicons,
  MaterialIcons: Ionicons,
  FontAwesome: Ionicons,
  Feather: Ionicons,
  Entypo: Ionicons,
  AntDesign: Ionicons,
  createIconSet: function() { return Ionicons; },
  default: Ionicons
};
`;

for (const dest of destinations) {
  fs.writeFileSync(path.join(dest, 'package.json'), pkgJson, 'utf8');
  fs.writeFileSync(path.join(dest, 'index.js'), iconJsContent, 'utf8');
  fs.writeFileSync(path.join(dest, 'Ionicons.js'), iconJsContent, 'utf8');
  fs.writeFileSync(path.join(dest, 'build', 'index.js'), iconJsContent, 'utf8');
  fs.writeFileSync(path.join(dest, 'build', 'Ionicons.js'), iconJsContent, 'utf8');
  fs.writeFileSync(path.join(dest, 'build', 'createIconSet.js'), iconJsContent, 'utf8');
}

console.log('SETUP_COMPLETE_SUCCESS');