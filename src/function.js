const Reservation = require("./Models/reservationSchema");
const Seat = require("./Models/seatSchema");
const Schedule = require("./Models/scheduleSchema");
const Train = require("./Models/trainSchema");
const logger = require('./logger');
const moment = require('moment-timezone');

const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;

const createReservation = async (passenger, seat, schedule, status) => {
  try {
    const scheduleDoc = await Schedule.findById(schedule).populate('train');
    
    const departureTime = new Date(scheduleDoc.departureTime);
    const closeTime = new Date(departureTime.getTime() - RESERVATION_CLOSE_HOURS);
    const now = new Date();

    if (now >= closeTime && now < departureTime) {
      logger.warn('Reservation closed', { scheduleId: schedule, currentTime: now });
      throw new Error("Reservation is closed.");
    }

    const reservation = new Reservation({ passenger, seat, schedule, status });
    await reservation.save();
    logger.info('Reservation created', { reservationId: reservation._id, passenger, seat, schedule, status });
    return { message: "Reservation created.", reservationId: reservation._id };
  } catch (error) {
    logger.error('Error creating reservation', { error: error.message, passenger, seat, schedule, status });
    throw new Error(error.message);
  }
};
const checkAndConfirmWaitingReservations = async (scheduleId) => {
  
  try {
    const scheduleDoc = await Schedule.findById(scheduleId).populate('train');
    const train = scheduleDoc.train;
    const waitingReservations = await Reservation.find({
      schedule: scheduleId,
      status: 'Waiting',
    }).sort({ reservationTime: 1 });

    const reservationsToConfirm = waitingReservations.slice(0, train.availableSeats);

    const reservationIdsToUpdate = []; 
    const seatIdsToUpdate = []; 
    await Reservation.updateMany(
      { _id: { $in: reservationIdsToUpdate } },
      { $set: { status: 'Confirmed' } }
    );

    if (seatIdsToUpdate.length > 0) {
      await Seat.updateMany(
        { _id: { $in: seatIdsToUpdate } },
        { $set: { isAvailable: false } }
      );
    }
    train.availableSeats -= reservationsToConfirm.length;
    await train.save();
  } catch (error) {
    logger.error('Error confirming waiting reservations', { error: error.message, scheduleId });
  }
};


const closeReservations = async (scheduleId) => {
  try {
    const schedule = await Schedule.findById(scheduleId).populate('train');
    const departureTime = moment.tz(schedule.departureTime, 'Asia/Kolkata');
    const closeTime = departureTime.clone().subtract(RESERVATION_CLOSE_HOURS, 'hours');
    const now = moment.tz('Asia/Kolkata');

    if (now.isSameOrAfter(closeTime) && now.isBefore(departureTime)) {
      await Reservation.updateMany(
        { schedule: scheduleId, status: 'Waiting' },
        { $set: { status: 'Not-Confirmed' } }
      );

      const waitingReservations = await Reservation.find({
        schedule: scheduleId,
        status: 'Not-Confirmed',
        seat: { $ne: null }
      }).populate('seat');

      if (waitingReservations.length > 0) {
        const reservation = waitingReservations[0];
        if (reservation && reservation.seat) {
          reservation.seat.isAvailable = true;
          await reservation.seat.save();
          await Reservation.findByIdAndDelete(reservation._id);
          
          const train = await Train.findById(reservation.schedule.train);
          if (train) {
            train.availableSeats += 1;
            await train.save();
          }
          logger.info('Reservation closed', { reservationId: reservation._id, seat: reservation.seat });
        }
      }
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
    throw new Error(error.message);
  }
};

module.exports = {
  createReservation,
  checkAndConfirmWaitingReservations,
  closeReservations,
  updateSeatAndTrain,
  
};
