// Google Sign-In service for CitiVoice mobile
// Works seamlessly in Expo Go, Android, and iOS using expo-auth-session / expo-web-browser
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '489125998465-bv52n07e711jnidu3iojed6v5ckdak6a.apps.googleusercontent.com';

const EXPO_OWNER = 'erwin1229';
const EXPO_SLUG = 'citivoice';
export const EXPO_PROXY_REDIRECT = `https://auth.expo.io/@${EXPO_OWNER}/${EXPO_SLUG}`;

// Always available when Client ID exists
export const isGoogleSignInAvailable = () => Boolean(WEB_CLIENT_ID);

/**
 * Opens Google OAuth account chooser and returns the Google ID token (JWT)
 * Returns null if the user cancels or closes the window.
 */
export const getGoogleIdToken = async () => {
  if (!WEB_CLIENT_ID) {
    throw new Error('Google Client ID is not configured.');
  }

  const returnUrl = AuthSession.makeRedirectUri({
    scheme: 'citivoice',
  });
  // Always use the HTTPS Expo proxy redirect for Google Web Client ID so Google never receives custom scheme (citivoice://) which Google blocks
  const redirectUri = EXPO_PROXY_REDIRECT;

  const nonce = Math.random().toString(36).substring(2, 15);
  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: WEB_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid profile email',
      nonce,
      prompt: 'select_account',
    }).toString();

  const finalAuthUrl =
    `${EXPO_PROXY_REDIRECT}/start?` +
    new URLSearchParams({
      authUrl: googleAuthUrl,
      returnUrl,
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(finalAuthUrl, returnUrl);

  if (result.type !== 'success' || !result.url) {
    return null; // User cancelled or dismissed
  }

  // Parse id_token from redirect url (#id_token=... or ?id_token=...)
  const hash = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1];
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');
  if (!idToken) {
    const error = params.get('error_description') || params.get('error');
    if (error) throw new Error(`Google Auth error: ${error}`);
    throw new Error('Google did not return an ID token.');
  }

  return idToken;
};
