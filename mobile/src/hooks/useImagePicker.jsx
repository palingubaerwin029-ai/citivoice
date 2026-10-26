import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export async function optimizeImage(uri, maxWidth = 1280, quality = 0.7) {
  if (!uri) return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (err) {
    console.warn('Image optimization skipped, using original:', err);
    return uri;
  }
}

export function useImagePicker() {
  const pickImage = async (options = {}) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return null;
      }

      const defaultOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
      };

      const result = await ImagePicker.launchImageLibraryAsync({
        ...defaultOptions,
        ...options,
        // On Android, native crop activity often causes the parent activity to be killed by the OS
        allowsEditing: Platform.OS === 'ios' ? (options.allowsEditing ?? false) : false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawUri = result.assets[0].uri;
        return await optimizeImage(rawUri, options.maxWidth || 1280, options.quality || 0.7);
      }
      return null;
    } catch (err) {
      console.warn('Image picker error:', err);
      return null;
    }
  };

  const takePhoto = async (options = {}) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return null;
      }

      const defaultOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
      };

      const result = await ImagePicker.launchCameraAsync({
        ...defaultOptions,
        ...options,
        allowsEditing: Platform.OS === 'ios' ? (options.allowsEditing ?? false) : false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawUri = result.assets[0].uri;
        return await optimizeImage(rawUri, options.maxWidth || 1280, options.quality || 0.7);
      }
      return null;
    } catch (err) {
      console.warn('Camera capture error:', err);
      return null;
    }
  };

  return {
    pickImage,
    takePhoto,
  };
}

