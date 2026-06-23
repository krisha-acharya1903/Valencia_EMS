import {
  AtSign,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Edit3,
  Mail,
  Phone,
  PlusCircle,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getStoredProfilePhoto,
  saveStoredProfilePhoto,
  subscribeProfilePhoto,
} from "../utils/profilePhotoStorage";

function getUserKey(profile) {
  return String(
    profile?.email ||
      profile?.id ||
      profile?._id ||
      profile?.uid ||
      profile?.userId ||
      profile?.name ||
      "employee"
  )
    .trim()
    .toLowerCase();
}

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

function getDivision(profile) {
  return (
    profile?.division ||
    profile?.divisionName ||
    profile?.division_name ||
    profile?.department ||
    profile?.departmentName ||
    profile?.department_name ||
    "Vending Machine"
  );
}

function getRole(profile) {
  const role = profile?.role || profile?.designation || "Team Member";

  return String(role)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getJoiningDate(profile) {
  const rawDate =
    profile?.joiningDate ||
    profile?.dateOfJoining ||
    profile?.date_of_joining ||
    profile?.createdAt ||
    profile?.created_at;

  if (!rawDate) return "May 21, 2026";

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return String(rawDate);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ icon, label, value, color }) {
  return (
    <div className="grid grid-cols-[44px_160px_1fr] items-center border-b border-[#efefef] py-5 last:border-b-0">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}
      >
        {icon}
      </div>

      <p className="text-[14px] font-bold text-[#7b7b86]">{label}</p>

      <p className="text-[15px] font-black text-black">{value || "-"}</p>
    </div>
  );
}

