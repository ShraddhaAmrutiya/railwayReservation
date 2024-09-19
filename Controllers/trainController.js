const Train = require("../Models/trainSchema");
const logger= require ('../logger')

const addTrains = async (req, res) => {
  const { trainName, trainNumber, totalSeats } = req.body;

  if (!trainName || !trainNumber || !totalSeats) {
    logger.warn('Add train failed: Missing required fields.');
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const existingTrain = await Train.findOne({
      $or: [{ trainName }, { trainNumber }],
    });

    if (existingTrain) {
      logger.warn(`Add train failed: Train with name ${trainName} or number ${trainNumber} already exists.`);
      return res.status(400).json({ message: "Train already exists" });
    }
    const train = new Train({
      trainName,
      trainNumber,
      totalSeats,
      availableSeats: totalSeats,  
    });

    await train.save();
    logger.info(`Train added: ${trainName}`);
    return res.status(201).json({ message: "Train added.", trainName: train.trainName });
  } catch (error) {
    logger.error(`Error adding train: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

const getTrains = async (req, res) => {
  try {
    const trains = await Train.find();
    logger.info('List of trains retrieved successfully.');
    return res.status(200).json({ trains });
  } catch (error) {
    logger.error(`Error retrieving trains: ${error.message}`);
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
      logger.warn(`Update failed: Train with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "Train not found" });
    }

    logger.info(`Train updated: ${updatedTrain.trainName}`);
    return res.status(200).json({
      message: "Train updated",
      name: updatedTrain.trainName  
    });
  } catch (error) {
    logger.error(`Error updating train: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};



const deleteTrain = async (req, res) => {
  try {
    const deletedTrain = await Train.findByIdAndDelete(req.params.id);

    if (!deletedTrain) {
      logger.warn(`Delete faailed: train with id ${req.params.id} not found`)
      return res.status(404).json({ message: "Train not found" });
    }
    
    logger.info(`Train deleted: ${deletedTrain.trainName}`);
    return res.status(200).json({ message: "Train deleted" });
  } catch (error) {
    logger.error(`Error deleting train: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { addTrains, getTrains,updateTrain,deleteTrain};
