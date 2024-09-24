const Reservation = require("../Models/reservationSchema");
const Passenger = require('../Models/passengerSchema');
const Seat = require("../Models/seatSchema");
const Schedule = require("../Models/scheduleSchema");
const Train = require("../Models/trainSchema");
const mongoose = require("mongoose");
const logger = require('../logger');
const { createReservation, checkAndConfirmWaitingReservations, updateSeatAndTrain } = require("../function");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;
const moment = require('moment-timezone');


const makeReservation = async (req, res) => {
  const { passenger, seat, schedule } = req.body;

  try {
    const passengerDoc = await Passenger.findById(passenger);
    if (!passengerDoc) {
      logger.warn(`Passenger with ID ${passenger} not registered.`);
      return res.status(400).json({ message: "Passenger not registered." });
    }

    const scheduleDoc = await Schedule.findById(schedule).populate("train");
    if (!scheduleDoc) {
      logger.warn(`Schedule with ID ${schedule} not found.`);
      return res.status(400).json({ message: "Schedule not found." });
    }

    const departureTime = moment.tz(scheduleDoc.departureTime, 'Asia/Kolkata');
    const closeTime = departureTime.clone().subtract(RESERVATION_CLOSE_HOURS, 'hours');
    const now = moment.tz('Asia/Kolkata');

    if (now.isAfter(closeTime) && now.isBefore(departureTime)) {
      logger.warn(`Reservation attempt after closing time for schedule ID ${schedule}.`);
      return res.status(400).json({ message: "Reservation is closed." });
    }

    const train = scheduleDoc.train;
    const confirmedCount = await Reservation.countDocuments({ schedule, status: "Confirmed" });
    const waitingCount = await Reservation.countDocuments({ schedule, status: "Waiting" });

    if (seat === null) {
      if (confirmedCount >= train.totalSeats) {
        if (waitingCount >= train.totalSeats) {
          logger.warn(`Waiting list full for schedule ID ${schedule}.`);
          return res.status(400).json({ message: "Waiting list is full." });
        }

        const reservation = await createReservation(passenger, null, schedule, "Waiting");
        await checkAndConfirmWaitingReservations(schedule);
        logger.info(`Created waiting reservation for passenger ID ${passenger}.`);
        return res.status(201).json({ message: "Reservation created.", reservationId: reservation._id });
      } else {
        return res.status(400).json({ message: "Please select a seat." });
      }
    }

    const existingReservation = await Reservation.findOne({
      seat,
      schedule,
      status: { $in: ["Confirmed", "Waiting"] },
    });

    if (existingReservation) {
      logger.warn(`Seat ${seat} already booked for schedule ID ${schedule}.`);
      return res.status(400).json({ message: "Seat is already booked." });
    }

    const seatDoc = await Seat.findById(seat);
    if (!seatDoc) {
      logger.warn(`Seat with ID ${seat} not found.`);
      return res.status(400).json({ message: "Seat not found." });
    }

    const reservation = await createReservation(passenger, seat, schedule, "Confirmed");
    await updateSeatAndTrain(seatDoc, train);

    logger.info(`Created confirmed reservation for passenger ID ${passenger}.`);
    res.status(201).json({ message: "Reservation confirmed.", reservation });
  } catch (error) {
    logger.error(`Error creating reservation: ${error.message}`);
    res.status(500).json({ message: "An error occurred.", error: error.message });
  }
};



