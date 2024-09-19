const{addTrains,getTrains,updateTrain,deleteTrain}=require('../Controllers/trainController')
const express=require('express')
const router=express.Router()
const {authMiddleware,isAdmin}=require('../middleware/jwt')



router.post('/',authMiddleware,isAdmin,addTrains)
router.get('/',getTrains)
router.put('/:id',authMiddleware,isAdmin,updateTrain)
router.delete('/:id',authMiddleware,isAdmin,deleteTrain)

module.exports=router