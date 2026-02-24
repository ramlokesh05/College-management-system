import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import EmailVerificationCard from "../../components/common/EmailVerificationCard";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import GlassCard from "../../components/ui/GlassCard";
import { useAuth } from "../../hooks/useAuth";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";
import { AVATAR_MAX_FILE_BYTES, isValidAvatarValue, readImageAsDataUrl } from "../../utils/avatarUtils";

const statusClassMap = {
  pending:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-100",
  approved:
    "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/45 dark:bg-orange-500/20 dark:text-orange-100",
  rejected:
    "border-red-200 bg-red-100 text-red-800 dark:border-red-500/45 dark:bg-red-500/20 dark:text-red-100",
};

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

const formatChanges = (changes = {}) =>
  Object.entries(changes)
    .map(([key, value]) => (key === "avatar" ? "avatar: image update requested" : `${key}: ${value}`))
    .join(" | ");

const TeacherProfilePage = () => {
  const { user: authUser, refreshUser } = useAuth();
  const profileState = useAsyncData(teacherService.getProfile, []);
  const requestState = useAsyncData(teacherService.getProfileEditRequests, []);

  const [avatarInput, setAvatarInput] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const user = profileState.data?.user || authUser || {};
  const profile = profileState.data?.profile || {};
  const requests = useMemo(() => requestState.data || [], [requestState.data]);
  const hasPendingRequest = requests.some((item) => item.status === "pending");

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

  const handleSubmitRequest = async (event) => {
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

    setSubmittingRequest(true);
    try {
      await teacherService.createProfileEditRequest({
        requestedChanges: {
          avatar: nextAvatar,
        },
      });
      toast.success("Profile picture update request submitted.");
      await requestState.execute();
      await refreshUser();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit picture update request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (profileState.loading || requestState.loading) return <GlassCard>Loading profile...</GlassCard>;

  return (
    <div className="space-y-5">
      <EmailVerificationCard onVerified={profileState.execute} />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <div className="text-center">
            <ProfileAvatar src={user?.avatar} name={user?.name} fallback="T" />
            <h2 className="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">
              {user?.name || "Teacher"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email || "-"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {user?.role || "teacher"}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="grid gap-3 md:grid-cols-2 lg:col-span-2">
          <Row label="Username" value={user?.username} />
          <Row label="Employee ID" value={profile?.employeeId} />
          <Row label="Department" value={profile?.department} />
          <Row label="Designation" value={profile?.designation} />
          <Row label="Phone" value={profile?.phone} />
          <Row label="Qualification" value={profile?.qualification} />
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Request Profile Picture Update
          </h3>
          {hasPendingRequest ? (
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200">
              Pending Approval
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your picture will be updated only after admin approval.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmitRequest}>
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
          <ProfileAvatar src={avatarInput} name={user?.name} fallback="T" size="md" />
          <button type="submit" className="btn-primary" disabled={submittingRequest || hasPendingRequest}>
            {submittingRequest ? "Submitting..." : hasPendingRequest ? "Request Pending" : "Submit Picture Request"}
          </button>
        </form>
      </GlassCard>

      <GlassCard>
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Edit Request History
        </h3>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <th className="py-2">Requested Changes</th>
                <th className="py-2">Status</th>
                <th className="py-2">Admin Note</th>
                <th className="py-2">Requested At</th>
                <th className="py-2">Reviewed At</th>
              </tr>
            </thead>
            <tbody>
              {requests.length ? (
                requests.map((item) => (
                  <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                    <td className="py-2 text-slate-700 dark:text-slate-200">{formatChanges(item.requestedChanges)}</td>
                    <td className="py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClassMap[item.status] || "border-slate-300 bg-slate-100 text-slate-700"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{item.adminNote || "-"}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{formatDateTime(item.createdAt)}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{formatDateTime(item.reviewedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                    No edit requests submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default TeacherProfilePage;