const cancelReservation = async (req, res) => {
  const { reservationId } = req.params;

  try {
    const reservation = await Reservation.findById(reservationId).populate("schedule");
    if (!reservation) {
      logger.warn(`Reservation with ID ${reservationId} not found.`);
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (reservation.status === "Canceled") {
      logger.warn(`Reservation with ID ${reservationId} is already canceled.`);
      return res.status(400).json({ message: "Reservation is already canceled." });
    }

    if (!reservation.schedule) {
      logger.warn(`Schedule for reservation ID ${reservationId} not found.`);
      return res.status(404).json({ message: "Schedule not found." });
    }

    const now = new Date();
    const arrivalTime = new Date(reservation.schedule.arrivalTime);
    const cancelCloseTime = new Date(arrivalTime - RESERVATION_CLOSE_HOURS);

    if (now > cancelCloseTime) {
      logger.warn(`Cannot cancel reservation with ID ${reservationId} within 3 hours of arrival.`);
      return res.status(400).json({ message: "Cannot cancel reservation within 3 hours of arrival." });
    }

    const freedSeat = reservation.seat;
    const train = await Train.findById(reservation.schedule.train);

    if (reservation.status === "Waiting") {
      await Reservation.findByIdAndDelete(reservationId);

      if (freedSeat) {
        const seatDoc = await Seat.findById(freedSeat);
        if (seatDoc) {
          seatDoc.isAvailable = true;
          await seatDoc.save();
          logger.info(`Freed seat with ID ${freedSeat} after waiting reservation cancellation.`);
        }
      }

      if (train) {
        train.availableSeats += 1;
        await train.save();
        logger.info(`Updated available seats for train ID ${train._id} after waiting reservation cancellation.`);
      }

      return res.status(200).json({ message: "Waiting reservation deleted successfully." });
    } else if (reservation.status === "Confirmed") {
      if (!freedSeat) {
        logger.warn(`Reservation with ID ${reservationId} is missing seat information and was deleted.`);
        await Reservation.findByIdAndDelete(reservationId);
        return res.status(400).json({
          message: "Please register again. Reservation is missing seat information.",
        });
      }

      reservation.status = "Canceled";
      reservation.seat = null;
      await reservation.save();

      if (freedSeat) {
        const seatDoc = await Seat.findById(freedSeat);
        if (seatDoc) {
          seatDoc.isAvailable = true;
          await seatDoc.save();
          logger.info(`Freed seat with ID ${freedSeat} after confirmed reservation cancellation.`);
        }
      }

      if (train) {
        train.availableSeats += 1;
        await train.save();
        logger.info(`Updated available seats for train ID ${train._id} after confirmed reservation cancellation.`);
      }

      const waitingReservations = await Reservation.find({
        schedule: reservation.schedule._id,
        status: "Waiting",
        seat: null,
      }).sort({ reservationTime: 1 });

      const [firstWaiting, secondWaiting] = waitingReservations;

      if (firstWaiting && train.availableSeats > 0) {
        firstWaiting.seat = freedSeat;
        firstWaiting.status = "Confirmed";
        await firstWaiting.save();

        const seatDoc = await Seat.findById(freedSeat);
        if (seatDoc) {
          seatDoc.isAvailable = false;
          await seatDoc.save();
        }

        train.availableSeats -= 1;
      }

      if (secondWaiting && train.availableSeats > 0) {
        const anotherFreedSeat = freedSeat; 
        secondWaiting.seat = anotherFreedSeat;
        secondWaiting.status = "Confirmed";
        await secondWaiting.save();

        const anotherSeatDoc = await Seat.findById(anotherFreedSeat);
        if (anotherSeatDoc) {
          anotherSeatDoc.isAvailable = false;
          await anotherSeatDoc.save();
        }

        train.availableSeats -= 1;
      }

      await train.save();
      logger.info(`Updated waiting reservations and seat availability after confirmed reservation cancellation.`);

      return res.status(200).json({ message: "Reservation canceled successfully." });
    }
  } catch (error) {
    logger.error(`Error canceling reservation: ${error.message}`);
    return res.status(500).json({
      message: "An error occurred during reservation cancellation.",
      error,
    });
  }
};





const getReservationStatusByPassengerId = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      passenger: req.params.passengerId,
    })
      .populate("seat", "-isAvailable")
      .populate("schedule", "departureTime arrivalTime train")
      .populate("schedule.train", "trainName")
      .populate("passenger", "name");

    logger.info(`Retrieved reservations for passenger ID ${req.params.passengerId}.`);
    return res.status(200).json({ message: "Reservations retrieved successfully.", reservations });
  } catch (error) {
    logger.error(`Error retrieving reservations: ${error.message}`);
    return res.status(500).json({ message: "An error occurred.", error: error.message });
  }
};

