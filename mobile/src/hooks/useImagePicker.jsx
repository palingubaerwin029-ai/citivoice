import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export function useImagePicker() {
  const pickImage = async (options = {}) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos.'
      );
      return null;
    }

    const defaultOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    };

    const result = await ImagePicker.launchImageLibraryAsync({
      ...defaultOptions,
      ...options,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  };

  const takePhoto = async (options = {}) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return null;
    }

    const defaultOptions = {
      allowsEditing: true,
      quality: 0.85,
    };

    const result = await ImagePicker.launchCameraAsync({
      ...defaultOptions,
      ...options,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  };

  return {
    pickImage,
    takePhoto,
  };
}
