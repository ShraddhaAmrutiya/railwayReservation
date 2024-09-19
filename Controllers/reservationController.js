const Reservation = require("../Models/reservationSchema");
const Passenger = require('../Models/passengerSchema');

const Seat = require("../Models/seatSchema");
const Schedule = require("../Models/scheduleSchema");
const Train = require("../Models/trainSchema");
const mongoose = require("mongoose");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;
const { createReservation, checkAndConfirmWaitingReservations,updateSeatAndTrain } = require("../function");

const makeReservation = async (req, res) => {
  const { passenger, seat, schedule } = req.body;

  if (!passenger || !schedule) {
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const passengerDoc = await Passenger.findById(passenger);
    if (!passengerDoc) {
      return res.status(400).json({ message: "Passenger not registered." });
    }


    const scheduleDoc = await Schedule.findById(schedule).populate("train");
    if (!scheduleDoc) {
      return res.status(400).json({ message: "Schedule not found." });
    }

    if (
      new Date() >
      new Date(scheduleDoc.departureTime) - RESERVATION_CLOSE_HOURS
    ) {
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
          return res.status(400).json({ message: "Waiting list is full." });
        }

        const reservation = await createReservation(
          passenger,
          null,
          schedule,
          "Waiting"
        );
        await checkAndConfirmWaitingReservations(schedule);
        return res.status(201).json(reservation);
      } else {
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
        return res.status(400).json({ message: "Seat is already booked." });
      }

      const seatDoc = await Seat.findById(seat);
      if (!seatDoc) {
        return res.status(400).json({ message: "Seat not found." });
      }

      // if (!seatDoc.isAvailable) {
      //   return res.status(400).json({ message: "Seat is not available." });
      // }
    } else {
      return res.status(400).json({ message: "Please select a seat." });
    }

    if (confirmedCount >= train.totalSeats) {
      if (waitingCount >= train.totalSeats) {
        return res.status(400).json({ message: "Waiting list is full." });
      }

      const reservation = await createReservation(
        passenger,
        null,
        schedule,
        "Waiting"
      );
      await checkAndConfirmWaitingReservations(schedule);
      return res.status(201).json(reservation);
    }

    const reservation = await createReservation(
      passenger,
      seat,
      schedule,
      "Confirmed"
    );
    if (seat) {
      const seatDoc = await Seat.findById(seat);
      await updateSeatAndTrain(seatDoc, train);
    }
    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const cancelReservation = async (req, res) => {
  const { reservationId } = req.params;

  try {
    const reservation = await Reservation.findById(reservationId).populate("schedule");
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (reservation.status === "Canceled") {
      return res.status(400).json({ message: "Reservation is already canceled." });
    }

    if (!reservation.schedule) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    const now = new Date();
    const arrivalTime = new Date(reservation.schedule.arrivalTime);
    const cancelCloseTime = new Date(arrivalTime - RESERVATION_CLOSE_HOURS);

    if (now > cancelCloseTime) {
      return res.status(400).json({
        message: "Cannot cancel reservation within 3 hours of arrival.",
      });
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
        }
      }

      if (train) {
        train.availableSeats += 1;
        await train.save();
      }

      return res.status(200).json({ message: "Waiting reservation deleted successfully." });
    } else if (reservation.status === "Confirmed") {
      if (!freedSeat) {
        // If seat is null, give an error and delete the reservation
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
        }
      }

      if (train) {
        train.availableSeats += 1;
        await train.save();
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
      }

      return res.status(200).json({ message: "Reservation canceled successfully." });
    }
  } catch (error) {
    console.log(error);
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

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getWaitingListCountByTrainId = async (req, res) => {
  const { trainId } = req.params;

  if (!trainId || !mongoose.Types.ObjectId.isValid(trainId)) {
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
    res.json({
      trainId,
      trainName: train.trainName,
      waitingCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getConfirmedByTrainId = async (req, res) => {
  const { trainId } = req.params;

  if (!trainId || !mongoose.Types.ObjectId.isValid(trainId)) {
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
      return res.status(404).json({ message: "No non-confirmed reservations found." });
    }

    const passengerList = notConfirmedReservations.map((reservation) => {
      const passengerName = reservation.passenger ? reservation.passenger.name : "Unknown";
      return {
        passengerName,
      };
    });

    return res.status(200).json({
      number_of_non_confirmed_passengers: notConfirmedReservations.length,
      passengers: passengerList,
    });
  } catch (error) {
    console.error(error);
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
