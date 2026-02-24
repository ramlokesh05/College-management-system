const AVATAR_MAX_CHARS = 1_500_000;

const normalizeAvatar = (value) => String(value || "").trim();

const isValidAvatar = (value) => {
  const avatar = normalizeAvatar(value);
  if (!avatar) return false;
  if (avatar.length > AVATAR_MAX_CHARS) return false;

  const isImageUrl = /^https?:\/\/\S+$/i.test(avatar);
  const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/.test(avatar);
  return isImageUrl || isDataImage;
};

module.exports = {
  AVATAR_MAX_CHARS,
  normalizeAvatar,
  isValidAvatar,
};
