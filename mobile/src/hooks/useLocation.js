import { useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';

export function useLocation() {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const { t } = useLanguage();

  // Reverse geocode coordinates to get a readable address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addr) {
        const parts = [
          addr.name,
          addr.street,
          addr.district,
          addr.city || addr.subregion,
          addr.region,
        ].filter(Boolean);

        const uniqueParts = Array.from(new Set(parts));
        return uniqueParts.length > 0
          ? uniqueParts.join(', ')
          : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }
    } catch (error) {
      console.log('Reverse geocode error', error);
    }
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  };

  // Get current GPS location
  const getCurrentLocation = async (showErrors = true) => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (showErrors) Alert.alert(t('error') || 'Permission required', 'Please allow location access.');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return loc;
    } catch (err) {
      if (showErrors) Alert.alert(t('error') || 'Error', 'Could not get location.');
      console.log('Location error', err);
      return null;
    } finally {
      setLoadingLocation(false);
    }
  };

  return {
    loadingLocation,
    getCurrentLocation,
    reverseGeocode,
  };
}
