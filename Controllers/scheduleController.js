const moment = require('moment-timezone');
const Schedule = require('../Models/scheduleSchema');
const Train = require('../Models/trainSchema');

const addSchedule = async (req, res) => {
  const { train, departureTime, arrivalTime } = req.body;
  if (!train || !departureTime || !arrivalTime) {
    return res.status(400).json({ message: "Please fill required fields." });
  }

  
  const parseDate = (dateStr) => {
    const date = moment(dateStr, 'YYYY-MM-DD HH:mm', true);
    return date.isValid() ? date.toDate() : null;
  };

  const departureTimeParsed = parseDate(departureTime);
  const arrivalTimeParsed = parseDate(arrivalTime);

  if (!departureTimeParsed || !arrivalTimeParsed) {
    return res.status(400).json({ message: "Invalid date format. Please use 'YYYY-MM-DD HH:mm' format." });
  }

  const departureTimeUTC = moment(departureTimeParsed).utc().toDate();
  const arrivalTimeUTC = moment(arrivalTimeParsed).utc().toDate();

  try {
    const schedule = new Schedule({
      train,
      departureTime: departureTimeUTC,
      arrivalTime: arrivalTimeUTC
    });

    await schedule.save();
    return res.status(201).json({ message: "Schedule added." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const listSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate('train', 'trainName')
      .exec();

    const convertToIST = (date) => {
      return moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm');
    };

    const schedulesWithIST = schedules.map(schedule => {
      return {
        ...schedule.toObject(),
        departureTime: convertToIST(schedule.departureTime),
        arrivalTime: convertToIST(schedule.arrivalTime),
      };
    });

    return res.status(200).json({ message: "List of schedules:", schedules: schedulesWithIST });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('train', 'trainName')
      .exec();
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    return res.status(200).json({ schedule: {
      ...schedule.toObject(),
      departureTime: moment(schedule.departureTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm'),
      arrivalTime: moment(schedule.arrivalTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm'),
    } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    return res.status(200).json({ message: "Schedule updated", schedule: updatedSchedule });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!deletedSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    return res.status(200).json({ message: "Schedule deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// const getSchedulesByTrain = async (req, res) => {
//   try {
//     const { trainName } = req.params;

//     const train = await Train.findOne({ trainName });

//     if (!train) {
//       return res.status(404).json({ message: "Train not found" });
//     }

//     const schedules = await Schedule.find({ train: train._id })
//       .populate({
//         path: 'train',
//         select: 'trainName'
//       });

//     return res.status(200).json({ schedules });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

module.exports = { addSchedule, listSchedules, getScheduleById, updateSchedule, deleteSchedule, 
  //  getSchedulesByTrain
   };
