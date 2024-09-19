const express = require('express');
const router = express.Router();
const reservationController = require('../Controllers/reservationController');
const {authMiddleware,isAdmin}=require('../middleware/jwt')




router.post('/',authMiddleware, reservationController.makeReservation);
router.delete('/:reservationId',authMiddleware, reservationController.cancelReservation);

router.get('/:passengerId',authMiddleware, reservationController.getReservationStatusByPassengerId);
router.get('/Waitinglist/:trainId', reservationController.getWaitingListCountByTrainId);
router.get('/Confirmedlist/:trainId',authMiddleware,isAdmin, reservationController.getConfirmedByTrainId);
router.get('/not-confirmed/:scheduleId',reservationController.getNotConfirmedReservations)


module.exports = router;
