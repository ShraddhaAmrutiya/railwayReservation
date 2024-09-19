const Reservation = require("../Models/reservationSchema");
const Passenger = require('../Models/passengerSchema');

const Seat = require("../Models/seatSchema");
const Schedule = require("../Models/scheduleSchema");
const Train = require("../Models/trainSchema");
const mongoose = require("mongoose");
const logger = require('../logger');
const { createReservation, checkAndConfirmWaitingReservations,updateSeatAndTrain } = require("../function");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;


const makeReservation = async (req, res) => {
  const { passenger, seat, schedule } = req.body;

  if (!passenger || !schedule) {
    logger.warn('Reservation attempt with missing required fields.');
    return res.status(400).json({ message: "Please fill required fields." });
  }

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

    if (
      new Date() >
      new Date(scheduleDoc.departureTime) - RESERVATION_CLOSE_HOURS
    ) {
      logger.warn(`Reservation attempt after closing time for schedule ID ${schedule}.`);
      return res.status(400).json({ message: "Reservation is closed." });
    }

    const train = scheduleDoc.train;
    const confirmedCount = await Reservation.countDocuments({
      schedule,
      status: "Confirmed",
    });
    const waitingCount = await Reservation.countDocuments({
      schedule,
      status: "Waiting",
    });

    if (seat === null) {
      if (confirmedCount >= train.totalSeats) {
        if (waitingCount >= train.totalSeats) {
          logger.warn(`Waiting list full for schedule ID ${schedule}.`);
          return res.status(400).json({ message: "Waiting list is full." });
        }

        const reservation = await createReservation(passenger, null, schedule, "Waiting");
        await checkAndConfirmWaitingReservations(schedule);
        logger.info(`Created waiting reservation for passenger ID ${passenger}.`);
        return res.status(201).json(reservation);
      } else {
        logger.warn('Seat not selected but seat is required.');
        return res.status(400).json({ message: "Please select a seat." });
      }
    }

    if (seat) {
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

    } else {
      logger.warn('Seat not selected but seat is required.');
      res.status(400).json({ message: "Please select a seat." });
    }

    if (confirmedCount >= train.totalSeats) {
      if (waitingCount >= train.totalSeats) {
        logger.warn(`Waiting list full for schedule ID ${schedule}.`);
        return res.status(400).json({ message: "Waiting list is full." });
      }

      const reservation = await createReservation(passenger, null, schedule, "Waiting");
      await checkAndConfirmWaitingReservations(schedule);
      logger.info(`Created waiting reservation for passenger ID ${passenger}.`);
      return res.status(201).json(reservation);
    }

    const reservation = await createReservation(passenger, seat, schedule, "Confirmed");

    if (seat) {
      const seatDoc = await Seat.findById(seat);
      await updateSeatAndTrain(seatDoc, train);
    }
    logger.info(`Created confirmed reservation for passenger ID ${passenger}.`);
    res.status(201).json(reservation);
  } catch (error) {
    logger.error(`Error creating reservation: ${error.message}`);
    res.status(500).json({ error: error.message });
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
      return res.status(400).json({ message: "Cannot cancel reservation within 3 hours of arrival.", });
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

      if (waitingReservations.length > 0 && train.availableSeats > 0) {
        const updatePromises = waitingReservations.map(async (waitingReservation, index) => {
          if (index < train.availableSeats) {
            waitingReservation.seat = freedSeat;
            waitingReservation.status = "Confirmed";
            await waitingReservation.save();

            const seatDoc = await Seat.findById(freedSeat);
            if (seatDoc) {
              seatDoc.isAvailable = false;
              await seatDoc.save();
            }
            train.availableSeats -= 1;
          }
        });

        await Promise.all(updatePromises);
        await train.save();
        logger.info(`Updated waiting reservations and seat availability after confirmed reservation cancellation.`);
      }

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
      return res.status(200).json(reservations);
  } catch (error) {
    logger.error(`Error retrieving reservations for passenger ID ${req.params.passengerId}: ${error.message}`);
    return res.status(500).json({ error: error.message });
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
    const schedules = await Schedule.find({ train: trainId });
    const scheduleIds = schedules.map((schedule) => schedule._id);
    const waitingReservations = await Reservation.find({
      schedule: { $in: scheduleIds },
      status: "Waiting",
    });
    const waitingCount = waitingReservations.length;
    logger.info(`Retrieved waiting list count for train ID ${trainId}.`);
    return res.status(200).json({
      trainId,
      trainName: train.trainName,
      waitingCount,
    });
  } catch (error) {
    logger.error(`Error retrieving waiting list count for train ID ${trainId}: ${error.message}`);
    res.status(500).json({ error: error.message });
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

    const scheduleIds = await Schedule.find({ train: trainId }).distinct('_id');


    const confirmedReservations = await Reservation.find({
      schedule: { $in: scheduleIds },
      status: "Confirmed",
    })
      .populate("seat", "seatNumber")
      .populate("passenger", "name");
      
      logger.info(`Retrieved confirmed reservations for train ID ${trainId}.`);
    return res.status(200).json({
      confirmedReservations: confirmedReservations.map(
        ({ _id, passenger, seat, status, reservationTime }) => ({
          _id,
          passengerName: passenger ? passenger.name : "Unknown",
          seatNumber: seat ? seat.seatNumber : "Not Assigned",
          status,
          
        })
      ),
    });
  } catch (error) {
    logger.error(`Error retrieving confirmed reservations for train ID ${trainId}: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

const getNotConfirmedReservations = async (req, res) => {
  const { scheduleId } = req.params;

  try {
    const notConfirmedReservations = await Reservation.find({
      schedule: scheduleId,
      status: "Not-Confirmed",
    }).populate("passenger", "name");

    if (notConfirmedReservations.length === 0) {
      logger.info(`No non-confirmed reservations found for schedule ID ${scheduleId}.`);
      return res.status(404).json({ message: "No non-confirmed reservations found." });
    }

    const passengerList = notConfirmedReservations.map((reservation) => {
      const passengerName = reservation.passenger ? reservation.passenger.name : "Unknown";
      return {
        passengerName,
      };
    });
    logger.info(`Retrieved ${notConfirmedReservations.length} non-confirmed reservations for schedule ID ${scheduleId}.`);
    return res.status(200).json({
      number_of_non_confirmed_passengers: notConfirmedReservations.length,
      passengers: passengerList,
    });
  } catch (error) {
    logger.error(`Error retrieving non-confirmed reservations for schedule ID ${scheduleId}: ${error.message}`);
    return res.status(500).json({
      error: "An error occurred while retrieving non-confirmed reservations.",
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
