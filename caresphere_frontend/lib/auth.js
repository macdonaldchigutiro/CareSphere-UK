const ACCESS_KEY = "caresphere_access";
const REFRESH_KEY = "caresphere_refresh";
const USER_KEY = "caresphere_user";
const STORAGE_KEY = "caresphere_storage";

const API_URL = "http://127.0.0.1:8000";


// ======================================================
// STORAGE HELPERS
// ======================================================

function canUseBrowserStorage() {
  return (
    typeof window !== "undefined"
  );
}


function getStorageByType(
  type
) {
  if (!canUseBrowserStorage()) {
    return null;
  }

  return type === "local"
    ? window.localStorage
    : window.sessionStorage;
}


function clearStorageArea(
  storage
) {
  if (!storage) {
    return;
  }

  storage.removeItem(
    ACCESS_KEY
  );

  storage.removeItem(
    REFRESH_KEY
  );

  storage.removeItem(
    USER_KEY
  );

  storage.removeItem(
    STORAGE_KEY
  );
}


// ======================================================
// CLEAR AUTH
// ======================================================

export function clearAuthSession() {
  if (!canUseBrowserStorage()) {
    return;
  }

  clearStorageArea(
    window.sessionStorage
  );

  clearStorageArea(
    window.localStorage
  );
}


// ======================================================
// SAVE SESSION
// ======================================================

export function saveAuthSession({
  access,
  refresh,
  user,
  persistent = false,
}) {
  if (!canUseBrowserStorage()) {
    return;
  }

  /*
   * IMPORTANT:
   *
   * Always clear BOTH storage areas first.
   *
   * This prevents a previous account
   * such as Myles remaining in localStorage
   * while a new Macdonald session is saved
   * into sessionStorage.
   */
  clearAuthSession();

  const storageType =
    persistent
      ? "local"
      : "session";

  const storage =
    getStorageByType(
      storageType
    );

  if (!storage) {
    return;
  }

  if (access) {
    storage.setItem(
      ACCESS_KEY,
      access
    );
  }

  if (refresh) {
    storage.setItem(
      REFRESH_KEY,
      refresh
    );
  }

  if (user) {
    storage.setItem(
      USER_KEY,
      JSON.stringify(
        user
      )
    );
  }

  storage.setItem(
    STORAGE_KEY,
    storageType
  );
}


// ======================================================
// FIND ACTIVE STORAGE
// ======================================================

export function getAuthStorage() {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const sessionAccess =
    window.sessionStorage.getItem(
      ACCESS_KEY
    );

  const sessionRefresh =
    window.sessionStorage.getItem(
      REFRESH_KEY
    );

  if (
    sessionAccess ||
    sessionRefresh
  ) {
    return window.sessionStorage;
  }

  const localAccess =
    window.localStorage.getItem(
      ACCESS_KEY
    );

  const localRefresh =
    window.localStorage.getItem(
      REFRESH_KEY
    );

  if (
    localAccess ||
    localRefresh
  ) {
    return window.localStorage;
  }

  return null;
}


// ======================================================
// ACCESS TOKEN
// ======================================================

export function getAccessToken() {
  const storage =
    getAuthStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem(
    ACCESS_KEY
  );
}


// ======================================================
// REFRESH TOKEN
// ======================================================

export function getRefreshToken() {
  const storage =
    getAuthStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem(
    REFRESH_KEY
  );
}


// ======================================================
// STORED USER
// ======================================================

export function getStoredUser() {
  const storage =
    getAuthStorage();

  if (!storage) {
    return null;
  }

  const rawUser =
    storage.getItem(
      USER_KEY
    );

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(
      rawUser
    );
  } catch (error) {
    console.error(
      "Unable to parse stored user:",
      error
    );

    storage.removeItem(
      USER_KEY
    );

    return null;
  }
}


// ======================================================
// UPDATE STORED USER
// ======================================================

export function updateStoredUser(
  user
) {
  const storage =
    getAuthStorage();

  if (
    !storage ||
    !user
  ) {
    return;
  }

  storage.setItem(
    USER_KEY,
    JSON.stringify(
      user
    )
  );
}


// ======================================================
// LOGIN URL
// ======================================================

export function createLoginUrl(
  next = "/dashboard"
) {
  const safeNext =
    next &&
    next.startsWith("/") &&
    !next.startsWith("//")
      ? next
      : "/dashboard";

  return (
    `/login?next=${encodeURIComponent(
      safeNext
    )}`
  );
}


// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

async function refreshAccessToken() {
  const storage =
    getAuthStorage();

  if (!storage) {
    return null;
  }

  const refresh =
    storage.getItem(
      REFRESH_KEY
    );

  if (!refresh) {
    clearAuthSession();

    return null;
  }

  try {
    const response =
      await fetch(
        `${API_URL}/api/users/token/refresh/`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              refresh,
            }),
        }
      );

    if (!response.ok) {
      clearAuthSession();

      return null;
    }

    const data =
      await response.json();

    if (!data.access) {
      clearAuthSession();

      return null;
    }

    storage.setItem(
      ACCESS_KEY,
      data.access
    );

    /*
     * Some JWT configurations rotate
     * refresh tokens.
     */
    if (data.refresh) {
      storage.setItem(
        REFRESH_KEY,
        data.refresh
      );
    }

    return data.access;

  } catch (error) {
    console.error(
      "Token refresh error:",
      error
    );

    return null;
  }
}


// ======================================================
// AUTHENTICATED FETCH
// ======================================================

export async function authFetch(
  url,
  options = {}
) {
  let accessToken =
    getAccessToken();

  if (!accessToken) {
    accessToken =
      await refreshAccessToken();

    if (!accessToken) {
      return null;
    }
  }

  const originalHeaders =
    options.headers || {};

  let response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          ...originalHeaders,

          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  /*
   * If access token expired,
   * refresh it once and retry.
   */
  if (
    response.status === 401
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (!newAccessToken) {
      return response;
    }

    response =
      await fetch(
        url,
        {
          ...options,

          headers: {
            ...originalHeaders,

            Authorization:
              `Bearer ${newAccessToken}`,
          },
        }
      );
  }

  return response;
}