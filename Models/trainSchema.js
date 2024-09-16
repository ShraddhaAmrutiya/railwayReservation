const mongoose=require('mongoose')

const trainSchema= new mongoose.Schema({
trainName:{type:String,require:true},
trainNumber:{type:Number,required:true},
totalSeats:{type:Number,required:true},
availableSeats:{type:Number}
})

module.exports=mongoose.model("Train",trainSchema)