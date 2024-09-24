const mongoose=require('mongoose')

const scheduleSchema= new mongoose.Schema({
    train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
    arrivalTime: { type:Date, required: true },
  departureTime: { type: Date, required: true }
})
scheduleSchema.pre('validate', function(next) {
  if (this.arrivalTime < this.departureTime) {
      return next(new Error('Arrival time must be after departure time.'));
  }
  next();
});

module.exports=mongoose.model("Schedule",scheduleSchema)  