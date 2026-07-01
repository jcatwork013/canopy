import { create } from 'zustand';
import { getProfilePrefs, setProfilePrefs, type ProfilePrefs } from '@/features/profile/prefs';

interface ProfileState {
  prefs: ProfilePrefs;
  loadedFor: string | null;
  loadFor: (uid: string) => void;
  update: (uid: string, patch: Partial<ProfilePrefs>) => void;
}

/** Reactive profile prefs (avatar / banner / display name), persisted to
 *  localStorage. Shared by the Profile page and the header so edits show
 *  everywhere instantly. */
export const useProfileStore = create<ProfileState>((set, get) => ({
  prefs: {},
  loadedFor: null,
  loadFor: (uid) => {
    if (get().loadedFor === uid) return;
    set({ prefs: getProfilePrefs(uid), loadedFor: uid });
  },
  update: (uid, patch) => {
    const next = { ...get().prefs, ...patch };
    setProfilePrefs(uid, next);
    set({ prefs: next, loadedFor: uid });
  },
}));
