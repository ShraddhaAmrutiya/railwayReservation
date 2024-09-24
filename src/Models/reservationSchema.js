const mongoose=require('mongoose')


    const reservationSchema = new mongoose.Schema({
        passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', required: true },
        seat: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', default: null },
        schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
        status: { type: String, enum: ['Confirmed', 'Waiting','Not-Confirmed','Canceled'], default: 'Waiting' },
        boardingStatus: { type: String, enum: ['Not-Boarded', 'Boarded'], default: 'Not-Boarded' } ,
        reservationTime:{type: Date, default: Date.now}
      });


module.exports=mongoose.model("Reservation",reservationSchema)