import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../styles/theme';
import { getSupabase } from '../../../services/supabase';

interface EditProfileForm {
  displayName: string;
  phone: string;
  email: string;
}

export default function EditProfile() {
  const [form, setForm] = useState<EditProfileForm>({
    displayName: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user }, error } = await getSupabase().auth.updateUser({
        email: form.email,
        data: {
          display_name: form.displayName,
          phone: form.phone,
        }
      });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={40} color={theme.colors.text.inverse} />
          </View>
          <Pressable style={styles.changeAvatarButton}>
            <MaterialIcons name="camera-alt" size={20} color={theme.colors.primary} />
            <Text style={styles.changeAvatarText}>Change Photo</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={form.displayName}
              onChangeText={(text) => setForm(prev => ({ ...prev, displayName: text }))}
              placeholder="Enter your display name"
              placeholderTextColor={theme.colors.text.secondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  changeAvatarText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
  },
  form: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
}); 