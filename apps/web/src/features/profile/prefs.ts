export interface ProfilePrefs {
  avatar?: string; // data URL
  banner?: string; // data URL
  name?: string; // display name override
}

const key = (uid: string) => `canopy-profile-${uid}`;

export function getProfilePrefs(uid: string): ProfilePrefs {
  try {
    return JSON.parse(localStorage.getItem(key(uid)) || '{}') as ProfilePrefs;
  } catch {
    return {};
  }
}

export function setProfilePrefs(uid: string, p: ProfilePrefs): void {
  try {
    localStorage.setItem(key(uid), JSON.stringify(p));
  } catch {
    /* quota */
  }
}
