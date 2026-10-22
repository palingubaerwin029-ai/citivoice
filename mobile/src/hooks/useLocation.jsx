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
        let barangayPart = null;
        if (addr.district) {
          barangayPart = /barangay|brgy|poblacion/i.test(addr.district)
            ? addr.district
            : `Barangay ${addr.district}`;
        } else if (addr.name && /barangay|brgy|poblacion/i.test(addr.name)) {
          barangayPart = addr.name;
        }

        const parts = [
          barangayPart,
          addr.street || (addr.name !== barangayPart ? addr.name : null),
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
      const hasServices = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!hasServices) {
        if (showErrors) {
          Alert.alert(t('error') || 'GPS Disabled', 'Please turn on Location Services (GPS) in your phone settings.');
        }
        return null;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (showErrors)
          Alert.alert(t('error') || 'Permission required', 'Please allow location access to pin your concern.');
        return null;
      }

      // Try balanced accuracy first (works fast indoors & outdoors without GPS lock freeze)
      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (posErr) {
        console.log('Balanced accuracy position failed, trying last known location:', posErr);
        loc = await Location.getLastKnownPositionAsync().catch(() => null);
      }

      return loc;
    } catch (err) {
      if (showErrors) Alert.alert(t('error') || 'Error', 'Could not retrieve your location. Please check GPS settings.');
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
