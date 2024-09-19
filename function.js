const Reservation = require("./Models/reservationSchema");
const Seat = require("./Models/seatSchema");
const Schedule = require("./Models/scheduleSchema");
const Train = require("./Models/trainSchema");
const logger = require('./logger');

const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;


const createReservation = async (passenger, seat, schedule, status) => {
  try {
    const scheduleDoc = await Schedule.findById(schedule).populate('train');
    if (!scheduleDoc) {
      logger.error('Schedule not found', { scheduleId: schedule });
      throw new Error('Schedule not found');
    }

    const arrivalTime = new Date(scheduleDoc.arrivalTime);
    const closeTime = new Date(arrivalTime.getTime() - RESERVATION_CLOSE_HOURS);
    const now = new Date();

    if (now >= closeTime && now < arrivalTime) {
      logger.warn('Reservation closed', { scheduleId: schedule, currentTime: now });
      throw new Error("Reservation is closed.");
    }

    const reservation = new Reservation({ passenger, seat, schedule, status });
    await reservation.save();
    logger.info('Reservation created', { reservationId: reservation._id, passenger, seat, schedule, status });
    return reservation;
  } catch (error) {
    logger.error('Error creating reservation', { error: error.message, passenger, seat, schedule, status });
    throw error;
  }
};


const checkAndConfirmWaitingReservations = async (scheduleId) => {
  try {
    const scheduleDoc = await Schedule.findById(scheduleId).populate('train');
    if (!scheduleDoc) {
      logger.error('Schedule not found', { scheduleId });
      throw new Error('Schedule not found');
    }
    const train = scheduleDoc.train;

    const waitingReservations = await Reservation.find({
      schedule: scheduleId,
      status: 'Waiting',
    }).sort({ reservationTime: 1 });

    for (const reservation of waitingReservations) {
      if (train.availableSeats > 0) {
        reservation.status = 'Confirmed';
        await reservation.save();

        if (reservation.seat) {
          const seatDoc = await Seat.findById(reservation.seat);
          if (seatDoc) {
            seatDoc.isAvailable = false;
            await seatDoc.save();
          } 
        }

        train.availableSeats -= 1;
        await train.save();
       logger.info('Reservation confirmed', { reservationId: reservation._id, seat: reservation.seat, train: train._id });
} else {
        break;
      }
    }
    
  } catch (error) {
    logger.error('Error confirming waiting reservations', { error: error.message, scheduleId });
  }
};

const closeReservations = async (scheduleId) => {
  try {
    const schedule = await Schedule.findById(scheduleId).populate('train');
    
    if (!schedule) {
      logger.error('Schedule not found', { scheduleId });
      return;
    }

    const arrivalTime = new Date(schedule.arrivalTime);
    if (isNaN(arrivalTime.getTime())) {
      logger.error('Invalid arrival time', { scheduleId, arrivalTime });
      return; // Exit if arrival time is invalid
    }

    const closeTime = new Date(arrivalTime.getTime() - RESERVATION_CLOSE_HOURS);
    const now = new Date();

    if (now >= closeTime && now < arrivalTime) {
      await Reservation.updateMany(
        { schedule: scheduleId, status: 'Waiting' },
        { $set: { status: 'Not-Confirmed' } }
      );

      const waitingReservations = await Reservation.find({
        schedule: scheduleId,
        status: 'Not-Confirmed',
        seat: { $ne: null }
      }).populate('seat');

      await Promise.all(waitingReservations.map(async (reservation) => {
        if (reservation.seat) {
          reservation.seat.isAvailable = true;
          await reservation.seat.save();
        }

        await Reservation.findByIdAndDelete(reservation._id);

        const train = await Train.findById(reservation.schedule.train);
        if (train) {
          train.availableSeats += 1;
          await train.save();
        }
        logger.info('Reservation closed', { reservationId: reservation._id, seat: reservation.seat });
      }));
    }
  } catch (error) {
    logger.error('Error closing reservations', { error: error.message, scheduleId });
    throw new Error('Error closing reservations: ' + error.message);
  }
};

const updateSeatAndTrain = async (seatDoc, train) => {
  try {
    seatDoc.isAvailable = false;
    await seatDoc.save();

    train.availableSeats -= 1;
    await train.save();

    if (train.availableSeats === 0) {
      await closeReservations(train._id);
    }

    logger.info('Seat and train updated', { seatId: seatDoc._id, trainId: train._id });
  } catch (error) {
    logger.error('Error updating seat and train', { error: error.message, seatId: seatDoc._id, trainId: train._id });
    throw error;
  }
};




module.exports = {
  createReservation,
  checkAndConfirmWaitingReservations,
  closeReservations,
  updateSeatAndTrain
};
