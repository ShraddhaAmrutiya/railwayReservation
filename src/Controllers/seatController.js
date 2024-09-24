const Seat = require('../Models/seatSchema');
const mongoose = require('mongoose');
const logger = require('../logger');




const getAllSeats = async (req, res) => {
  try {
    const seats = await Seat.find();
    logger.info('List of seats retrieved successfully.');
    res.status(200).json({ message: "List of seats retrieved.", seats });
  } catch (error) {
    logger.error(`Error retrieving seats: ${error.message}`);
    res.status(500).json({ message: 'Error retrieving seats', error: error.message });
  }
};

const deleteSeat = async (req, res) => {
  const { seatId } = req.params;

  if (!mongoose.isValidObjectId(seatId)) {
    logger.warn(`Delete seat failed: Invalid seat ID ${seatId}.`);
    return res.status(400).json({ message: 'Invalid seat ID.' });
  }

  try {
    const result = await Seat.findByIdAndDelete(seatId);
    if (!result) {
      logger.warn(`Delete seat failed: Seat with ID ${seatId} not found.`);
      return res.status(404).json({ message: 'Seat not found.' });
    }
    logger.info(`Seat deleted successfully: ${seatId}`);
    res.status(200).json({ message: 'Seat deleted successfully.' });
  } catch (error) {
    logger.error(`Error deleting seat: ${error.message}`);
    res.status(500).json({ message: 'Error deleting seat', error: error.message });
  }
};

module.exports = { getAllSeats, deleteSeat };
