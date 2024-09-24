const mongoose=require('mongoose')

const seatSchema= new mongoose.Schema({
    seatNumber: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    compartment: { type: String, required: true }
})

module.exports=mongoose.model("Seat",seatSchema)