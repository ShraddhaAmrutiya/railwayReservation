const Passenger = require("../Models/passengerSchema");
const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const passenger = await Passenger.findById(decoded.id);
    if (!passenger) {
      return res.status(404).json({ message: "User not found" });
    }

    req.passenger = passenger; 
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(403).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  const { role } = req.passenger || {}; 

  if (role !== "admin") {
    return res
      .status(403)
      .json({ message: "You do not have permission to perform this action." });
  }
  next();
};

module.exports = { authMiddleware, isAdmin };
