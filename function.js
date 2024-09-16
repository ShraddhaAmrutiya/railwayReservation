const Reservation = require("./Models/reservationSchema");
const Seat = require("./Models/seatSchema");
const Schedule = require("./Models/scheduleSchema");
const Train = require("./Models/trainSchema");
const mongoose = require("mongoose");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;



const createReservation = async (passenger, seat, schedule, status) => {
    const reservation = new Reservation({ passenger, seat, schedule, status });
    return reservation.save();
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
  
  const checkAndConfirmWaitingReservations = async (scheduleId) => {
    const scheduleDoc = await Schedule.findById(scheduleId).populate("train");
    const train = scheduleDoc.train;
  
    const waitingReservations = await Reservation.find({
      schedule: scheduleId,
      status: "Waiting",
    }).sort({reservationTime:1});
  
    for (const reservation of waitingReservations) {
      if (train.availableSeats > 0) {
        reservation.status = "Confirmed";
        await reservation.save();
        const seatDoc = await Seat.findById(reservation.seat);
        await updateSeatAndTrain(seatDoc, train);
      } else {
        break;
      }
    }
  };
  
  const closeReservations = async (trainId) => {
    await Reservation.updateMany(
      { schedule: trainId, status: "Waiting" },
      { status: "Not Confirmed" }
    );
  };


  module.exports={createReservation,checkAndConfirmWaitingReservations,closeReservations}