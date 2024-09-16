const Train = require("../Models/trainSchema");

const addTrains = async (req, res) => {
  const { trainName, trainNumber, totalSeats } = req.body;

  if (!trainName || !trainNumber || !totalSeats) {
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const existingTrain = await Train.findOne({
      $or: [{ trainName }, { trainNumber }],
    });

    if (existingTrain) {
      return res.status(400).json({ message: "Train already exists" });
    }
    const train = new Train({
      trainName,
      trainNumber,
      totalSeats,
      availableSeats: totalSeats,  
    });

    await train.save();
    return res.status(201).json({ message: "Train added.", trainName: train.trainName });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getTrains = async (req, res) => {
  try {
    const trains = await Train.find();
    return res.status(200).json({ trains });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


const updateTrain = async (req, res) => {
  try {
    const updatedTrain = await Train.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }  
    );

    if (!updatedTrain) {
      return res.status(404).json({ message: "Train not found" });
    }

    
    return res.status(200).json({
      message: "Train updated",
      name: updatedTrain.trainName  
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



const deleteTrain = async (req, res) => {
  try {
    const deletedTrain = await Train.findByIdAndDelete(req.params.id);

    if (!deletedTrain) {
      return res.status(404).json({ message: "Train not found" });
    }

    return res.status(200).json({ message: "Train deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { addTrains, getTrains,updateTrain,deleteTrain};
