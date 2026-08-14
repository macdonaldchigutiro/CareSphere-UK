const API_URL = "http://127.0.0.1:8000";

// ======================================================
// TYPES
// ======================================================

export type CareSphereUser = {
  id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  phone_number?: string;
  date_of_birth?: string;
  is_verified?: boolean;
};

type SaveAuthSessionParams = {
  access: string;
  refresh: string;
  user: CareSphereUser;
  persistent?: boolean;
};

// ======================================================
// STORAGE
// ======================================================

export function getAuthStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (localStorage.getItem("caresphere_refresh")) {
    return localStorage;
  }

  if (sessionStorage.getItem("caresphere_refresh")) {
    return sessionStorage;
  }

  return null;
}

// ======================================================
// ACCESS TOKEN
// ======================================================

export function getAccessToken(): string | null {
  const storage = getAuthStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem("caresphere_access");
}

// ======================================================
// REFRESH TOKEN
// ======================================================

export function getRefreshToken(): string | null {
  const storage = getAuthStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem("caresphere_refresh");
}

// ======================================================
// STORED USER
// ======================================================

export function getStoredUser(): CareSphereUser | null {
  const storage = getAuthStorage();

  if (!storage) {
    return null;
  }

  const rawUser = storage.getItem("caresphere_user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as CareSphereUser;
  } catch (error) {
    console.error(
      "Unable to read CareSphere user:",
      error
    );

    return null;
  }
}

// ======================================================
// SAVE LOGIN SESSION
// ======================================================

export function saveAuthSession({
  access,
  refresh,
  user,
  persistent = false,
}: SaveAuthSessionParams): void {
  if (typeof window === "undefined") {
    return;
  }

  const storage = persistent
    ? localStorage
    : sessionStorage;

  const otherStorage = persistent
    ? sessionStorage
    : localStorage;

  storage.setItem(
    "caresphere_access",
    access
  );

  storage.setItem(
    "caresphere_refresh",
    refresh
  );

  storage.setItem(
    "caresphere_user",
    JSON.stringify(user)
  );

  // Clear old session from the other storage.
  otherStorage.removeItem(
    "caresphere_access"
  );

  otherStorage.removeItem(
    "caresphere_refresh"
  );

  otherStorage.removeItem(
    "caresphere_user"
  );
}

// ======================================================
// CLEAR SESSION
// ======================================================

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    "caresphere_access"
  );

  localStorage.removeItem(
    "caresphere_refresh"
  );

  localStorage.removeItem(
    "caresphere_user"
  );

  sessionStorage.removeItem(
    "caresphere_access"
  );

  sessionStorage.removeItem(
    "caresphere_refresh"
  );

  sessionStorage.removeItem(
    "caresphere_user"
  );
}

// ======================================================
// UPDATE STORED USER
// ======================================================

export function updateStoredUser(
  user: CareSphereUser
): void {
  const storage = getAuthStorage();

  if (!storage) {
    return;
  }

  storage.setItem(
    "caresphere_user",
    JSON.stringify(user)
  );
}

// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

export async function refreshAccessToken(): Promise<
  string | null
> {
  const storage = getAuthStorage();

  if (!storage) {
    return null;
  }

  const refresh = storage.getItem(
    "caresphere_refresh"
  );

  if (!refresh) {
    clearAuthSession();
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/users/token/refresh/`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          refresh,
        }),
      }
    );

    if (!response.ok) {
      clearAuthSession();
      return null;
    }

    const data = await response.json();

    if (!data.access) {
      clearAuthSession();
      return null;
    }

    storage.setItem(
      "caresphere_access",
      data.access
    );

    // Simple JWT may rotate refresh tokens.
    if (data.refresh) {
      storage.setItem(
        "caresphere_refresh",
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
  url: string,
  options: RequestInit = {}
): Promise<Response | null> {
  let access = getAccessToken();

  // If access token is missing but refresh token exists,
  // try to obtain a new access token.
  if (!access) {
    const newAccess =
      await refreshAccessToken();

    if (!newAccess) {
      return null;
    }

    access = newAccess;
  }

  const makeRequest = (
    token: string
  ): Promise<Response> => {
    const headers = new Headers(
      options.headers
    );

    headers.set(
      "Authorization",
      `Bearer ${token}`
    );

    return fetch(url, {
      ...options,
      headers,
    });
  };

  let response =
    await makeRequest(access);

  // Access token may have expired.
  // Refresh it and retry once.
  if (response.status === 401) {
    const newAccess =
      await refreshAccessToken();

    if (!newAccess) {
      return response;
    }

    response =
      await makeRequest(newAccess);
  }

  return response;
}

// ======================================================
// LOGIN URL WITH RETURN DESTINATION
// ======================================================

export function createLoginUrl(
  returnTo = "/dashboard"
): string {
  return `/login?next=${encodeURIComponent(
    returnTo
  )}`;
}