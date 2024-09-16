const{seatAdds, addMultipleSeats}=require('../Controllers/seatController')
const express=require('express')
const router=express.Router()



router.post('/',seatAdds)
router.post('/addMultiple',addMultipleSeats)


module.exports=router