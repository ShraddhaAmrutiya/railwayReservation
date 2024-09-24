const{seatAdds, addMultipleSeats,deleteSeat,getAllSeats}=require('../Controllers/seatController')
const express=require('express')
const router=express.Router()
const {authMiddleware,isAdmin}=require('../middleware/jwt')



router.get('/list',getAllSeats)
router.delete('/:seatId',authMiddleware,isAdmin,deleteSeat)


module.exports=router