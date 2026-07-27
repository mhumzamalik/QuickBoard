import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // true when Supabase requires email confirmation (no session returned)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    let valid = true;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFullNameError('Full Name is required.');
      valid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      setFullNameError('Full Name must be between 2 and 100 characters.');
      valid = false;
    } else {
      setFullNameError(null);
    }

    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    } else {
      setPasswordError(null);
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password.');
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmError('Passwords do not match.');
      valid = false;
    } else {
      setConfirmError(null);
    }

    return valid;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    setServerError(null);

    try {
      const trimmedName = fullName.trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: trimmedName,
            full_name: trimmedName,
          },
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      if (data?.user) {
        // Upsert user profile to guarantee full name is saved
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: trimmedName,
        });
      }

      if (!data.session) {
        // Email confirmation is enabled on this Supabase project.
        // Show the "check your email" state — user must confirm before signing in.
        setAwaitingConfirmation(true);
      }
      // If data.session is present, useAuth's onAuthStateChange fires automatically
      // and RootNavigator switches to the authenticated stack. Nothing to do here.
    } catch (e: unknown) {
      setServerError(
        e instanceof Error ? e.message : 'Sign up failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Email confirmation required state ---
  if (awaitingConfirmation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.confirmedBox}>
          <Text style={styles.confirmedIcon}>✉️</Text>
          <Text style={styles.confirmedTitle}>Check your email</Text>
          <Text style={styles.confirmedBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmedEmail}>{email.trim()}</Text>
            {'\n\n'}Open it to activate your account, then sign in.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Sign Up form ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join QuickBoard to manage your tasks</Text>

        {serverError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        ) : null}

        {/* Full Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, fullNameError ? styles.inputError : null]}
            placeholder="Enter your full name"
            placeholderTextColor="#64748b"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              setFullNameError(null);
            }}
            autoCapitalize="words"
            autoComplete="name"
          />
          {fullNameError ? (
            <Text style={styles.fieldError}>{fullNameError}</Text>
          ) : null}
        </View>

        {/* Email */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="Min. 8 characters"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setPasswordError(null);
            }}
            secureTextEntry
            autoComplete="new-password"
          />
          {passwordError ? (
            <Text style={styles.fieldError}>{passwordError}</Text>
          ) : null}
        </View>

        {/* Confirm Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[styles.input, confirmError ? styles.inputError : null]}
            placeholder="Repeat your password"
            placeholderTextColor="#64748b"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setConfirmError(null);
            }}
            secureTextEntry
            autoComplete="new-password"
          />
          {confirmError ? (
            <Text style={styles.fieldError}>{confirmError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  // Email confirmation state
  confirmedBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmedBody: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmedEmail: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
