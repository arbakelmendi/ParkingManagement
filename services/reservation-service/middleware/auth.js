// services/reservation-service/middleware/auth.js
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = auth.slice("Bearer ".length).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id ?? decoded.userId ?? decoded.sub;
    if (!userId) return res.status(401).json({ message: "Invalid token payload" });

    req.user = { ...decoded, id: Number(userId) };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
