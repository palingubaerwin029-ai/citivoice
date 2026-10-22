import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function navigateToConcern(concernId) {
  if (!concernId) return;
  const numId = Number(concernId);
  const targetId = isNaN(numId) ? concernId : numId;

  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('Home', {
        screen: 'ConcernDetail',
        params: { concernId: targetId },
      });
    } catch (_) {
      try {
        navigationRef.navigate('ConcernDetail', { concernId: targetId });
      } catch (e) {
        console.log('Navigation to ConcernDetail failed:', e);
      }
    }
  }
}
