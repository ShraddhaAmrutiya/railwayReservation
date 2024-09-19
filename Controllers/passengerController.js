const Passenger = require("../Models/passengerSchema");
const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET } = process.env;

const addPassengers = async (req, res) => {
  const { name, email, password, role } = req.body; 

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const existingPassenger = await Passenger.findOne({ email });

    if (existingPassenger) {
      return res
        .status(400)
        .json({ message: "Passenger already exists. Please login." });
    }

    // Validate role
    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    const passenger = new Passenger({
      name,
      email,
      password,
      role: role || "user", 
    });

    await passenger.save();
    return res
      .status(201)
      .json({ message: "Passenger added.", name: passenger.name });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const loginpassenger = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Fill the required fields." });
  }
  try {
    const passenger = await Passenger.findOne({ email });
    if (!passenger)
      return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = jwt.sign({ id: passenger.id }, ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ message: "Passenger login successfully.", accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



const listPassenger = async (req, res) => {
  try {
    const getPassenger=await Passenger.find({},{name:1,_id:0});
    
    return res.status(200).json({ message: "List of passengers:",getPassenger });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


const updatePassenger = async (req, res) => {
  try {
    const update=await Passenger.findByIdAndUpdate(req.params.id,req.body, { new: true });
    if (!update) {
      return res.status(404).json({ message: "passenger not found" });
    }
    return res.status(200).json({ message: "passenger updated!", Updated_passenger:update.name });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deletepassenger = async (req, res) => {
  try {
    const deletedpassenger = await Passenger.findByIdAndDelete(req.params.id);
    if (!deletedpassenger) {
      return res.status(404).json({ message: "passenger not found" });
    }
    return res.status(200).json({ message: "passenger deleted!",deletedpassenger:deletedpassenger.name });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


module.exports = { addPassengers, loginpassenger,listPassenger,deletepassenger,updatePassenger };
