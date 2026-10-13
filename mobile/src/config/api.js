import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants?.manifest?.debuggerHost;
  if (host) {
    return `http://${host.split(':')[0]}:5000/api`;
  }
  return 'http://10.112.173.178:5000/api'; 
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
