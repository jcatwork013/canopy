import { create } from 'zustand';
import type { ProfilePrefsDTO } from '@canopy/shared';
import type { ProfilePrefs } from '@/features/profile/prefs';
import { api } from '@/lib/api';

interface ProfileState {
  prefs: ProfilePrefs;
  loadedFor: string | null;
  loadFor: (uid: string) => void;
  update: (uid: string, patch: Partial<ProfilePrefs>) => void;
}

/** Drop null/empty fields from the API DTO into the local prefs shape. */
function clean(dto: ProfilePrefsDTO): ProfilePrefs {
  return {
    ...(dto.name ? { name: dto.name } : {}),
    ...(dto.avatar ? { avatar: dto.avatar } : {}),
    ...(dto.banner ? { banner: dto.banner } : {}),
  };
}

/** Reactive profile prefs (avatar / banner / display name), persisted on the
 *  backend so they are consistent across devices. Shared by the Profile page
 *  and the header; updates are optimistic. */
export const useProfileStore = create<ProfileState>((set, get) => ({
  prefs: {},
  loadedFor: null,
  loadFor: (uid) => {
    if (get().loadedFor === uid) return;
    set({ loadedFor: uid }); // claim early so we don't double-fetch
    api.profile
      .get()
      .then((dto) => set({ prefs: clean(dto) }))
      .catch(() => undefined);
  },
  update: (uid, patch) => {
    set({ prefs: { ...get().prefs, ...patch }, loadedFor: uid }); // optimistic
    api.profile.update(patch).catch(() => undefined); // persist just the patch
  },
}));
