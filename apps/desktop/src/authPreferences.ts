export type LoginPreferences = {
  email: string;
  password: string;
  rememberPassword: boolean;
  autoLogin: boolean;
};

export const LOGIN_PREFERENCES_KEY = "zaixiankefu.loginPreferences";

export function loadLoginPreferences(storage: Storage = window.localStorage): LoginPreferences {
  const defaults = defaultLoginPreferences();
  const raw = storage.getItem(LOGIN_PREFERENCES_KEY);
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LoginPreferences>;
    const email = typeof parsed.email === "string" ? parsed.email : "";
    const password = typeof parsed.password === "string" ? parsed.password : "";
    const rememberPassword = typeof parsed.rememberPassword === "boolean" ? parsed.rememberPassword : true;
    const autoLogin = rememberPassword && typeof parsed.autoLogin === "boolean" ? parsed.autoLogin : false;

    return {
      email,
      password,
      rememberPassword,
      autoLogin
    };
  } catch {
    return defaults;
  }
}

export function saveLoginPreferences(preferences: LoginPreferences, storage: Storage = window.localStorage) {
  if (!preferences.rememberPassword) {
    clearLoginPreferences(storage);
    return;
  }

  storage.setItem(
    LOGIN_PREFERENCES_KEY,
    JSON.stringify({
      email: preferences.email,
      password: preferences.password,
      rememberPassword: true,
      autoLogin: preferences.autoLogin
    })
  );
}

export function clearLoginPreferences(storage: Storage = window.localStorage) {
  storage.removeItem(LOGIN_PREFERENCES_KEY);
}

function defaultLoginPreferences(): LoginPreferences {
  return {
    email: "",
    password: "",
    rememberPassword: true,
    autoLogin: true
  };
}
