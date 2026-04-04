import { Button, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useApifyBalance } from '@/hooks/use-apify-balance';
import { useSecureString } from '@/hooks/use-secure-string';

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export default function ExploreScreen() {
  const { value: token, loading: tokenLoading } = useSecureString('apifyToken');
  const { balance, loading, errorMessage, refreshBalance } = useApifyBalance(token);
  const hasToken = token.trim().length > 0;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="banknote"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Explore
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.balanceCard}>
        <ThemedText type="subtitle">Apify Balance</ThemedText>
        {tokenLoading ? <ThemedText>Checking secure token...</ThemedText> : null}
        {!tokenLoading && !hasToken ? (
          <ThemedText>Token not configured. Please save your token in Settings first.</ThemedText>
        ) : null}
        {!tokenLoading && hasToken && loading ? <ThemedText>Loading latest balance...</ThemedText> : null}
        {!tokenLoading && hasToken && !loading && balance ? (
          <>
            <ThemedText style={styles.balanceValue}>{formatUsd(balance.amount)}</ThemedText>
            <ThemedText style={styles.balanceHint}>Source: {balance.source}</ThemedText>
          </>
        ) : null}
        {!tokenLoading && hasToken && !loading && !balance && !errorMessage ? (
          <ThemedText>Unable to load balance right now.</ThemedText>
        ) : null}
        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
        <Button
          disabled={!hasToken || loading}
          onPress={() => void refreshBalance()}
          title={loading ? 'Refreshing...' : 'Refresh balance'}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d7de',
    padding: 16,
  },
  balanceValue: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: Fonts.rounded,
  },
  balanceHint: {
    color: '#667085',
    fontFamily: Fonts.mono,
  },
  errorText: {
    color: '#b42318',
  },
});
