const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
PORT = process.env.PORT;
const scheduler = require('./scheduler'); 

const app = express();

const trainRouter=require('./Routes/trainRout');
const passengerRouter=require('./Routes/passengerRout')
const scheduleRouter=require('./Routes/scheduleRout')
const seatRouter=require('./Routes/seatRout')
const reservationRouter=require('./Routes/reservationRout')

app.use(express.json());

mongoose
  .connect(process.env.URI)
  .then(() => console.log("connected to mongodb..."))
  .catch((error) =>
    console.error("Error occured in mongodb connection", error)
  );

  app.use('/train',trainRouter)
  app.use('/passenger',passengerRouter)
  app.use('/schedule',scheduleRouter)
  app.use('/seat',seatRouter)
  app.use('/reservation',reservationRouter)

app.listen(PORT, () => console.log("server is running.."));
