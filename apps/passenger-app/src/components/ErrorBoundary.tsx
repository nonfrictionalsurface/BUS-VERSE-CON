import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error?.message, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={s.root}>
        <Text style={s.title}>Something broke</Text>
        <Text style={s.hint}>Screenshot this card and send to the dev.</Text>
        <ScrollView style={s.box}>
          <Text style={s.errText}>{this.state.error?.message ?? 'Unknown error'}</Text>
          {this.state.error?.stack ? (
            <Text style={s.stackText}>{this.state.error.stack}</Text>
          ) : null}
        </ScrollView>
        <Pressable
          style={s.btn}
          onPress={() => this.setState({ hasError: false, error: null })}
        >
          <Text style={s.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060A12', padding: 24, paddingTop: 60 },
  title: { color: '#F87171', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  hint: { color: '#FCA5A5', fontSize: 13, marginBottom: 16 },
  box: { flex: 1, backgroundColor: '#03060A', borderRadius: 8, padding: 12, marginBottom: 16 },
  errText: { color: '#F87171', fontSize: 14, marginBottom: 12, fontWeight: '700' },
  stackText: { color: '#86EFAC', fontSize: 11, fontFamily: 'monospace' },
  btn: { backgroundColor: '#2B75FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});

export default ErrorBoundary;