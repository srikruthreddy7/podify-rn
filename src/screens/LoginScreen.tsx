import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const result = await authService.signInWithGoogle();
    
    if (!result.success) {
      setError(result.error || 'Failed to sign in');
    }
    
    setIsLoading(false);
  };

  return (
    <LinearGradient
      colors={isDark 
        ? ['#0f0f23', '#1a1a2e', '#16213e'] 
        : ['#667eea', '#764ba2', '#f093fb']
      }
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo/Brand Section */}
          <View style={styles.brandSection}>
            <View style={[styles.logoContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.logoEmoji}>🎧</Text>
            </View>
            <Text style={styles.appName}>Podify</Text>
            <Text style={styles.tagline}>Your intelligent podcast companion</Text>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <FeatureItem 
              emoji="🎯" 
              title="Resume Anywhere"
              description="Pick up right where you left off"
            />
            <FeatureItem 
              emoji="📚" 
              title="Sync History"
              description="Your listening history across all devices"
            />
            <FeatureItem 
              emoji="🎤" 
              title="Voice Control"
              description="Hands-free podcast control"
            />
          </View>

          {/* Login Section */}
          <View style={styles.loginSection}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#333" size="small" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

interface FeatureItemProps {
  emoji: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ emoji, title, description }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 56,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  featuresSection: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
  },
  featureEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  loginSection: {
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.4)',
  },
  errorText: {
    color: '#ff8888',
    fontSize: 14,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});

export default LoginScreen;


