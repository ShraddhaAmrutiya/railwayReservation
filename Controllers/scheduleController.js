const moment = require('moment-timezone');
const Schedule = require('../Models/scheduleSchema');
const Train = require('../Models/trainSchema');
const logger=require('../logger')


const addSchedule = async (req, res) => {
  const { train, departureTime, arrivalTime } = req.body;
  if (!train || !departureTime || !arrivalTime) {
    logger.warn('Add schedule failed: Missing required fields.');
    return res.status(400).json({ message: "Please fill required fields." });
  }

  
  const parseDate = (dateStr) => {
    const date = moment(dateStr, 'YYYY-MM-DD HH:mm', true);
    return date.isValid() ? date.toDate() : null;
  };

  const departureTimeParsed = parseDate(departureTime);
  const arrivalTimeParsed = parseDate(arrivalTime);

  if (!departureTimeParsed || !arrivalTimeParsed) {
    logger.warn('Add schedule failed: Invalid date format.');
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
    logger.info(`Schedule added: Train ${train}, Departure ${departureTimeUTC}, Arrival ${arrivalTimeUTC}`);
    return res.status(201).json({ message: "Schedule added." });
  } catch (error) {
    logger.error(`Error adding schedule: ${error.message}`);
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
    logger.info('List of schedules retrieved successfully.');
    return res.status(200).json({ message: "List of schedules:", schedules: schedulesWithIST });
  } catch (error) {
    logger.error(`Error retrieving schedules: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('train', 'trainName')
      .exec();
    if (!schedule) {
      logger.warn(`Get schedule failed: Schedule with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "Schedule not found" });
    }
    logger.info(`Schedule retrieved: ${schedule.train.trainName}, Departure ${schedule.departureTime}, Arrival ${schedule.arrivalTime}`);
    return res.status(200).json({ schedule: {
      ...schedule.toObject(),
      departureTime: moment(schedule.departureTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm'),
      arrivalTime: moment(schedule.arrivalTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm'),
    } });
  } catch (error) {
    logger.error(`Error retrieving schedule: ${error.message}`);
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
      logger.warn(`Update schedule failed: Schedule with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "Schedule not found" });
    }
    logger.info(`Schedule updated: ${updatedSchedule.train.trainName}, Departure ${updatedSchedule.departureTime}, Arrival ${updatedSchedule.arrivalTime}`);
    return res.status(200).json({ message: "Schedule updated", schedule: updatedSchedule });
  } catch (error) {
    logger.error(`Error updating schedule: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!deletedSchedule) {
      logger.warn(`Delete schedule failed: Schedule with ID ${req.params.id} not found.`);
      return res.status(404).json({ message: "Schedule not found" });
    }
    logger.info(`Schedule deleted: ${deletedSchedule.train.trainName}, Departure ${deletedSchedule.departureTime}, Arrival ${deletedSchedule.arrivalTime}`);
    return res.status(200).json({ message: "Schedule deleted" });
  } catch (error) {
    logger.error(`Error deleting schedule: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};


module.exports = { addSchedule, listSchedules, getScheduleById, updateSchedule, deleteSchedule, 
  
   };
