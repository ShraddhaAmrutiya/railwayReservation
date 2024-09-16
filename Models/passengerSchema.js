const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const passengerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    match: [/^[a-zA-Z0-9._-]{3,50}$/, "Please enter valid user name."],
  },
  email: { type: String, required: true },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
  },
  role:{type:String,enum:["user","admin"],default:"user"}
});



passengerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

passengerSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};


module.exports = mongoose.model("Passenger", passengerSchema);