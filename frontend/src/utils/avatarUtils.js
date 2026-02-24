export const AVATAR_MAX_FILE_BYTES = 1024 * 1024;

export const isValidAvatarValue = (value) => {
  const avatar = String(value || "").trim();
  if (!avatar) return false;
  if (avatar.length > 1_500_000) return false;
  return /^https?:\/\/\S+$/i.test(avatar)
    || /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/.test(avatar);
};

export const readImageAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

export const getInitial = (name, fallback = "U") =>
  String(name || "").trim().charAt(0).toUpperCase() || fallback;

