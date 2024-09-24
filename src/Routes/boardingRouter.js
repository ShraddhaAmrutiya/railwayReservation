const express=require('express')
const router = express.Router();
const {boardingStatus,getBoardingStatus}= require('../Controllers/boardingController')



router.post('/:reservationId',boardingStatus);
router.get('/',getBoardingStatus)

module.exports=router