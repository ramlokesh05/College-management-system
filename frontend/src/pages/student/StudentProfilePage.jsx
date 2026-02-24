import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import EmailVerificationCard from "../../components/common/EmailVerificationCard";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import GlassCard from "../../components/ui/GlassCard";
import { useAuth } from "../../hooks/useAuth";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";
import { AVATAR_MAX_FILE_BYTES, isValidAvatarValue, readImageAsDataUrl } from "../../utils/avatarUtils";

const editableFields = [
  "department",
  "year",
  "semester",
  "section",
  "phone",
  "address",
  "guardianName",
  "avatar",
];

const initialForm = {
  department: "",
  year: "",
  semester: "",
  section: "",
  phone: "",
  address: "",
  guardianName: "",
  avatar: "",
};

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

const StudentProfilePage = () => {
  const { user: authUser } = useAuth();
  const profileState = useAsyncData(studentService.getProfile, []);
  const requestState = useAsyncData(studentService.getProfileEditRequests, []);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const user = profileState.data?.user || authUser || {};
  const profile = profileState.data?.profile || {};
  const requests = useMemo(() => requestState.data || [], [requestState.data]);

  useEffect(() => {
    const currentProfile = profileState.data?.profile;
    const currentUser = profileState.data?.user || authUser;
    if (!currentProfile) return;
    setForm({
      department: currentProfile.department || "",
      year: currentProfile.year || "",
      semester: currentProfile.semester || "",
      section: currentProfile.section || "",
      phone: currentProfile.phone || "",
      address: currentProfile.address || "",
      guardianName: currentProfile.guardianName || "",
      avatar: currentUser?.avatar || "",
    });
  }, [profileState.data?.profile, profileState.data?.user, authUser]);

  const hasPendingRequest = requests.some((item) => item.status === "pending");

  const buildRequestedChanges = () =>
    editableFields.reduce((acc, field) => {
      const original = field === "avatar"
        ? String(user?.avatar ?? "")
        : String(profile?.[field] ?? "");
      const next = String(form?.[field] ?? "");
      if (original !== next && next.trim() !== "") {
        acc[field] = field === "year" || field === "semester" ? Number(next) : next.trim();
      }
      return acc;
    }, {});

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
      setForm((prev) => ({ ...prev, avatar: avatarDataUrl }));
    } catch {
      toast.error("Failed to process selected image.");
    }
  };

  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    const nextAvatar = String(form.avatar || "").trim();
    if (nextAvatar && nextAvatar !== String(user?.avatar || "") && !isValidAvatarValue(nextAvatar)) {
      toast.error("Avatar must be a valid image URL or uploaded image.");
      return;
    }

    const requestedChanges = buildRequestedChanges();

    if (!Object.keys(requestedChanges).length) {
      toast.error("No profile changes detected.");
      return;
    }

    setSubmitting(true);
    try {
      await studentService.createProfileEditRequest({ requestedChanges });
      toast.success("Edit request submitted for admin approval.");
      await requestState.execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit profile edit request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileState.loading || requestState.loading) return <GlassCard>Loading profile...</GlassCard>;

  return (
    <div className="space-y-5">
      <EmailVerificationCard onVerified={profileState.execute} />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <div className="text-center">
            <ProfileAvatar src={user?.avatar} name={user?.name} fallback="S" />
            <h2 className="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">
              {user?.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
          </div>
        </GlassCard>

        <GlassCard className="grid gap-3 md:grid-cols-2 lg:col-span-2">
          <Row label="Roll Number" value={profile.rollNumber} />
          <Row label="Department" value={profile.department} />
          <Row label="Year" value={profile.year} />
          <Row label="Semester" value={profile.semester} />
          <Row label="Section" value={profile.section} />
          <Row label="Phone" value={profile.phone} />
          <Row label="Guardian" value={profile.guardianName} />
          <Row label="Address" value={profile.address} />
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Request Profile Edit
          </h3>
          {hasPendingRequest ? (
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200">
              Pending Approval
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your changes will be applied only after admin approval.
        </p>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmitRequest}>
          <input
            className="input-field"
            placeholder="Department"
            value={form.department}
            onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Year"
            value={form.year}
            onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Semester"
            value={form.semester}
            onChange={(event) => setForm((prev) => ({ ...prev, semester: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Section"
            value={form.section}
            onChange={(event) => setForm((prev) => ({ ...prev, section: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Guardian Name"
            value={form.guardianName}
            onChange={(event) => setForm((prev) => ({ ...prev, guardianName: event.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Address"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Profile Picture URL (https://...)"
            value={form.avatar}
            onChange={(event) => setForm((prev) => ({ ...prev, avatar: event.target.value }))}
          />
          <div className="md:col-span-2 space-y-2">
            <input
              className="input-field"
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
            />
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Upload an image (max 1MB) or paste an image URL. Admin approval is required.
            </p>
            <ProfileAvatar src={form.avatar} name={user?.name} fallback="S" size="md" />
          </div>
          <button type="submit" className="btn-primary md:col-span-2" disabled={submitting || hasPendingRequest}>
            {submitting ? "Submitting..." : hasPendingRequest ? "Request Pending" : "Submit Edit Request"}
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

export default StudentProfilePage;

