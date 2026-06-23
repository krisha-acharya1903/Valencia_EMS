const PROFILE_PHOTO_EVENT = "valencia-profile-photo-updated";

function clean(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getProfilePhotoCandidateKeys(profile) {
  const values = [
    profile?.email,
    profile?.id,
    profile?._id,
    profile?.uid,
    profile?.userId,
    profile?.user_id,
    profile?.employeeId,
    profile?.employee_id,
    profile?.name,
    profile?.fullName,
    profile?.full_name,
    profile?.displayName,
    profile?.display_name,
    "employee",
  ]
    .filter(Boolean)
    .map(clean);

  return [...new Set(values)].map((value) => `employee_profile_photo_${value}`);
}

export function getProfilePhotoStorageKey(profile) {
  return getProfilePhotoCandidateKeys(profile)[0] || "employee_profile_photo_employee";
}

export function getStoredProfilePhoto(profile) {
  const keys = getProfilePhotoCandidateKeys(profile);

  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
  }

  return "";
}

export function saveStoredProfilePhoto(profile, imageData) {
  const keys = getProfilePhotoCandidateKeys(profile);

  keys.forEach((key) => {
    if (imageData) {
      localStorage.setItem(key, imageData);
    } else {
      localStorage.removeItem(key);
    }
  });

  window.dispatchEvent(
    new CustomEvent(PROFILE_PHOTO_EVENT, {
      detail: {
        imageData,
        keys,
      },
    })
  );
}

export function subscribeProfilePhoto(callback) {
  function handleCustomEvent() {
    callback();
  }

  function handleStorage(event) {
    if (event.key?.startsWith("employee_profile_photo_")) {
      callback();
    }
  }

  window.addEventListener(PROFILE_PHOTO_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PROFILE_PHOTO_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}