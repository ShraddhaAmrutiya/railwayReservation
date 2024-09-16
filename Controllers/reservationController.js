const Reservation = require("../Models/reservationSchema");
const Seat = require("../Models/seatSchema");
const Schedule = require("../Models/scheduleSchema");
const Train = require("../Models/trainSchema");
const mongoose = require("mongoose");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;
const {
  createReservation,
  checkAndConfirmWaitingReservations,
} = require("../function");

const makeReservation = async (req, res) => {
  const { passenger, seat, schedule } = req.body;
  if (!passenger || !seat || !schedule) {
    return res.status(400).json({ message: "Please fill required fields." });
  }

  try {
    const scheduleDoc = await Schedule.findById(schedule).populate("train");
    if (!scheduleDoc)
      return res.status(400).json({ message: "Schedule not found." });

    if (
      new Date() >
      new Date(scheduleDoc.departureTime) - RESERVATION_CLOSE_HOURS
    ) {
      return res.status(400).json({ message: "Reservation is closed." });
    }
    const existingReservation = await Reservation.findOne({
      seat,
      schedule,
      status: { $in: ["Confirmed", "Waiting"] },
    });

    if (existingReservation) {
      return res.status(400).json({ message: "Seat is already booked." });
    }

    const seatDoc = await Seat.findById(seat);
    // if (!seatDoc || !seatDoc.isAvailable) {
    // return res.status(400).json({ message: "Seat is not available." });
    // }

    const train = scheduleDoc.train;

    const confirmedCount = await Reservation.countDocuments({
      schedule,
      status: "Confirmed",
    });
    const waitingCount = await Reservation.countDocuments({
      schedule,
      status: "Waiting",
    });

    if (confirmedCount >= train.totalSeats) {
      if (waitingCount >= train.totalSeats) {
        return res.status(400).json({ message: "Waiting list is full." });
      }

      const reservation = await createReservation( passenger, seat, schedule, "Waiting");
      await checkAndConfirmWaitingReservations(schedule);
      return res.status(201).json(reservation);
    }

    const reservation = await createReservation( passenger, seat, schedule,"Confirmed" );
    await updateSeatAndTrain(seatDoc, train);
    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const cancelReservation = async (req, res) => {
  const { reservationId } = req.params;

  try {
    const reservation = await Reservation.findById(reservationId).populate(
      "schedule"
    );
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    const seatDoc = await Seat.findById(reservation.seat);
    if (!seatDoc) {
      return res.status(404).json({ message: "Seat not found." });
    }

    seatDoc.isAvailable = true;
    await seatDoc.save();

    // reservation.status = "Canceled";
    // await reservation.save();
    await Reservation.findByIdAndDelete(reservationId);


    const train = await Train.findById(reservation.schedule.train);
    if (train) {
      train.availableSeats += 1;
      await train.save();
    }

    await checkAndConfirmWaitingReservations(reservation.schedule._id);

    res.status(200).json({ message: "Reservation canceled successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
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

    const scheduleIds = (await Schedule.find({ train: trainId })).map(
      (s) => s._id
    );

    const confirmedReservations = await Reservation.find({
      schedule: { $in: scheduleIds },
      status: "Confirmed",
    })
      .populate("seat", "seatNumber")
      .populate("passenger", "name");

    res.json({
      confirmedReservations: confirmedReservations.map(
        ({ _id, passenger, seat, status, reservationTime }) => ({
          _id,
          passengerName: passenger.name,
          seatNumber: seat.seatNumber,
          status,
          reservationTime,
        })
      ),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  makeReservation,
  cancelReservation,
  getReservationStatusByPassengerId,
  getWaitingListCountByTrainId,
  getConfirmedByTrainId,
};
