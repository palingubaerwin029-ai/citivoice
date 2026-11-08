import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMsg = this.state.error?.message || 'An unexpected application error occurred.';
    const componentStack = this.state.errorInfo?.componentStack || '';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#070D1A" />
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={32} color="#EF4444" />
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred in this screen. You can try refreshing the view to continue.
          </Text>

          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
            <Text style={styles.errorBannerText} numberOfLines={3}>
              {errorMsg}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={this.handleReload}
            >
              <Ionicons name="refresh-outline" size={16} color="#070D1A" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
            >
              <Text style={styles.secondaryButtonText}>
                {this.state.showDetails ? 'Hide Details' : 'View Details'}
              </Text>
            </TouchableOpacity>
          </View>

          {this.state.showDetails && (
            <View style={styles.detailsBox}>
              <ScrollView style={styles.detailsScroll} nestedScrollEnabled>
                <Text style={styles.detailsLabel}>Error Trace:</Text>
                <Text style={styles.detailsCode}>
                  {this.state.error?.stack || errorMsg}
                </Text>
                {Boolean(componentStack) && (
                  <>
                    <Text style={[styles.detailsLabel, { marginTop: 10 }]}>Component Hierarchy:</Text>
                    <Text style={styles.detailsCode}>{componentStack}</Text>
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0D1B2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#EAB308',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#070D1A',
  },
  secondaryButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  detailsBox: {
    marginTop: 16,
    width: '100%',
    maxHeight: 160,
    backgroundColor: '#070D1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  detailsCode: {
    fontFamily: 'monospace',
    fontSize: 10.5,
    color: '#E2E8F0',
    lineHeight: 14,
  },
});

