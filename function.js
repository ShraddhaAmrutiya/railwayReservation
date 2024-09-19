const Reservation = require("./Models/reservationSchema");
const Seat = require("./Models/seatSchema");
const Schedule = require("./Models/scheduleSchema");
const Train = require("./Models/trainSchema");

const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;

const createReservation = async (passenger, seat, schedule, status) => {
  const scheduleDoc = await Schedule.findById(schedule).populate('train');
  if (!scheduleDoc) {
    throw new Error('Schedule not found');
  }

  const arrivalTime = new Date(scheduleDoc.arrivalTime);
  const closeTime = new Date(arrivalTime.getTime() - RESERVATION_CLOSE_HOURS);
  const now = new Date();

  if (now >= closeTime && now < arrivalTime) {
    throw new Error("Reservation is closed.");
  }

  const reservation = new Reservation({ passenger, seat, schedule, status });
  return reservation.save();
};


const checkAndConfirmWaitingReservations = async (scheduleId) => {
  try {
    const scheduleDoc = await Schedule.findById(scheduleId).populate('train');
    
    
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
      } else {
        break;
      }
    }
    
  } catch (error) {
    console.error('Error confirming waiting reservations:', error);
  }
};

const closeReservations = async (scheduleId) => {
  try {
    const schedule = await Schedule.findById(scheduleId).populate('train');
    
    const arrivalTime = new Date(schedule.arrivalTime);
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
      }));
    }
  } catch (error) {
    console.error('Error closing reservations:', error);
    throw new Error('Error closing reservations: ' + error.message);
  }
};

const updateSeatAndTrain = async (seatDoc, train) => {
  seatDoc.isAvailable = false;
  await seatDoc.save();

  train.availableSeats -= 1;
  await train.save();

  if (train.availableSeats === 0) {
    await closeReservations(train._id);
  }
};



module.exports = {
  createReservation,
  checkAndConfirmWaitingReservations,
  closeReservations,
  updateSeatAndTrain
};
