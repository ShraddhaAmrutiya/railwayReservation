const{seatAdds, addMultipleSeats,deleteSeat,getAllSeats}=require('../Controllers/seatController')
const express=require('express')
const router=express.Router()
const {authMiddleware,isAdmin}=require('../middleware/jwt')



router.post('/',authMiddleware,isAdmin,seatAdds)
router.get('/',getAllSeats)
router.post('/addMultiple',authMiddleware,isAdmin,addMultipleSeats)
router.delete('/:seatId',authMiddleware,isAdmin,deleteSeat)


module.exports=router