const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
PORT = process.env.PORT;
const scheduler = require('./scheduler'); 
const logger = require('./logger');
const app = express();

const trainRouter=require('./Routes/trainRout');
const passengerRouter=require('./Routes/passengerRout')
const scheduleRouter=require('./Routes/scheduleRout')
const seatRouter=require('./Routes/seatRout')
const reservationRouter=require('./Routes/reservationRout')

app.use(express.json());

mongoose
  .connect(process.env.URI)
  .then(() => logger.info("connected to mongodb..."))
  .catch((error) =>
    logger.error("Error occured in mongodb connection", error)
  );

  app.use('/train',trainRouter)
  app.use('/passenger',passengerRouter)
  app.use('/schedule',scheduleRouter)
  app.use('/seat',seatRouter)
  app.use('/reservation',reservationRouter)
  
  
  app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Something went wrong!' });
  });

app.listen(PORT, () =>  logger.info("server is running.."));
