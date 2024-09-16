const Seat = require('../Models/seatSchema');
const mongoose=require('mongoose')
const seatAdds = async (req, res) => {
  const { schedule, seatNumber } = req.body;

  if (!schedule || !seatNumber ) {
    return res.status(400).json({ message: 'Please fill required fields.' });
  }

  try {
    const seat  = new Seat ({
        schedule, seatNumber
      }
    );
    await seat.save();
return res.status(201).json({message:"seat added.",seatNumber:seat.seatNumber});
  } catch (error) {
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
      res.status(201).json({ message: `${result.length} seats added successfully` });
  } catch (error) {
      console.error('Error adding seats:', error); 
      res.status(500).json({ message: 'Error adding seats', error: error.message });
  }
}

module.exports={seatAdds,addMultipleSeats}