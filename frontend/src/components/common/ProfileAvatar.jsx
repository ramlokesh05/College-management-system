import { getInitial } from "../../utils/avatarUtils";

const sizeClassMap = {
  sm: "h-12 w-12 text-base",
  md: "h-16 w-16 text-xl",
  lg: "h-20 w-20 text-2xl",
};

const ProfileAvatar = ({
  src = "",
  name = "",
  fallback = "U",
  size = "lg",
  className = "",
}) => {
  const avatar = String(src || "").trim();
  const sizeClass = sizeClassMap[size] || sizeClassMap.lg;
  const initial = getInitial(name, fallback);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${name || "User"} avatar`}
        className={`mx-auto rounded-2xl object-cover ${sizeClass} ${className}`.trim()}
      />
    );
  }

  return (
    <div
      className={`mx-auto flex items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200 ${sizeClass} ${className}`.trim()}
    >
      {initial}
    </div>
  );
};

export default ProfileAvatar;

