const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const protect = async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const hasBearer = authHeader.startsWith("Bearer ");

  if (!hasBearer) {
    return next(new ApiError(401, "Authorization token is required."));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return next(new ApiError(401, "Invalid authentication token."));
    }

    req.user = user;
    return next();
  } catch (_error) {
    return next(new ApiError(401, "Authentication failed."));
  }
};

module.exports = { protect };