export default function UserProfile() {
  const { profile } = useAuth();

  const fileInputRef = useRef(null);

  const userKey = useMemo(() => getUserKey(profile), [profile]);
  const skillsKey = `employee_profile_skills_${userKey}`;

  const name = getName(profile);
  const email = profile?.email || "rajagtap2321@gmail.com";
  const phone =
    profile?.phone ||
    profile?.phoneNumber ||
    profile?.phone_number ||
    profile?.mobile ||
    "9653111425";

  const [profilePhoto, setProfilePhoto] = useState("");
  const [skillText, setSkillText] = useState("");
  const [skills, setSkills] = useState(() => {
    try {
      const saved = localStorage.getItem(skillsKey);

      return saved
        ? JSON.parse(saved)
        : [
            "UI/UX Design",
            "Figma",
            "Prototyping",
            "HTML/CSS",
            "Wireframing",
            "User Research",
            "Interaction",
          ];
    } catch {
      return [
        "UI/UX Design",
        "Figma",
        "Prototyping",
        "HTML/CSS",
        "Wireframing",
        "User Research",
        "Interaction",
      ];
    }
  });

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

  useEffect(() => {
    localStorage.setItem(skillsKey, JSON.stringify(skills));
  }, [skills, skillsKey]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handlePhotoSelect(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageData = String(reader.result || "");

      setProfilePhoto(imageData);
      saveStoredProfilePhoto(profile, imageData);
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function addSkill(event) {
    event.preventDefault();

    const cleanSkill = skillText.trim();

    if (!cleanSkill) return;

    setSkills((prev) => {
      const alreadyExists = prev.some(
        (skill) => skill.toLowerCase() === cleanSkill.toLowerCase()
      );

      if (alreadyExists) return prev;

      return [...prev, cleanSkill];
    });

    setSkillText("");
  }

  function removeSkill(skillToRemove) {
    setSkills((prev) => prev.filter((skill) => skill !== skillToRemove));
  }

  return (
    <div className="min-h-screen bg-white px-8 py-7 text-black">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      <div className="mb-7">
        <h1 className="text-[28px] font-black text-black">My Profile</h1>
        <p className="mt-2 text-[14px] font-bold text-[#747487]">
          View and manage your personal information
        </p>
      </div>

      <section className="relative mb-7 overflow-hidden rounded-xl border border-[#f1ded6] bg-[#fff8ef] px-9 py-9 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#ffe3db]" />

        <div className="relative z-10 flex items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#ff6b35] text-[42px] font-light text-white">
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

              <button
                type="button"
                onClick={openFilePicker}
                title="Add profile picture"
                className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-[4px] border-white bg-white text-[#ff6b35] shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition hover:scale-105 hover:bg-[#ff6b35] hover:text-white"
              >
                <Camera size={19} strokeWidth={2.5} />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[28px] font-black text-black">{name}</h2>

                <span className="flex items-center gap-1 rounded-full bg-[#24c96b] px-3 py-1 text-[12px] font-black text-white">
                  <ShieldCheck size={13} />
                  active
                </span>
              </div>

              <p className="mt-2 text-[17px] font-black text-[#ff6b35]">
                {getRole(profile)}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-10 text-[14px] font-bold text-[#777]">
                <div className="flex items-center gap-2">
                  <Mail size={17} />
                  <span>{email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone size={17} />
                  <span>{phone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-[320px] rounded-lg border border-[#f4cabc] bg-[#fffaf6] p-5">
            <div className="mb-2 flex items-center gap-2 text-[#ff5a48]">
              <ShieldCheck size={17} />
              <p className="text-[14px] font-black">Auto Checkout</p>
            </div>

            <p className="text-[12px] font-semibold leading-6 text-[#777]">
              The system will automatically check out this user after 12 hours.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-7">
        <section className="rounded-xl border border-[#ececec] bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[23px] font-black text-black">
              Personal Information
            </h2>

            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-lg border border-[#e5e7eb] px-4 text-[14px] font-black text-black transition hover:border-[#ff6b35] hover:text-[#ff6b35]"
            >
              <Edit3 size={16} />
              Edit
            </button>
          </div>

          <InfoRow
            icon={<User size={18} className="text-[#ff6b35]" />}
            label="Full Name"
            value={name}
            color="bg-[#fff1eb]"
          />

          <InfoRow
            icon={<Building2 size={18} className="text-[#ec4899]" />}
            label="Division"
            value={getDivision(profile)}
            color="bg-[#fff0f7]"
          />

          <InfoRow
            icon={<Briefcase size={18} className="text-[#a855f7]" />}
            label="Role"
            value={getRole(profile)}
            color="bg-[#faf0ff]"
          />

          <InfoRow
            icon={<CalendarDays size={18} className="text-[#ff6b35]" />}
            label="Date of Joining"
            value={getJoiningDate(profile)}
            color="bg-[#fff1eb]"
          />

          <InfoRow
            icon={<AtSign size={18} className="text-[#10b981]" />}
            label="Email"
            value={email}
            color="bg-[#ecfdf5]"
          />

          <InfoRow
            icon={<Phone size={18} className="text-[#3b82f6]" />}
            label="Phone"
            value={phone}
            color="bg-[#eff6ff]"
          />
        </section>

        <section className="rounded-xl border border-[#ececec] bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <h2 className="mb-7 text-[23px] font-black text-black">Skills</h2>

          <div className="mb-7 flex flex-wrap gap-3">
            {skills.map((skill) => (
              <div
                key={skill}
                className="group flex items-center gap-2 rounded-lg bg-[#ffe7df] px-5 py-3 text-[14px] font-black text-black"
              >
                <span>{skill}</span>

                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hidden text-[#ff6b35] group-hover:block"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={addSkill} className="flex gap-3">
            <input
              value={skillText}
              onChange={(event) => setSkillText(event.target.value)}
              placeholder="Add new skill"
              className="h-11 min-w-0 flex-1 rounded-lg border border-[#ffb59f] px-4 text-[14px] font-bold outline-none placeholder:text-[#999] focus:border-[#ff6b35]"
            />

            <button
              type="submit"
              className="flex h-11 items-center gap-2 rounded-lg border border-[#ff6b35] px-4 text-[14px] font-black text-black transition hover:bg-[#ff6b35] hover:text-white"
            >
              <PlusCircle size={17} />
              Add
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}