const getWaitingListCountByTrainId = async (req, res) => {
  const { trainId } = req.params;

  if (!trainId || !mongoose.Types.ObjectId.isValid(trainId)) {
    logger.warn(`Invalid train ID ${trainId} provided.`);
    return res.status(400).json({ message: "Invalid or missing train ID." });
  }

  try {
    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ message: "Train not found." });
    }

    const waitingCount = await Reservation.countDocuments({
      schedule: { $in: await Schedule.find({ train: trainId }).distinct('_id') },
      status: "Waiting",
    });

    logger.info(`Retrieved waiting list count for train ID ${trainId}.`);
    return res.status(200).json({ message: "Waiting list count retrieved.", waitingCount });
  } catch (error) {
    logger.error(`Error retrieving waiting list count: ${error.message}`);
    res.status(500).json({ message: "An error occurred.", error: error.message });
  }
};


const getConfirmedByTrainId = async (req, res) => {
  const { trainId } = req.params;

  if (!trainId || !mongoose.Types.ObjectId.isValid(trainId)) {
    logger.warn(`Invalid train ID ${trainId} provided.`);
    return res.status(400).json({ message: "Invalid or missing train ID." });
  }

  try {
    const train = await Train.findById(trainId);
    if (!train) return res.status(404).json({ message: "Train not found." });

    const confirmedReservations = await Reservation.find({
      status: "Confirmed",
      schedule: { $in: await Schedule.find({ train: trainId }).distinct('_id') },
    })
      .populate("seat", "seatNumber")
      .populate("schedule", "departureTime arrivalTime");

    logger.info(`Retrieved confirmed reservations for train ID ${trainId}.`);
    return res.status(200).json({ message: "Confirmed reservations retrieved.", confirmedReservations });
  } catch (error) {
    logger.error(`Error retrieving confirmed reservations: ${error.message}`);
    return res.status(500).json({ message: "An error occurred.", error: error.message });
  }
};


const getNotConfirmedReservations = async (req, res) => {
  const { scheduleId } = req.params;

  try {
    const notConfirmedReservations = await Reservation.aggregate([
      {
        $match: {
          schedule: mongoose.Types.ObjectId(scheduleId),
          status: "Not-Confirmed",
        },
      },
      {
        $lookup: {
          from: "passengers",
          localField: "passenger",
          foreignField: "_id",
          as: "passengerInfo",
        },
      },
      {
        $unwind: {
          path: "$passengerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          name: {
            $ifNull: ["$passengerInfo.name", "Unknown"],
          },
        },
      },
    ]);

    if (notConfirmedReservations.length === 0) {
      logger.info(`No non-confirmed reservations found for schedule ID ${scheduleId}.`);
      return res.status(404).json({ message: "No non-confirmed reservations found." });
    }

    logger.info(`Retrieved ${notConfirmedReservations.length} non-confirmed reservations for schedule ID ${scheduleId}.`);
    return res.status(200).json({
      message: "Non-confirmed reservations retrieved.",
      number_of_non_confirmed_passengers: notConfirmedReservations.length,
      passengers: notConfirmedReservations,
    });
  } catch (error) {
    logger.error(`Error retrieving non-confirmed reservations for schedule ID ${scheduleId}: ${error.message}`);
    return res.status(500).json({
      message: "An error occurred while retrieving non-confirmed reservations.",
      error: error.message,
    });
  }
};




module.exports = {
  makeReservation,
  cancelReservation,
  getReservationStatusByPassengerId,
  getWaitingListCountByTrainId,
  getConfirmedByTrainId,
  getNotConfirmedReservations,
};
