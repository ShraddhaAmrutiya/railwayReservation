const express = require('express');
const router = express.Router();
const reservationController = require('../Controllers/reservationController');

router.post('/', reservationController.makeReservation);
router.delete('/:reservationId', reservationController.cancelReservation);

router.get('/:passengerId', reservationController.getReservationStatusByPassengerId);
router.get('/Waitinglist/:trainId', reservationController.getWaitingListCountByTrainId);
router.get('/Confirmedlist/:trainId', reservationController.getConfirmedByTrainId);

module.exports = router;
