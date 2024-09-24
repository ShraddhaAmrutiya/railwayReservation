const Train = require("../Models/trainSchema");
const logger = require('../logger');
const Seat=require('../Models/seatSchema')



const addTrains = async (req, res) => {
  const { trainName, trainNumber, totalSeats, compartments } = req.body;

  if (!trainName || !trainNumber || !totalSeats || !compartments) {
    logger.warn('Add train failed: Missing required fields.');
    return res.status(400).json({ message: "Please fill required fields." });
  }

  const totalSeatsNum = Number(totalSeats);
  if (isNaN(totalSeatsNum) || totalSeatsNum <= 0) {
    logger.warn('Add train failed: Total seats must be a positive number.');
    return res.status(400).json({ message: "Total seats must be a positive number." });
  }

  if (!Array.isArray(compartments) || compartments.length === 0) {
    logger.warn('Add train failed: Compartments must be a non-empty array.');
    return res.status(400).json({ message: "Compartments must be a non-empty array." });
  }

  try {
    const existingTrain = await Train.findOne({
      $or: [{ trainName }, { trainNumber }],
    });

    if (existingTrain) {
      logger.warn(`Add train failed: Train with name ${trainName} or number ${trainNumber} already exists.`);
      return res.status(400).json({ message: "Train already exists." });
    }

    const train = new Train({
      trainName,
      trainNumber,
      totalSeats: totalSeatsNum,
      availableSeats: totalSeatsNum,
    });

    await train.save();
    logger.info(`Train added: ${trainName}`);

    const seatsPerCompartment = Math.floor(totalSeatsNum / compartments.length);
    const remainingSeats = totalSeatsNum % compartments.length;
    let seatNumber = 1;
    const allSeats = [];

    const prepareSeats = (compartmentsIndex, seatLimit) => {
      if (compartmentsIndex >= compartments.length) return;
      
      const currentCompartment = compartments[compartmentsIndex];
      const currentCompartmentSeats = seatLimit + (compartmentsIndex < remainingSeats ? 1 : 0);

      if (currentCompartmentSeats > 0) {
        const addSeat = (count) => {
          if (count > currentCompartmentSeats) return;
          allSeats.push({
            seatNumber: `${currentCompartment}${seatNumber++}`,
            isAvailable: true,
            compartment: currentCompartment
          });
          addSeat(count + 1);
        };
        addSeat(1);
      }

      prepareSeats(compartmentsIndex + 1, seatsPerCompartment);
    };

    prepareSeats(0, seatsPerCompartment);

    logger.info(`${allSeats.length} seats prepared for insertion.`);

    try {
      await Seat.insertMany(allSeats);
      logger.info(`${allSeats.length} seats added to the database.`);
    } catch (error) {
      logger.error(`Error adding seats: ${error.message}`);
      return res.status(500).json({ message: "Failed to add seats to the database." });
    }

    return res.status(201).json({ message: "Train and seats added.", trainName: train.trainName });
  } catch (error) {
    logger.error(`Error adding train: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};




const getTrains = async (req, res) => {
  try {
    const trains = await Train.find();
    logger.info('List of trains retrieved successfully.');
    return res.status(200).json({ message: "List of trains retrieved.", trains });
  } catch (error) {
    logger.error(`Error retrieving trains: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};

const updateTrain = async (req, res) => {
  try {
    const updatedTrain = await Train.findByIdAndUpdate(
      req.params.id,
      req.body);

    if (!updatedTrain) {
      logger.warn(`Update failed: Train with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "Train not found." });
    }

    logger.info(`Train updated: ${updatedTrain.trainName}`);
    return res.status(200).json({
      message: "Train updated.",
      trainName: updatedTrain.trainName,
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
      logger.warn(`Delete failed: Train with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "Train not found." });
    }

    logger.info(`Train deleted: ${deletedTrain.trainName}`);
    return res.status(200).json({ message: "Train deleted." });
  } catch (error) {
    logger.error(`Error deleting train: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { addTrains, getTrains, updateTrain, deleteTrain };
