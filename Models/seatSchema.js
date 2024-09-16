const mongoose=require('mongoose')

const seatSchema= new mongoose.Schema({
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
    seatNumber: { type: String, required: true },
    isAvailable: { type: Boolean, default: true }
})

module.exports=mongoose.model("Seat",seatSchema)