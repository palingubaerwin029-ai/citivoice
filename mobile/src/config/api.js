import Constants from 'expo-constants';

const getBaseUrl = () => {
  // 1. Try to dynamically detect the Metro host IP from Expo Constants so IP changes adapt automatically
  const host =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants?.manifest?.debuggerHost;
  if (host) {
    const ip = host.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }

  // 2. Fall back to environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 3. Static fallback
  return 'http://10.115.199.178:5000/api'; 
};

export const BASE_URL = getBaseUrl();

export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://localhost:5000') || url.startsWith('http://127.0.0.1:5000')) {
    const backendBase = BASE_URL.replace('/api', '');
    return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, backendBase);
  }
  if (url.startsWith('/uploads/')) {
    return `${BASE_URL.replace('/api', '')}${url}`;
  }
  return url;
};
