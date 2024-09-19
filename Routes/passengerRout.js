const {  addPassengers, loginpassenger,listPassenger,deletepassenger,updatePassenger }=require('../Controllers/passengerController')
const {authMiddleware,isAdmin}=require('../middleware/jwt')
const express=require('express')
const router=express.Router()

router.post('/register',addPassengers)
router.post('/login',loginpassenger)
router.get('/',authMiddleware,isAdmin,listPassenger)
router.delete('/:id',authMiddleware,deletepassenger)
router.put('/:id',authMiddleware,updatePassenger)


module.exports=router 