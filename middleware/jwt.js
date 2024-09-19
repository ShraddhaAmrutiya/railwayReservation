const Passenger = require("../Models/passengerSchema");
const jwt = require("jsonwebtoken");
const logger = require('../logger'); 


const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    logger.warn('No token provided in request');
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const passenger = await Passenger.findById(decoded.id);
    if (!passenger) {
      logger.warn(`User not found: ${decoded.id}`);
      return res.status(404).json({ message: "User not found" });
    }

    req.passenger = passenger; 
    logger.info(`User authenticated: ${passenger._id}`);
    next();
  } catch (error) {
    logger.error("Token verification error: " + error.message);
    res.status(403).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  const { role } = req.passenger || {}; 

  if (role !== "admin") {
    logger.warn(`Unauthorized access attempt by user: ${req.passenger?._id}`);
    return res
      .status(403)
      .json({ message: "You do not have permission to perform this action." });
  }
  logger.info(`Admin access granted to user: ${req.passenger?._id}`);
  next();
};

module.exports = { authMiddleware, isAdmin };
