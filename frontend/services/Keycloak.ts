import Keycloak from 'keycloak-js';

// NOTE: Replace these with your actual Keycloak server details
const keycloakConfig = {
  url: 'https://richlist.biz',
  realm: 'richlistbiz',
  clientId: 'https://richlistbiz.cloudflareaccess.com/cdn-cgi/access/callback',
};

const keycloak = new Keycloak(keycloakConfig);

let isInitialized = false;

export const initKeycloak = async () => {
  if (isInitialized) return keycloak;

  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    });
    isInitialized = true;
    console.log(`Keycloak initialized. Authenticated: ${authenticated}`);
    return keycloak;
  } catch (error) {
    console.error('Failed to initialize Keycloak', error);
    return null;
  }
};

export const login = (options?: Keycloak.KeycloakLoginOptions) => {
  const loginOptions = {
    redirectUri: window.location.origin,
    ...options,
  };
  console.log('Logging in with options:', loginOptions);
  keycloak.login(loginOptions);
};

export const logout = () => {
  keycloak.logout();
};

export const getToken = () => {
  return keycloak.token;
};

export const isLoggedIn = () => {
  return !!keycloak.token;
};

export const register = (options?: Keycloak.KeycloakLoginOptions) => {
  const registerOptions = {
    redirectUri: window.location.origin,
    action: 'register',
    ...options,
  };
  console.log('Registering with options:', registerOptions);
  keycloak.register(registerOptions);
};

export default keycloak;
