const Reservation = require("../Models/reservationSchema");
const logger = require("../logger");
const moment = require("moment-timezone");
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const boardingStatus = async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.reservationId)) {
            return res.status(400).json({ message: "Invalid reservation ID" });
        }

        const reservation = await Reservation.findById(req.params.reservationId).populate("schedule");

        if (!reservation) {
            logger.warn(`Reservation not found: ${req.params.reservationId}`);
            return res.status(404).json({ message: "Reservation not found" });
        }

        const now = moment().tz("Asia/Kolkata").toDate();
        const arrivalTime = moment(reservation.schedule.arrivalTime).tz("Asia/Kolkata").toDate();

        if (now >= arrivalTime) {
            logger.warn("Boarding time has passed for reservation:", req.params.reservationId);
            return res.status(400).json({ message: "Boarding time has passed" });
        }

        const boardingStartTime = new Date(arrivalTime.getTime() - 15 * 60000);

        if (now >= boardingStartTime && now < arrivalTime) {
            reservation.boardingStatus = 'Boarded';
            await reservation.save();
            logger.info(`Boarding status updated to Boarded for reservation: ${req.params.reservationId}`);
            return res.status(200).json({ message: "Boarding status updated to Boarded" });
        } else {
            logger.warn("Boarding can only be done between 15 minutes before arrival time:", req.params.reservationId);
            return res.status(400).json({
                message: "Boarding can only be done between 15 minutes before arrival time"
            });
        }
    } catch (error) {
        logger.error("Error updating boarding status:", error);
        return res.status(500).json({ message: error.message });
    }
}

const getBoardingStatus = async (req, res) => {
    try {
        const reservations = await Reservation.find({ boardingStatus: 'Boarded' });
        const boardedCount = reservations.length;

        logger.info("Retrieved boarding status", { boardedCount });

        return res.status(200).json({
            message: "Boarding status retrieved",
            boardedCount: boardedCount,
            boardedReservations: reservations,
        });
    } catch (error) {
        logger.error("Error retrieving boarding status:", error.message);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { boardingStatus, getBoardingStatus };
