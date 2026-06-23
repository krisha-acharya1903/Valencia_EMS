import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getStoredProfilePhoto,
  subscribeProfilePhoto,
} from "../utils/profilePhotoStorage";

function getName(profile) {
  return (
    profile?.name ||
    profile?.fullName ||
    profile?.full_name ||
    profile?.displayName ||
    profile?.display_name ||
    profile?.employeeName ||
    profile?.employee_name ||
    "Employee"
  );
}

function getInitial(name) {
  return String(name || "E").trim().charAt(0).toUpperCase();
}

export default function ProfileAvatar({
  size = "h-10 w-10",
  textSize = "text-[16px]",
  className = "",
}) {
  const { profile } = useAuth();

  const name = useMemo(() => getName(profile), [profile]);

  const [profilePhoto, setProfilePhoto] = useState("");

  useEffect(() => {
    function loadPhoto() {
      const savedPhoto = getStoredProfilePhoto(profile);

      const profileImage =
        profile?.photoURL ||
        profile?.photoUrl ||
        profile?.avatar ||
        profile?.avatarUrl ||
        profile?.profileImage ||
        profile?.profile_image ||
        "";

      setProfilePhoto(savedPhoto || profileImage || "");
    }

    loadPhoto();

    return subscribeProfilePhoto(loadPhoto);
  }, [profile]);

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ff6b35] ${textSize} font-black text-white ${className}`}
    >
      {profilePhoto ? (
        <img
          src={profilePhoto}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : (
        getInitial(name)
      )}
    </div>
  );
}