import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import EmailVerificationCard from "../../components/common/EmailVerificationCard";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import GlassCard from "../../components/ui/GlassCard";
import { useAuth } from "../../hooks/useAuth";
import { adminService } from "../../services/adminService";
import { AVATAR_MAX_FILE_BYTES, isValidAvatarValue, readImageAsDataUrl } from "../../utils/avatarUtils";

const Row = ({ label, value }) => (
  <div className="glass-tile rounded-xl p-3">
    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value || "-"}</p>
  </div>
);

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const AdminProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [avatarInput, setAvatarInput] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    setAvatarInput(String(user?.avatar || ""));
  }, [user?.avatar]);

  const handleAvatarFileChange = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (Number(file.size || 0) > AVATAR_MAX_FILE_BYTES) {
      toast.error("Image must be 1MB or smaller.");
      return;
    }

    try {
      const avatarDataUrl = await readImageAsDataUrl(file);
      setAvatarInput(avatarDataUrl);
    } catch {
      toast.error("Failed to process selected image.");
    }
  };

  const handleSaveAvatar = async (event) => {
    event.preventDefault();
    const nextAvatar = String(avatarInput || "").trim();
    if (!nextAvatar) {
      toast.error("Please provide a profile picture.");
      return;
    }
    if (!isValidAvatarValue(nextAvatar)) {
      toast.error("Avatar must be a valid image URL or uploaded image.");
      return;
    }
    if (nextAvatar === String(user?.avatar || "")) {
      toast.error("Selected picture is same as current profile picture.");
      return;
    }

    setSavingAvatar(true);
    try {
      await adminService.updateMyAvatar({ avatar: nextAvatar });
      await refreshUser();
      toast.success("Profile picture updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile picture.");
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="space-y-5">
      <EmailVerificationCard onVerified={refreshUser} />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <div className="text-center">
            <ProfileAvatar src={user?.avatar} name={user?.name} fallback="A" />
            <h2 className="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">
              {user?.name || "Admin"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email || "-"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {user?.role || "admin"}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="grid gap-3 md:grid-cols-2 lg:col-span-2">
          <Row label="Username" value={user?.username} />
          <Row label="Role" value={user?.role} />
          <Row label="Email Verified" value={user?.isEmailVerified ? "Yes" : "No"} />
          <Row label="Verified At" value={formatDateTime(user?.emailVerifiedAt)} />
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Update Profile Picture
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Admin profile picture updates are applied immediately.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSaveAvatar}>
          <input
            className="input-field"
            placeholder="Profile Picture URL (https://...)"
            value={avatarInput}
            onChange={(event) => setAvatarInput(event.target.value)}
          />
          <input
            className="input-field"
            type="file"
            accept="image/*"
            onChange={handleAvatarFileChange}
          />
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Upload an image (max 1MB) or paste an image URL.
          </p>
          <ProfileAvatar src={avatarInput} name={user?.name} fallback="A" size="md" />
          <button type="submit" className="btn-primary" disabled={savingAvatar}>
            {savingAvatar ? "Saving..." : "Save Picture"}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};

export default AdminProfilePage;

