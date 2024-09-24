const Passenger = require("../Models/passengerSchema");
const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET } = process.env;
const logger = require('../logger');

const addPassengers = async (req, res) => {
  const { name, email, password, role } = req.body; 

  if (!name || !email || !password) {
    logger.warn("Missing required fields during passenger addition.");
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const existingPassenger = await Passenger.findOne({ email });

    if (existingPassenger) {
      logger.warn("Passenger already exists: " );
      return res.status(400).json({ message: "Passenger already exists. Please login." });
    }

    const passenger = new Passenger({
      name,
      email,
      password,
      role:"user", 
    });

    await passenger.save();
    logger.info("Passenger added: " + passenger.name);
    return res.status(201).json({ message: "Passenger added.", name: passenger.name });
  } catch (error) {
    logger.error("Error adding passenger: " + error.message);
    return res.status(500).json({ error: error.message });
  }
};

const loginpassenger = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Missing required fields during login.");
    return res.status(400).json({ message: "Fill the required fields." });
  }
  try {
    const passenger = await Passenger.findOne({ email });
    if (!passenger) {
      logger.warn("Invalid credentials for email: " + email);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const accessToken = jwt.sign({ id: passenger.id }, ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });
    logger.info("Passenger logged in successfully: " + passenger.name);
    return res.status(200).json({ message: "Passenger login successfully.", accessToken });
  } catch (err) {
    logger.error("Error during login: " + err.message);
    return res.status(500).json({ error: err.message });
  }
};

const listPassenger = async (req, res) => {
  try {
    const getPassenger = await Passenger.aggregate([
      { $project: { name: 1, _id: 0 } }
    ]);
    logger.info("List of passengers retrieved.");
    return res.status(200).json({ message: "List of passengers retrieved.", passengers: getPassenger });
  } catch (error) {
    logger.error("Error retrieving passengers: " + error.message);
    return res.status(500).json({ message: error.message });
  }
};

const updatePassenger = async (req, res) => {
  try {
    const updatedPassenger = await Passenger.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPassenger) {
      logger.warn("Passenger not found: " + req.params.id);
      return res.status(404).json({ message: "Passenger not found." });
    }
    logger.info("Passenger updated: " + updatedPassenger.name);
    return res.status(200).json({ message: "Passenger updated!", passenger: updatedPassenger.name });
  } catch (error) {
    logger.error("Error updating passenger: " + error.message);
    return res.status(500).json({ message: error.message });
  }
};

const deletepassenger = async (req, res) => {
  try {
    const deletedPassenger = await Passenger.findByIdAndDelete(req.params.id);
    if (!deletedPassenger) {
      logger.warn("Passenger not found for deletion: " + req.params.id);
      return res.status(404).json({ message: "Passenger not found." });
    }
    logger.info("Passenger deleted: " + deletedPassenger.name);
    return res.status(200).json({ message: "Passenger deleted!", passenger: deletedPassenger.name });
  } catch (error) {
    logger.error("Error deleting passenger: " + error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { addPassengers, loginpassenger, listPassenger, deletepassenger, updatePassenger };
