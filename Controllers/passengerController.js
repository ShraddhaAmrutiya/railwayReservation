const Passenger = require("../Models/passengerSchema");
const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET } = process.env;
const logger= require ('../logger')


const addPassengers = async (req, res) => {
  const { name, email, password, role } = req.body; 

  if (!name || !email || !password) {
    logger.warn('add passenger failed: Missing required fields')
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const existingPassenger = await Passenger.findOne({ email });

    if (existingPassenger) {
      logger.warn(`Add passenger failed: Passenger with email ${email} already exists.`);

      return res
        .status(400)
        .json({ message: "Passenger already exists. Please login." });
    }

    if (role && !["user", "admin"].includes(role)) {
      logger.warn(`Add passenger failed: Invalid role specified (${role}).`);

      return res.status(400).json({ message: "Invalid role specified." });
    }

    const passenger = new Passenger({
      name,
      email,
      password,
      role: role || "user", 
    });

    await passenger.save();
    logger.info(`Passenger added: ${name}`);

    return res
      .status(201)
      .json({ message: "Passenger added.", name: passenger.name });
  } catch (error) {
    logger.error(`Error adding passenger: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};


const loginpassenger = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn('Login failed: Missing required fields.');
    return res.status(400).send({ message: "Fill the required fields." });
  }
  try {
    const passenger = await Passenger.findOne({ email });
    if (!passenger){
      logger.warn(`Login failed: Invalid credentials for email ${email}.`);

      return res.status(401).json({ message: "Invalid credentials" });
    }
    const accessToken = jwt.sign({ id: passenger.id }, ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });
    logger.info(`Passenger login successful: ${email}`);
    res
      .status(200)
      .json({ message: "Passenger login successfully.", accessToken });
  } catch (err) {
    logger.error(`Error during login: ${err.message}`);
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



const listPassenger = async (req, res) => {
  try {
    const getPassenger=await Passenger.find({},{name:1,_id:0});
    logger.info('List of passengers retrieved successfully.');
    return res.status(200).json({ message: "List of passengers:",getPassenger });
  } catch (error) {
    logger.error(`Error listing passengers: ${error.message}`);
    return res.status(400).json({ message: error.message });
  }
};


const updatePassenger = async (req, res) => {
  try {
    const update=await Passenger.findByIdAndUpdate(req.params.id,req.body, { new: true });
    if (!update) {
      logger.warn(`Update failed: Passenger with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "passenger not found" });
    }
    logger.info(`Passenger updated: ${update.name}`);
    return res.status(200).json({ message: "passenger updated!", Updated_passenger:update.name });
  } catch (error) {
    logger.error(`Error updating passenger: ${error.message}`);
    return res.status(400).json({ message: error.message });
  }
};

const deletepassenger = async (req, res) => {
  try {
    const deletedpassenger = await Passenger.findByIdAndDelete(req.params.id);
    if (!deletedpassenger) {
      logger.warn(`Delete failed: Passenger with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "passenger not found" });
    }
    logger.info(`Passenger deleted: ${deletedPassenger.name}`);
    return res.status(200).json({ message: "passenger deleted!",deletedpassenger:deletedpassenger.name });
  } catch (error) {
    logger.error(`Error deleting passenger: ${error.message}`);
    return res.status(400).json({ message: error.message });
  }
};


module.exports = { addPassengers, loginpassenger,listPassenger,deletepassenger,updatePassenger };
