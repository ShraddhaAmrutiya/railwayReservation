const {  addPassengers, loginpassenger,listPassenger,deletepassenger,updatePassenger }=require('../Controllers/passengerController')
const authMiddleware=require('../middleware/jwt')
const express=require('express')
const router=express.Router()

router.post('/register',addPassengers)
router.post('/login',loginpassenger)
router.get('/',listPassenger)
router.delete('/:id',deletepassenger)
router.put('/:id',updatePassenger)


module.exports=router 