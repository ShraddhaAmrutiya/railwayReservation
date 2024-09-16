const mongoose=require('mongoose')

const scheduleSchema= new mongoose.Schema({
    train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
  departureTime: { type: Date, required: true },
  arrivalTime: { type:Date, required: true }
})

module.exports=mongoose.model("Schedule",scheduleSchema)  