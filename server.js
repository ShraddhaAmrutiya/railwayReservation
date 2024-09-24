const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const PORT = process.env.PORT;
const scheduler = require('./src/scheduler'); 
const logger = require('./src/logger');
const User=require('./src/Models/passengerSchema')
const app = express();

const trainRouter = require('./src/Routes/trainRouter');
const passengerRouter = require('./src/Routes/passengerRouter');
const scheduleRouter = require('./src/Routes/scheduleRouter');
const seatRouter = require('./src/Routes/seatRouter');
const reservationRouter = require('./src/Routes/reservationRouter');
const boardingRout = require('./src/Routes/boardingRouter');

app.use(express.json());

mongoose
  .connect(process.env.URI)
  .then(() => logger.info("Connected to MongoDB..."))
  .catch((error) =>
    logger.error("Error occurred in MongoDB connection", error)
  );

const checkAdmin = async () => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      logger.error('No admin user found. Exiting...');
      process.exit(1);
    }

    app.use('/train', trainRouter);
    app.use('/passenger', passengerRouter);
    app.use('/schedule', scheduleRouter);
    app.use('/seat', seatRouter);
    app.use('/reservation', reservationRouter);
    app.use('/board', boardingRout);

    app.use((err, req, res, next) => {
      logger.error(`Error: ${err.message}`, { stack: err.stack });
      res.status(500).json({ message: 'Something went wrong!', error: err.message });
    });

    app.listen(PORT, () => logger.info("Server is running.."));
  } catch (error) {
    logger.error('Error checking admin:', error);
    process.exit(1);
  }
};

checkAdmin();
