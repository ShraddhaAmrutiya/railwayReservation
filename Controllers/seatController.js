const Seat = require('../Models/seatSchema');
const mongoose=require('mongoose')
const logger= require('../logger')

const seatAdds = async (req, res) => {
  const { schedule, seatNumber } = req.body;

  if (!schedule || !seatNumber ) {
    logger.warn('Add seat failed: Missing required fields.');
    return res.status(400).json({ message: 'Please fill required fields.' });
  }

  try {
    const seat  = new Seat ({
        schedule, seatNumber
      }
    );
    await seat.save();
    logger.info(`Seat added: ${seat.seatNumber}`);
    return res.status(201).json({message:"seat added.",seatNumber:seat.seatNumber});
  } catch (error) {
    logger.error(`Error adding seat: ${error.message}`);
    return res.status(500).json({error: error.message});
  }
};
const addMultipleSeats = async (req, res) => {
  try {
      const { schedule, seatNumbers } = req.body;

      const scheduleId = mongoose.isValidObjectId(schedule) ? schedule : mongoose.Types.ObjectId(schedule);

      const seats = seatNumbers.map(number => ({
          schedule: scheduleId,
          seatNumber: number,
          isAvailable: true
      }));

      const result = await Seat.insertMany(seats);
      logger.info(`${result.length} seats added successfully.`);
      res.status(201).json({ message: `${result.length} seats added successfully` });
  } catch (error) {
      console.error('Error adding seats:', error); 
      logger.error(`Error adding seats: ${error.message}`);
      res.status(500).json({ message: 'Error adding seats', error: error.message });
  }
}

const getAllSeats = async (req, res) => {
  try {
    const seats = await Seat.find(); 
    logger.info('List of seats retrieved successfully.');
    res.status(200).json({ seats }); 
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

module.exports={seatAdds,addMultipleSeats,getAllSeats,deleteSeat}