const{addTrains,getTrains,updateTrain,deleteTrain}=require('../Controllers/trainController')
const express=require('express')
const router=express.Router()



router.post('/',addTrains)
router.get('/',getTrains)
router.put('/:id',updateTrain)
router.delete('/:id',deleteTrain)

module.exports=router